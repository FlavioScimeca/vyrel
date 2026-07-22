# `@vyrel/graphql-client`: flow completo dalla A alla Z

`@vyrel/graphql-client` è un livello sottile sopra Apollo Client che automatizza
il boilerplate delle mutation optimistic. Non sostituisce Apollo, gql.tada o
GraphQL Code Generator: li collega tra loro e sfrutta le informazioni che già
possiedono.

Il risultato pratico è un'API come questa:

```ts
useOptimisticCreate(CreateTaskDocument, {
  optimistic: ({ input }) => ({
    description: input.description ?? null,
    title: input.title,
  }),
});
```

Partendo dalla mutation, il package riesce a determinare automaticamente:

- i tipi delle variabili e del risultato;
- i fragment utilizzati dalla mutation;
- il `__typename` dell'entità;
- il campo della risposta, per esempio `createTask`;
- un ID temporaneo per la risposta optimistic;
- la collection da aggiornare, per esempio `tasks`;
- la query associata, per esempio `ListTasksDocument`;
- le variabili della query, per esempio `organizationId`;
- il comportamento necessario nella cache Apollo.

L'applicazione continua invece a decidere i valori di dominio: titolo,
descrizione, stato, prezzo e qualsiasi altro valore che una libreria generica
non può inventare correttamente.

## Architettura generale

```text
Drizzle/Zod
    │
    ▼
@vyrel/morph + Pothos
    │ genera il modello GraphQL server
    ▼
GraphQL Yoga / Elysia
    │
    ▼
schema.graphql
    │
    ├──► gql.tada
    │      └── tipizza documenti, variabili, fragment e risultati
    │
    └──► GraphQL Code Generator
           └── plugin @vyrel/graphql-client
                    │
                    ├── genera i metadata dello schema
                    ├── genera il registry TypeScript dei fragment
                    ├── trova le collection canoniche
                    ├── associa mutation e modelli
                    └── collega variabili mutation → query
                              │
                              ▼
                    graphqlClientRegistry
                              │
                              ▼
                    Apollo InMemoryCache
                              │
                              ▼
       useOptimisticCreate / Update / Delete
```

L'architettura ha due fasi distinte:

1. **Build/codegen:** vengono analizzati schema e documenti GraphQL.
2. **Runtime:** gli hook usano le informazioni generate per coordinare Apollo.

## 1. Il server costruisce lo schema GraphQL

Lato server Pothos costruisce lo schema usando modelli, input e resolver
dell'applicazione. `@vyrel/morph` riduce il boilerplate nella trasformazione da
Drizzle/Zod a Pothos.

Lo schema finale viene prodotto da:

- `packages/graphql/src/schema.ts`;
- `packages/graphql/scripts/gen-schema.ts`.

Il comando:

```bash
bun graphql:schema
```

carica lo schema Pothos, lo ordina e genera:

```text
apps/web/schema.graphql
```

Questo file è il contratto ufficiale fra server e client. Un esempio ridotto è:

```graphql
type Task {
  id: ID!
  title: String!
  description: String
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Query {
  tasks(organizationId: ID!): [Task!]!
}

type Mutation {
  createTask(input: CreateTask!): Task
  updateTask(input: UpdateTask!): Task
  deleteTask(input: DeleteTask!): String
}
```

`@vyrel/graphql-client` non inventa queste informazioni: le legge dallo schema
reale.

## 2. gql.tada tipizza i documenti GraphQL

Il client inizializza gql.tada in `apps/web/src/graphql/gql.ts`:

```ts
export const graphql = initGraphQLTada<{
  introspection: introspection;
  scalars: {
    DateTime: string;
    File: File;
    JSON: unknown;
    URL: string;
  };
}>();
```

Il comando:

```bash
bun run --cwd apps/web gql:generate
```

genera l'introspection TypeScript usata da gql.tada. Quando scriviamo una
mutation, TypeScript conosce quindi input, risultato, fragment e scalar:

```ts
export const CreateTaskDocument = graphql(`
  mutation CreateTask($input: CreateTask!) {
    createTask(input: $input) {
      ...TaskListItem
    }
  }
`, [TaskListItemFragment]);
```

Questa è la prima fonte di type safety del sistema.

## 3. Fragment, query e mutation rimangono GraphQL standard

Il package non introduce un DSL proprietario e non genera le operazioni al posto
dell'applicazione. Continuiamo a scrivere normali documenti gql.tada.

Fragment:

```ts
export const TaskListItemFragment = graphql(`
  fragment TaskListItem on Task {
    createdAt
    description
    id
    imageFull
    imageThumb
    title
    updatedAt
  }
`);
```

Query:

```ts
export const ListTasksDocument = graphql(`
  query ListTasks($organizationId: ID!) {
    tasks(organizationId: $organizationId) {
      ...TaskListItem
    }
  }
`, [TaskListItemFragment]);
```

Mutation:

```ts
export const CreateTaskDocument = graphql(`
  mutation CreateTask($input: CreateTask!) {
    createTask(input: $input) {
      ...TaskListItem
    }
  }
`, [TaskListItemFragment]);
```

I documenti devono continuare a descrivere esplicitamente ciò che il client
vuole leggere o modificare. Il package automatizza il collegamento fra questi
documenti e la cache, non il design dell'API GraphQL.

## 4. GraphQL Code Generator analizza i documenti

Non stiamo ricreando GraphQL Code Generator. Il progetto usa
`@graphql-codegen/cli` per:

- caricare lo schema;
- cercare i documenti TypeScript e TSX;
- estrarre le stringhe GraphQL;
- costruire gli AST;
- risolvere fragment e operazioni;
- invocare il plugin Vyrel.

La configurazione si trova in `apps/web/codegen.ts`:

```ts
const config: CodegenConfig = {
  documents: ["src/**/*.{ts,tsx}", "!src/graphql/generated/**"],
  generates: {
    "src/graphql/generated/client-schema.ts": {
      plugins: [
        {
          "@vyrel/graphql-client/codegen-plugin": {
            keyFields: { Organization: "slug" },
            scalars: { DateTime: "string" },
          },
        },
      ],
    },
  },
  pluckConfig: {
    globalGqlIdentifierName: ["graphql"],
  },
  schema: "schema.graphql",
};
```

GraphQL Code Generator passa al plugin:

- il `GraphQLSchema` già caricato;
- tutti i `DocumentNode` trovati;
- la posizione dei file originali;
- fragment, query e mutation.

Il plugin `@vyrel/graphql-client/codegen-plugin` implementa soltanto la logica
specifica di Vyrel.

## 5. Artefatto generato

Il plugin genera:

```text
apps/web/src/graphql/generated/client-schema.ts
```

L'artefatto contiene tre categorie di informazioni.

### 5.1 Registry TypeScript dei fragment

Il codegen produce una module augmentation simile a questa:

```ts
declare module "@vyrel/graphql-client" {
  interface FragmentTypeRegistry {
    readonly TaskListItem: ResultOf<typeof TaskListItemFragment>;
  }
}
```

In questo modo il package sa che una mutation contenente:

```graphql
...TaskListItem
```

ha a disposizione i campi selezionati dal fragment. Il callback `optimistic`
riceve quindi autocomplete e controllo TypeScript:

```ts
optimistic: ({ input }) => ({
  description: input.description ?? null,
  title: input.title,
})
```

Non serve più passare manualmente:

```ts
fragment: TaskListItemFragment
```

Se una mutation usa più fragment dello stesso modello, i loro result type
vengono combinati. Fragment relativi a entity type differenti rendono invece
l'operazione ambigua e producono un errore descrittivo.

### 5.2 Metadata completo dello schema

Il file contiene anche una rappresentazione TypeScript dello schema:

```ts
export const graphqlClientSchema = {
  types: {
    Task: {
      fields: {
        id: {},
        title: {},
        description: {},
      },
      keyFields: ["id"],
    },
  },
} as const;
```

Questo permette di ottenere il modello completo:

```ts
import type { GraphqlClientModel } from "./generated/client-schema";

type Task = GraphqlClientModel<"Task">;
```

`GraphqlClientModel` usa `ModelOf` insieme alle mappature generate e conosce tutti
i campi presenti nello schema, compresi quelli che non sono selezionati da un
particolare fragment.

Gli scalar built-in vengono tradotti automaticamente:

- `String` e `ID` diventano `string`;
- `Int` e `Float` diventano `number`;
- `Boolean` diventa `boolean`.

Enum e scalar custom vengono configurati nel plugin. L'artefatto esporta
`GraphqlClientScalars` e `GraphqlClientModel`, così i modelli completi usano le
stesse rappresentazioni TypeScript definite dall'applicazione.

### 5.3 Registry runtime CRUD

Per `Task` viene generato un registry equivalente a:

```ts
{
  collections: {
    Task: {
      query: ListTasksDocument,
      responseKey: "tasks",
      storeFieldName: "tasks",
    },
  },
  mutations: {
    CreateTask: {
      createTask: {
        collectionVariablePaths: {
          organizationId: ["input", "organizationId"],
        },
        entityType: "Task",
        keyField: "id",
        kind: "create",
      },
    },
    UpdateTask: {
      updateTask: {
        entityType: "Task",
        keyField: "id",
        kind: "update",
      },
    },
    DeleteTask: {
      deleteTask: {
        entityType: "Task",
        keyField: "id",
        kind: "delete",
      },
    },
  },
}
```

Queste informazioni permettono di eliminare dalle chiamate agli hook:

- `typename`;
- `fragment`;
- `collection`;
- query e variabili ripetute manualmente.

## 6. Inferenza della collection canonica

Il codegen cerca tutte le query con un singolo campo top-level che restituisce
un array di entity. Per esempio:

```graphql
query ListTasks($organizationId: ID!) {
  tasks(organizationId: $organizationId) {
    ...TaskListItem
  }
}
```

Dallo schema sa che `tasks` restituisce una lista di `Task` e registra:

```text
Task → ListTasksDocument → campo tasks
```

Le regole sono:

1. se esiste una sola query-lista per il tipo, diventa la collection canonica;
2. se ne esistono più di una, viene cercata una singola operazione convenzionale
   `List<Field>`;
3. se non esiste una scelta univoca, il codegen fallisce.

Fallire durante il codegen è preferibile rispetto a scegliere silenziosamente
una collection errata durante il runtime.

### Binding automatico delle variabili

La query può richiedere:

```graphql
$organizationId: ID!
```

mentre la mutation riceve:

```graphql
$input: CreateTask!
```

Se `CreateTask` contiene `organizationId`, il codegen trova il percorso:

```text
input.organizationId
```

e genera sulla specifica mutation:

```ts
collectionVariablePaths: {
  organizationId: ["input", "organizationId"],
}
```

Ogni create mutation possiede il proprio binding. Due mutation che creano lo
stesso modello possono quindi usare strutture di variabili differenti.

Quando l'applicazione esegue:

```ts
createTask({
  variables: {
    input: {
      organizationId,
      title,
    },
  },
});
```

il runtime ricava automaticamente le variabili di `ListTasksDocument`:

```ts
{
  organizationId: variables.input.organizationId,
}
```

Per questo non dobbiamo più scrivere:

```ts
collection: listCollection(ListTasksDocument, { organizationId })
```

I binding sono accettati solo quando nome e tipo sono compatibili e il percorso
è univoco. `ID` e `String` sono considerati compatibili come identità stringa.

## 7. Registrazione nella cache Apollo

Il registry generato viene associato a ogni istanza di `InMemoryCache`:

```ts
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        tasks: {
          keyArgs: ["organizationId"],
        },
      },
    },
    Task: {
      keyFields: ["id"],
    },
  },
});

return configureGraphqlClientCache(cache, graphqlClientRegistry);
```

`configureGraphqlClientCache` usa internamente una `WeakMap`:

- non esiste un registry globale mutabile;
- ogni cache riceve il proprio registry;
- il registry non impedisce il garbage collection della cache;
- la stessa configurazione funziona per cache client e cache RSC.

L'entry point `@vyrel/graphql-client/cache` è isomorfico e non importa React.
Le cache key configurate dal plugin vengono inoltre esportate come
`graphqlClientTypePolicies`; la configurazione Apollo le include con uno spread,
evitando di ripetere `id`, `slug` o `email` in due configurazioni diverse.

## 8. Runtime di `useOptimisticCreate`

Una create reale può essere scritta così:

```ts
const [createTask] = useOptimisticCreate(CreateTaskDocument, {
  optimistic: ({ input }) => ({
    description: input.description ?? null,
    imageFull: null,
    imageThumb: null,
    title: input.title,
  }),
});
```

Quando React inizializza l'hook, il package legge da `CreateTaskDocument`:

- operation name: `CreateTask`;
- root field e response key: `createTask`;
- fragment usati dalla risposta;
- typename: `Task`;
- campi selezionati dai fragment.

Quando viene eseguita la mutation, il callback `optimistic` fornisce i valori di
dominio. Il package completa l'entity:

```ts
{
  __typename: "Task",
  id: "optimistic-<uuid>",
  createdAt: "<now>",
  updatedAt: "<now>",
  title: input.title,
  description: input.description ?? null,
}
```

`createdAt` e `updatedAt` vengono aggiunti soltanto se sono selezionati dalla
mutation e non sono già stati forniti dal callback.

Il package costruisce quindi la response shape corretta:

```ts
{
  createTask: optimisticTask,
}
```

Apollo scrive l'entity nel proprio layer optimistic. Il package poi:

1. trova `CreateTask` nel registry;
2. determina che il modello è `Task`;
3. trova la collection canonica di `Task`;
4. risolve `organizationId` da `input.organizationId`;
5. aggiorna `ListTasksDocument`;
6. inserisce la task all'inizio della lista;
7. evita duplicati usando l'ID normalizzato Apollo.

Quando arriva la risposta reale, Apollo rimuove il layer optimistic. Il package
inserisce il risultato reale e deduplica nuovamente la lista.

```text
click "create"
    │
    ├── entity optimistic immediata
    ├── inserimento immediato nella lista
    ├── richiesta al server
    └── sostituzione con il risultato reale
```

### Collection filtrate

Le variabili della mutation coprono soltanto il binding canonico. Filtri della
vista come `search`, intervalli di date e cursori non possono essere dedotti dal
create input. In questo caso il proprietario della query crea un handle esatto:

```ts
const tasks = useCollectionQuery(ListTasksDocument, {
  variables: { organizationId, search, createdFrom, createdTo },
  matches: matchesTaskFilters,
});

const [createTask] = useOptimisticCreate(CreateTaskDocument, {
  insertInto: tasks.collection,
  optimistic: createOptimisticTask,
});
```

L'handle mantiene insieme documento e variabili realmente usati da Apollo. Se
`insertInto` è presente sostituisce il target canonico: non vengono aggiornati
entrambi. `matches` riceve item e variabili tipizzati; può restituire
`"unknown"` quando la semantica server non è riproducibile con certezza. In quel
caso l'inserimento viene saltato in attesa del refetch.

Il package non esegue refetch. La risposta della mutation sostituisce già il
dato optimistic; quando servono ordinamento, filtri o campi derivati aggiornati
dal server, il componente che possiede la query usa il `refetch` di Apollo:

```ts
const tasks = useCollectionQuery(ListTasksDocument, {
  variables: filters,
  matches: matchesTaskFilters,
});
const [createTask] = useOptimisticCreate(CreateTaskDocument, {
  ...options,
  insertInto: tasks.collection,
});

await createTask({ variables: { input } });
await tasks.refetch();
```

Apollo conserva già l'istanza esatta della query e le sue variabili. In questo
modo il package resta responsabile soltanto della meccanica optimistic, mentre
la pagina decide esplicitamente quando richiedere dati freschi al server.

## 9. Runtime di `useOptimisticUpdate`

Un update viene scritto così:

```ts
useOptimisticUpdate(UpdateTaskDocument, {
  current: existingTask,
  optimistic: ({ input }) => ({
    description:
      input.description === undefined
        ? existingTask.description
        : (input.description ?? null),
    title: input.title ?? existingTask.title,
  }),
});
```

Il package costruisce una response optimistic equivalente a:

```ts
{
  updateTask: {
    __typename: "Task",
    ...current,
    ...optimisticPatch,
  },
}
```

`current` contiene obbligatoriamente tutti i campi selezionati dal fragment
della mutation. Questo impedisce response optimistic incomplete e warning
Apollo come `Missing field while writing result`. Soltanto `optimisticPatch`
rimane parziale e on demand.

Apollo riconosce l'entity attraverso la sua cache key, per esempio
`Task:task-1`, e aggiorna il record normalizzato. Tutte le query che referenziano
quella task vedono lo stesso cambiamento.

Un normale update non modifica la membership della collection: non serve quindi
riscrivere `ListTasksDocument`.

Il patch rimane on demand. Una schermata può aggiornare soltanto il titolo:

```ts
optimistic: ({ input }) => ({
  title: input.title,
})
```

mentre un'altra può aggiornare titolo e descrizione:

```ts
optimistic: ({ input }) => ({
  description: input.description,
  title: input.title,
})
```

Non è necessario creare un wrapper o una resource diversa per ogni variante.

## 10. Runtime di `useOptimisticDelete`

Una delete viene scritta così:

```ts
useOptimisticDelete(DeleteTaskDocument, {
  id: ({ input }) => input.taskId,
});
```

Il callback `id` è necessario perché il client deve sapere quale entity
rimuovere prima che il server risponda. Il registry fornisce invece
automaticamente:

- operation: `DeleteTask`;
- response field: `deleteTask`;
- entity type: `Task`;
- collection field: `tasks`;
- query canonica: `ListTasksDocument`.

Il package costruisce la risposta optimistic:

```ts
{
  deleteTask: taskId,
}
```

Poi:

1. rimuove la task da tutte le varianti cached del campo `tasks`;
2. costruisce l'ID normalizzato Apollo usando typename e key field;
3. esegue `cache.evict`;
4. esegue `cache.gc`;
5. esegue l'eventuale callback `update` dell'applicazione.

Rimuovere da tutte le varianti significa considerare cache come:

```text
tasks({"organizationId":"org-1"})
tasks({"organizationId":"org-2"})
```

La task viene rimossa da ogni variante in cui è presente. Non serve passare
manualmente `organizationId` alla delete.

## 11. Opzioni Apollo ed escape hatch

Gli hook accettano le normali opzioni di `useMutation`:

```ts
useOptimisticCreate(CreateTaskDocument, {
  optimistic: ({ input }) => ({ title: input.title }),
  onCompleted: () => notifySuccess(),
  onError: (error) => notifyError(error.message),
  refetchQueries: [DashboardDocument],
  update: (cache, result, context) => {
    // Comportamento speciale dell'applicazione.
  },
});
```

Il package prende il controllo della costruzione di `optimisticResponse` e
compone il proprio aggiornamento con `update`. Il callback dell'applicazione
viene eseguito dopo il comportamento built-in, quindi i casi eccezionali non
richiedono un fork del package.

Internamente `useMutation` riceve il `TypedDocumentNode` prodotto da gql.tada.
Non vengono specificati manualmente i generic deprecati di Apollo.

## 12. Perché `optimistic` rimane esplicito

Il package può inferire informazioni strutturali:

- typename;
- ID temporaneo;
- fragment;
- collection;
- query;
- variabili;
- response wrapper;
- timestamp convenzionali.

Non può sapere automaticamente:

- quale titolo mostrare;
- se `undefined` significa “non modificare”;
- se `null` significa “rimuovere il valore”;
- quale status utilizzare;
- come calcolare un prezzo;
- quale immagine placeholder usare.

La responsabilità rimane quindi divisa così:

```text
Applicazione
    └── decide i valori di dominio

@vyrel/graphql-client
    └── gestisce la meccanica GraphQL e Apollo
```

## 13. Flow automatico di sviluppo e build

La web app configura:

```json
{
  "predev": "bun run graphql:schema && bun run gql:generate && bun run gql:client",
  "prebuild": "bun run graphql:schema && bun run gql:generate && bun run gql:client",
  "dev": "concurrently --kill-others --names next,gql-client \"next dev --port 3001\" \"bun run gql:client:watch\"",
  "gql:client:watch": "graphql-codegen --config codegen.ts --watch"
}
```

Quando viene eseguito `bun dev` o `bun build`, il flow è:

```text
graphql:schema
    │ genera apps/web/schema.graphql
    ▼
gql-tada generate-output
    │ genera i tipi di introspection
    ▼
build di @vyrel/graphql-client
    │ rende disponibile il plugin aggiornato
    ▼
graphql-codegen
    │ genera client-schema.ts
    ▼
Next.js build oppure Next.js dev + GraphQL Codegen watch
```

Sviluppo e produzione lavorano quindi con schema, tipi gql.tada e registry
Vyrel aggiornati. Durante `dev`, aggiungere o modificare documenti GraphQL
rigenera automaticamente `client-schema.ts` senza riavviare Next.js.

## 14. Aggiungere un modello futuro

Supponiamo di aggiungere `Project`.

1. Definire `Project` sul server.
2. Esporre query e mutation GraphQL.
3. Rigenerare `schema.graphql`.
4. Scrivere `ProjectListItemFragment`.
5. Scrivere una query canonica `ListProjects`.
6. Scrivere le mutation `CreateProject`, `UpdateProject` e `DeleteProject` che
   servono all'applicazione.
7. Eseguire `gql:client`, oppure avviare normalmente `bun dev`.
8. Usare gli hook con i documenti generati da gql.tada.

Esempio:

```ts
useOptimisticCreate(CreateProjectDocument, {
  optimistic: ({ input }) => ({
    name: input.name,
  }),
});
```

Non sono necessari:

- una resource configuration globale;
- un wrapper obbligatorio `useCreateProject`;
- `typename: "Project"`;
- `fragment: ProjectListItemFragment`;
- una collection manuale costruita separando documento e variabili;
- `ListProjectsDocument` al call site;
- variabili della collection ripetute;
- response wrapper manuali;
- aggiornamenti manuali della lista.

Il metadata contiene automaticamente tutti i modelli presenti e futuri nello
schema. Il registry CRUD può però conoscere soltanto le operazioni realmente
presenti nei documenti del client: il package non genera query o mutation che
l'applicazione non ha definito.

## 15. Convenzioni e regole di inferenza V1

L'automazione si basa su convenzioni intenzionali:

- fragment `TaskListItem` esportato come `TaskListItemFragment`;
- operation `ListTasks` esportata come `ListTasksDocument`;
- mutation root field con prefisso `create`, `update` o `delete`;
- collection rappresentata da un array top-level;
- cache key lette dalla configurazione codegen, con `id` come default;
- operation nominate;
- mutation con più root field registrate per response key e selezionabili con
  `field`;
- collection query con una singola lista top-level;
- fragment multipli ammessi se descrivono lo stesso entity type;
- `createdAt` e `updatedAt` popolati automaticamente durante una create se
  selezionati e non forniti.

Le escape hatch disponibili sono:

- `field` per mutation con più campi top-level;
- `keyField` per cache key diversa da `id`;
- `optimisticId` per una strategia custom di ID temporaneo;
- `update` per comportamento cache aggiuntivo.
- `insertInto` per puntare alla precisa collection filtrata restituita da
  `useCollectionQuery`.

Quando un'inferenza non è sicura, codegen o runtime producono un errore
descrittivo invece di scegliere implicitamente.

## 16. Cosa non fa il package

`@vyrel/graphql-client` non:

- sostituisce Apollo Client;
- sostituisce gql.tada;
- sostituisce GraphQL Code Generator;
- genera automaticamente query e mutation;
- impone un wrapper alle normali query di lettura;
- inventa valori di dominio;
- mostra toast;
- gestisce form;
- implementa offline queue;
- implementa undo;
- risolve conflitti concorrenti;
- gestisce ancora Relay connection o liste nested.

Per le letture normali continuiamo a usare Apollo direttamente:

```ts
useQuery(ListTasksDocument, {
  variables: { organizationId },
});
```

`useCollectionQuery` è intenzionale e opzionale: delega a
`useSuspenseQuery` e aggiunge soltanto l'handle necessario quando una lista deve
partecipare a una create optimistic filtrata.

## 17. Entry point del package

| Entry point | Contenuto | Utilizzo |
| --- | --- | --- |
| `@vyrel/graphql-client` | Hook React query/optimistic | Componenti client |
| `@vyrel/graphql-client/cache` | Registry e configurazione cache | Setup Apollo e RSC |
| `@vyrel/graphql-client/codegen` | Metadata e utility di tipo | Build e tooling |
| `@vyrel/graphql-client/codegen-plugin` | Plugin GraphQL Code Generator | Codegen Node |

Questa separazione impedisce che il codegen e le dipendenze Node entrino nel
bundle React.

## 18. Riassunto delle responsabilità

| Componente | Responsabilità |
| --- | --- |
| Pothos / Yoga | Definiscono ed espongono lo schema GraphQL server |
| `schema.graphql` | Contratto fra server e client |
| gql.tada | Tipizza documenti, variabili, fragment e risultati |
| GraphQL Code Generator | Scansiona schema e documenti |
| Plugin Vyrel | Genera metadata e registry specifici del package |
| Apollo Client | Esegue request e gestisce la cache normalizzata |
| `@vyrel/graphql-client` | Costruisce optimistic response e aggiorna la cache |
| Applicazione | Decide operazioni, valori di dominio, UI ed error handling |

In sintesi, il package trasforma:

```text
mutation tipizzata
+ fragment
+ schema
+ query della collection
+ variabili
+ cache Apollo
```

in una chiamata compatta:

```ts
useOptimisticCreate(Document, {
  optimistic: (variables) => domainValues,
});
```

Per una variante filtrata, la forma rimane esplicita e tipizzata:

```ts
const list = useCollectionQuery(ListDocument, { variables, matches });
useOptimisticCreate(Document, {
  insertInto: list.collection,
  optimistic: (variables) => domainValues,
});
```

L'applicazione mantiene il controllo di GraphQL, Apollo e delle decisioni di
dominio. Il package elimina la meccanica ripetitiva necessaria per collegarli in
modo coerente, tipizzato ed estendibile.
