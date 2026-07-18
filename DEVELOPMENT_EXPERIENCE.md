# Vyrel Developer Experience

## Proposte per ridurre il boilerplate mantenendo controllo, type-safety ed estendibilità

## Stato del documento

Questo documento descrive possibili package interni e strumenti di code generation
per migliorare l'esperienza di sviluppo di Vyrel.

Le API mostrate sono proposte da validare con prototipi. Non rappresentano ancora
API stabili o implementate.

## Obiettivo

Vyrel usa TypeScript lungo l'intero stack:

- Drizzle e SQLite per la persistenza;
- Zod per schema e validazione;
- Pothos per la costruzione dello schema GraphQL;
- GraphQL Yoga come runtime GraphQL;
- Elysia come server HTTP;
- Effect per business logic ed errori tipizzati;
- Apollo Client per trasporto e cache GraphQL;
- `gql.tada` per documenti e fragment GraphQL type-safe;
- Next.js per rendering server e client.

La presenza di TypeScript in ogni layer permette di ridurre una parte importante
del codice meccanico. L'obiettivo, però, non deve essere nascondere i framework o
creare un nuovo framework interno. L'obiettivo è automatizzare le parti
ripetitive lasciando accessibili gli strumenti sottostanti quando serve un
comportamento personalizzato.

`@vyrel/morph` è il modello di riferimento:

- automatizza il mapping prevedibile;
- mantiene Pothos e Zod accessibili;
- fallisce in modo esplicito quando non può dedurre un mapping;
- permette override per field, scalar, enum e resolver;
- non prova a sostituire Pothos, Zod o Drizzle;
- può essere adottato progressivamente.

I package proposti in questo documento devono rispettare gli stessi principi.

## Principi di progettazione

### Automatizzare il meccanico, non le decisioni di dominio

Un tool può dedurre che un oggetto GraphQL con `__typename: "Task"` e `id` può
essere normalizzato. Non può dedurre in modo affidabile:

- in quali liste debba apparire;
- se debba essere inserito all'inizio o alla fine;
- quali filtri soddisfi;
- quali autorizzazioni siano necessarie;
- come costruire valori ottimistici realistici;
- se un errore di dominio debba diventare `403`, `404` o `409`.

Queste decisioni devono rimanere dichiarative ed esplicite.

### Type-safety end-to-end

Le API devono preferire callback tipizzate rispetto a stringhe libere.

Da evitare:

```ts
resultField: "createTask";
listField: "tasks";
```

Da preferire:

```ts
result: (data) => data.createTask;
selectList: (data) => data.tasks;
```

Nel secondo caso TypeScript conosce il documento GraphQL e può verificare che i
campi esistano e abbiano il tipo previsto.

### Escape hatch sempre disponibile

Ogni helper deve permettere di tornare alle API native:

- `useMutation` e `ApolloCache` per il client;
- Pothos per object, field e resolver;
- Effect per pipeline e gestione degli errori;
- Elysia per request, response e lifecycle;
- Drizzle per query personalizzate.

### Adozione incrementale

Un dominio deve poter adottare un package senza obbligare gli altri domini a
migrare nello stesso momento.

### Runtime piccolo, generatori separati

Il codice necessario nel browser deve rimanere piccolo e tree-shakeable. I
generatori che leggono schema, AST e filesystem devono essere package build-time
separati, così da non trascinare dipendenze di codegen nel bundle client.

### Codice generato leggibile

Il codice generato deve essere:

- deterministico;
- formattabile;
- verificabile con TypeScript;
- facilmente ispezionabile;
- rigenerabile senza modifiche manuali;
- marcato come generated.

## Architettura attuale rilevante

### Costruzione dello schema server

```text
Drizzle table
  -> createSelectSchema / createInsertSchema
  -> Zod domain schema
  -> @vyrel/morph
  -> Pothos object e input
  -> builder.toSchema()
  -> GraphQL Yoga
```

`@vyrel/morph` riceve schema Zod e produce field map Pothos. Non legge
direttamente le tabelle Drizzle. Nel progetto gli schema Zod derivano spesso da
`drizzle-orm/zod`, ma Morph rimane indipendente da Drizzle a runtime.

### Contratto client

```text
Pothos schema
  -> schema.graphql
  -> gql.tada introspection
  -> TypedDocumentNode
  -> Apollo Client
```

Le query delle feature sono già concise e type-safe grazie a `gql.tada`. Il
problema principale non è la dichiarazione delle query: è descrivere gli effetti
delle mutation sulla cache e costruire optimistic response complete.

### Runtime di una richiesta GraphQL

```text
React/RSC
  -> Apollo link chain
  -> Elysia /api/graphql
  -> GraphQL Yoga
  -> Pothos resolver
  -> Effect service
  -> Drizzle / Better Auth / object storage
  -> Apollo normalized cache
```

### Boilerplate client attuale

Una mutation ottimistica Task può richiedere:

1. definizione del documento GraphQL;
2. `useMutation`;
3. `optimisticResponse`;
4. factory dell'oggetto ottimistico;
5. selezione del risultato della mutation;
6. callback `update`;
7. lookup della query cached e delle sue variables;
8. modifica della lista;
9. lettura dell'ID dal fragment;
10. `cache.evict` e `cache.gc` per una delete;
11. toast di successo ed errore.

Una parte di questi passaggi è strutturale e può essere centralizzata.

## Sintesi delle proposte

| Priorità | Package | Problema principale | Beneficio atteso | Complessità |
| --- | --- | --- | --- | --- |
| 1 | `@vyrel/graphql-client` | Cache update e optimistic UI verbosi | Molto alto | Media |
| 2 | `@vyrel/effect-transport` | Adapter Effect duplicati | Molto alto | Bassa/Media |
| 3 | `@vyrel/authz` | Policy di accesso ripetute | Alto | Media |
| 4 | `@vyrel/graphql-codegen` | Configurazione client ripetitiva | Molto alto | Alta |
| 5 | `@vyrel/graphql-contract` | Artifact GraphQL legati a `apps/web` | Alto | Media |
| 6 | `@vyrel/testkit` | Fixture e mock non uniformi | Alto | Bassa |
| 7 | `@vyrel/media` | Pipeline media duplicate | Medio/Alto | Media |
| 8 | `@vyrel/scaffold` | Creazione manuale delle feature | Alto | Media |
| 9 | `@vyrel/domain-kit` | Definizione distribuita dei domini | Potenzialmente molto alto | Molto alta |

## 1. `@vyrel/graphql-client`

### Perché serve

Apollo normalizza automaticamente le entità restituite dalle mutation quando la
risposta include `__typename` e i `keyFields`. Non aggiorna però automaticamente
l'appartenenza di una nuova entità a una lista root e non rimuove da tutte le
liste un'entità cancellata.

Questo significa che:

- un normale update di campi può non richiedere alcun updater manuale;
- una create deve aggiungere un riferimento a una o più liste;
- una delete deve rimuovere i riferimenti ed eventualmente fare `evict`;
- uno spostamento tra scope deve aggiornare più liste;
- liste filtrate e ordinate richiedono regole esplicite.

Nel codice Task attuale, `updateTaskInList()` è probabilmente ridondante se la
mutation restituisce lo stesso `Task.id` e tutti i campi modificati. Apollo può
aggiornare il record normalizzato. Create e delete continuano invece a richiedere
una gestione esplicita della lista.

### Problemi risolti

- ripetizione di `cache.updateQuery`;
- gestione manuale delle variables della lista;
- lookup e confronto degli ID;
- inserimento prepend/append;
- rimozione ed eviction;
- duplicazione tra optimistic result e result reale;
- optimistic factory non uniformi;
- toast ed error handling ripetuti;
- updater scritti in modo diverso tra feature;
- errori causati da query, variables o fragment non allineati.

### Boundary del package

Il package dovrebbe contenere primitive Apollo riutilizzabili. Non dovrebbe
contenere documenti GraphQL specifici di Task, User o Organization.

Struttura possibile:

```text
packages/graphql-client/
├── src/
│   ├── cache/
│   │   ├── entity.ts
│   │   ├── list.ts
│   │   └── policies.ts
│   ├── mutation/
│   │   ├── optimistic.ts
│   │   └── resource-mutation.ts
│   ├── resource.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

### API resource-oriented

Una resource descrive l'identità di un'entità e le liste in cui può apparire.

```ts
export const taskResource = defineGraphqlResource({
  fragment: TaskListItemFragment,
  key: (task) => readFragment(TaskListItemFragment, task).id,
  typename: "Task",
  lists: {
    byOrganization: defineGraphqlList({
      document: ListTasksDocument,
      select: (data) => data.tasks,
      variables: (organizationId: string) => ({ organizationId }),
    }),
  },
});
```

Questa definizione viene scritta una volta per resource. Le mutation dichiarano
soltanto l'effetto applicativo sulla resource.

### Create ottimistica

```ts
const [createTask, createState] = useResourceMutation(CreateTaskDocument, {
  optimistic: ({ input }) =>
    taskResource.optimistic({
      createdAt: new Date().toISOString(),
      description: input.description ?? null,
      id: `optimistic-${crypto.randomUUID()}`,
      imageFull: null,
      imageThumb: null,
      title: input.title,
      updatedAt: new Date().toISOString(),
    }),
  result: (data) => data.createTask,
  update: taskResource.prependTo(
    taskResource.lists.byOrganization(organizationId)
  ),
});
```

Il package risolve:

- come trovare la query in cache;
- quali variables usare;
- come aggiungere l'entità;
- come evitare duplicati per ID;
- come gestire optimistic layer e risposta reale.

La callback `optimistic` rimane esplicita perché valori come date, placeholder,
stato iniziale e proprietà derivate sono decisioni di dominio.

### Update normalizzato

Per un update standard può bastare:

```ts
const [updateTask, updateState] = useResourceMutation(UpdateTaskDocument, {
  optimistic: ({ input }) =>
    taskResource.optimistic({
      ...existingTask,
      description: input.description ?? existingTask.description,
      title: input.title ?? existingTask.title,
      updatedAt: new Date().toISOString(),
    }),
  result: (data) => data.updateTask,
});
```

Non è necessario riscrivere la lista se Apollo identifica la risposta come lo
stesso record `Task:<id>`.

Il package può verificare in sviluppo che il risultato includa:

- `__typename`;
- il key field richiesto;
- i campi necessari all'optimistic response.

### Delete ottimistica

```ts
const [deleteTask, deleteState] = useResourceMutation(DeleteTaskDocument, {
  deletedId: (data) => data.deleteTask,
  optimisticDeletedId: ({ input }) => input.taskId,
  update: taskResource.removeFrom(
    taskResource.lists.byOrganization(organizationId),
    { evict: true }
  ),
});
```

Il package può eseguire:

1. rimozione del reference dalla lista;
2. `cache.identify`;
3. `cache.evict`;
4. garbage collection opzionale.

### Liste multiple e spostamenti

```ts
const moveTaskUpdate = taskResource.batch([
  taskResource.removeFrom(taskResource.lists.byOrganization(sourceOrgId)),
  taskResource.prependTo(taskResource.lists.byOrganization(targetOrgId)),
]);
```

Questo rende esplicito il comportamento senza duplicare le API Apollo.

### Filtri e ordinamento

Il package non deve assumere che ogni nuova entità appartenga a ogni lista.

```ts
const activeTaskList = defineGraphqlList({
  document: ListTasksDocument,
  matches: (task, variables) =>
    task.organizationId === variables.organizationId &&
    task.status === variables.status,
  orderBy: (left, right) => right.createdAt.localeCompare(left.createdAt),
  select: (data) => data.tasks,
  variables: (input: TaskListVariables) => input,
});
```

`matches` e `orderBy` sono decisioni applicative e devono essere configurabili.

### Toast ed error handling

Una policy opzionale può standardizzare feedback e redirect senza renderli
obbligatori:

```ts
const [createTask] = useResourceMutation(CreateTaskDocument, {
  feedback: {
    error: (error) => error.message || "Unable to create task.",
    success: "Task created",
  },
  // ...
});
```

L'API dovrebbe anche permettere di omettere completamente `feedback` e usare i
callback Apollo nativi.

### Escape hatch

```ts
useResourceMutation(CreateTaskDocument, {
  apollo: {
    errorPolicy: "all",
    onQueryUpdated: (query) => query.refetch(),
  },
  update: ({ cache, data, variables }) => {
    // Accesso diretto alle API Apollo per casi complessi.
  },
});
```

### Cosa non deve fare

- generare automaticamente decisioni di autorizzazione;
- conoscere Drizzle o il database;
- nascondere `ApolloCache` nei casi avanzati;
- inserire ogni nuova entità in tutte le liste dello stesso typename;
- costruire optimistic response inventando dati di dominio;
- sostituire `gql.tada`;
- imporre una sola strategia tra cache update e refetch.

### Test necessari

- create prepend e append;
- deduplicazione tra optimistic ID e ID reale;
- rollback automatico su errore;
- update di record normalizzato;
- delete, eviction e garbage collection;
- liste con variables diverse;
- liste assenti dalla cache;
- entity presenti in più liste;
- fragment masking;
- file upload e optimistic response;
- compatibilità RSC/browser con la cache Apollo configurata da Vyrel.

## 2. `@vyrel/effect-transport`

### Perché serve

I domini Task, User e Organization contengono adapter molto simili per eseguire
un Effect da un resolver GraphQL:

```text
Effect del dominio
  -> catchTags
  -> GraphQLError
  -> ManagedRuntime.runPromiseExit
  -> Exit.match
  -> Cause.squash
```

Esiste un pattern equivalente per REST:

```text
Effect del dominio
  -> errore HTTP tipizzato
  -> Promise Exit
  -> status e response body Elysia
```

### Problemi risolti

- `runPromiseExit` duplicato;
- `Exit.match` e `Cause.squash` duplicati;
- mapping `catchTags` ripetuto;
- costruzione manuale di `GraphQLError`;
- divergenza dei code GraphQL tra domini;
- adapter REST scritti in modo diverso;
- test ripetuti per gli stessi boundary.

### API GraphQL proposta

```ts
export const runTaskGraphql = createGraphqlEffectRunner({
  errors: {
    TaskForbiddenError: graphqlError({
      code: "FORBIDDEN",
      status: 403,
    }),
    TaskMediaError: graphqlError({
      code: "BAD_USER_INPUT",
      status: 400,
    }),
    TaskNotFoundError: graphqlError({
      code: "NOT_FOUND",
      status: 404,
    }),
    TaskRepositoryError: graphqlError({
      code: "TASK_REPOSITORY",
      status: 503,
    }),
    TaskValidationError: graphqlValidationError({
      code: "BAD_USER_INPUT",
      status: 400,
      issues: (error) => error.issues,
    }),
  },
  runtime: TaskRuntime,
});
```

Uso nel resolver:

```ts
resolve: (_root, args, context) =>
  runTaskGraphql(
    updateTask(
      taskUpdateSchema.parse(args.input),
      context.headers,
      resolveActorUserId(context)
    )
  );
```

### API REST proposta

```ts
export const runUserRest = createElysiaEffectRunner({
  errors: {
    UserConflictError: httpError({ status: 409 }),
    UserRepositoryError: httpError({ status: 503 }),
    UserValidationError: httpValidationError({ status: 400 }),
  },
  runtime: UserRuntime,
});
```

Uso:

```ts
.post("/api/users", ({ body, request, set }) =>
  runUserRest(createUser(body, request.headers), set)
);
```

### Boundary del package

Il package deve conoscere Effect e i trasporti GraphQL/Elysia. Non deve conoscere
gli errori Task, User o Organization. Le mappe degli errori restano nei domini.

### Estensioni possibili

- logging standardizzato;
- correlation/request ID;
- metriche per tag di errore;
- retry metadata;
- mapping centralizzato degli errori non attesi;
- supporto per tracing e profiling.

## 3. `@vyrel/authz`

### Perché serve

I service ripetono variazioni dello stesso flusso:

```text
cookie Better Auth o Bearer JWT
  -> actor ID
  -> autenticazione richiesta
  -> membership organizzazione
  -> recupero resource
  -> accessibilità della resource
```

### Problemi risolti

- risoluzione actor ripetuta;
- differenze tra session cookie e JWT;
- controlli membership duplicati;
- semanticamente diversi `null`, forbidden e not found;
- policy sparse tra resolver, service e utility;
- difficoltà nel testare le policy indipendentemente dalla business logic.

### API Effect service-oriented

```ts
const program = Effect.gen(function* () {
  const actor = yield* CurrentActor;
  yield* requireOrganizationMember(organizationId, actor.id);
  const task = yield* requireAccessibleTask(taskId, actor.id);

  return yield* updateTaskRecord(task, input);
});
```

### API dichiarativa opzionale

```ts
export const updateTaskPolicy = definePolicy({
  actor: authenticatedActor(),
  resource: taskById((input: TaskTypeUpdate) => input.taskId),
  rules: [organizationMember((task) => task.organizationId)],
});
```

Uso:

```ts
const authorized = yield* updateTaskPolicy.authorize({
  headers,
  input,
  jwtUserId,
});
```

### Decisioni da rendere esplicite

- sessione o JWT hanno la stessa autorità?
- la sessione deve avere precedenza sul JWT?
- una resource non accessibile deve risultare `404` o `403`?
- quali policy richiedono membership e quali ownership?
- l'organizzazione attiva influenza l'accesso o soltanto l'interfaccia?

### Boundary del package

Il package gestisce identità e policy. Non deve implementare mutation, resolver,
UI o business logic del dominio.

## 4. `@vyrel/graphql-codegen`

### Perché serve

`@vyrel/graphql-client` riduce il codice runtime, ma ogni resource deve ancora
dichiarare:

- typename;
- key field;
- documenti di query e mutation;
- selettore della lista;
- variables;
- effetti create/update/delete;
- optimistic factory;
- eventuali cache policies.

Una parte di queste informazioni è deducibile dallo schema e dagli AST GraphQL.
La parte non deducibile può essere espressa in una piccola configurazione
type-safe e colocata alla feature.

### Input proposto

```ts
export default defineResourceCodegen({
  entity: "Task",
  key: "id",
  lists: {
    byOrganization: {
      document: ListTasksDocument,
      select: (data) => data.tasks,
      variables: (organizationId: string) => ({ organizationId }),
    },
  },
  mutations: {
    create: {
      document: CreateTaskDocument,
      insertInto: "byOrganization",
      position: "prepend",
      result: (data) => data.createTask,
    },
    delete: {
      deletedId: (data) => data.deleteTask,
      document: DeleteTaskDocument,
      removeFrom: "byOrganization",
    },
    update: {
      document: UpdateTaskDocument,
      result: (data) => data.updateTask,
    },
  },
});
```

### Output possibile

```text
apps/web/src/features/dashboard/task/graphql/generated/
├── resource.ts
├── type-policies.ts
├── optimistic.ts
├── mutations.ts
├── mocks.ts
└── manifest.ts
```

Esempio di API generata:

```ts
export const taskResource = createGeneratedTaskResource();
export const useCreateTaskMutation = createGeneratedCreateTaskMutation();
export const useDeleteTaskMutation = createGeneratedDeleteTaskMutation();
export const useUpdateTaskMutation = createGeneratedUpdateTaskMutation();
```

### Cosa può essere dedotto

- operation name;
- variables e relativi tipi;
- result type;
- typename restituiti;
- presenza dei key field;
- fragment richiesti;
- scalar mapping;
- input required/optional;
- possibili interface e union;
- APQ/persisted document hash.

### Cosa non può essere dedotto in modo sicuro

- lista target di una create;
- prepend o append;
- regole di filtro;
- ordinamento;
- optimistic default di dominio;
- membership tra più liste;
- effetti indiretti su aggregate o contatori;
- query da invalidare per side effect non presenti nella risposta.

Queste informazioni devono essere configurate.

### Package runtime e package codegen separati

```text
@vyrel/graphql-codegen  --devDependency--> schema, AST, filesystem
          |
          v genera
@vyrel/graphql-contract -----------------> artifact statici
          |
          v usati da
@vyrel/graphql-client  ------------------> runtime Apollo piccolo
```

### Integrazione Turborepo

Il package dovrebbe avere task locali:

```json
{
  "scripts": {
    "generate": "bun run src/cli.ts",
    "check-types": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

Il task `generate` dovrebbe dichiarare come input:

- `schema.graphql`;
- documenti GraphQL;
- configurazioni resource;
- versione/configurazione del generatore.

E come output soltanto le directory generated. La root dovrebbe delegare a
`turbo run generate`, lasciando a Turborepo la gestione del grafo.

### GraphQL Code Generator da valutare

È opportuno valutare:

- `@graphql-codegen/cli` come infrastruttura di plugin;
- `@graphql-codegen/typescript-apollo-client-helpers` per generare type policies
  Apollo tipizzate;
- `@graphql-codegen/fragment-matcher` quando verranno introdotte interface o
  union;
- un plugin custom Vyrel per resource e cache recipe.

`@graphql-codegen/typescript-apollo-client-helpers` può generare
`StrictTypedTypePolicies`, verificando a compile-time typename, field e
`keyFields`.

Non è consigliato introdurre contemporaneamente il GraphQL Code Generator
`client-preset` per sostituire `gql.tada`: entrambi risolvono TypedDocumentNode,
tipi delle operation e fragment masking. Mantenere entrambi per lo stesso scopo
creerebbe due fonti di verità.

Riferimenti:

- [GraphQL Code Generator client preset](https://the-guild.dev/graphql/codegen/plugins/presets/preset-client)
- [Apollo Client Helpers](https://the-guild.dev/graphql/codegen/plugins/typescript/typescript-apollo-client-helpers)
- [gql.tada API](https://gql-tada.0no.co/reference/gql-tada-api)

## 5. `@vyrel/graphql-contract`

### Perché serve

Lo schema e l'introspection generata sono attualmente colocati in `apps/web`, ma
il contratto GraphQL può essere consumato anche da:

- `apps/extension`;
- test di integrazione;
- tooling;
- futuri client;
- documentazione;
- persisted operation tooling.

Il contratto appartiene all'intero sistema, non alla sola applicazione Next.

### Problemi risolti

- duplicazione futura dello schema tra client;
- path relativi verso `apps/web`;
- artifact generati mescolati al codice applicativo;
- impossibilità di condividere manifest APQ;
- cache policies e possible types non centralizzati;
- dipendenza implicita di tooling da una specifica app.

### Contenuto possibile

```text
packages/graphql-contract/
├── generated/
│   ├── schema.graphql
│   ├── graphql-env.d.ts
│   ├── persisted-documents.json
│   ├── possible-types.json
│   ├── apollo-type-policies.ts
│   └── operation-names.ts
├── package.json
└── tsconfig.json
```

### Regole del boundary

Il package deve essere privo di:

- connessione al database;
- variabili server;
- Better Auth;
- runtime Yoga;
- resolver;
- side effect di registrazione Pothos.

Deve contenere soltanto artifact statici o tipi generati.

### Export proposti

```json
{
  "exports": {
    "./apollo": "./generated/apollo-type-policies.ts",
    "./introspection": "./generated/graphql-env.d.ts",
    "./manifest": "./generated/persisted-documents.json",
    "./schema": "./generated/schema.graphql"
  }
}
```

La gestione di file `.graphql` e `.json` deve essere verificata per i consumer
Next, Bun e tooling prima di stabilizzare questi export.

## 6. `@vyrel/testkit`

### Perché serve

La type-safety è utile anche nei test. Fixture scritte come object literal tendono
a diventare obsolete quando cambiano database, schema Zod o fragment GraphQL.

### Problemi risolti

- fixture incomplete o non più valide;
- mock GraphQL non allineati alle operation;
- setup ripetuto di sessioni e organizzazioni;
- runtime Effect di test duplicati;
- mock storage duplicato;
- test cache Apollo difficili da scrivere;
- costruzione manuale di `Headers`, request e context.

### Factory di dominio

```ts
const actor = actorFixture.member();
const organization = organizationFixture.withMember(actor);
const task = taskFixture({
  createdById: actor.id,
  organizationId: organization.id,
});
```

Le factory devono essere tipizzate tramite gli schema di dominio:

```ts
export const taskFixture = defineZodFixture(taskQuerySchema, {
  createdAt: () => new Date(),
  createdById: () => crypto.randomUUID(),
  description: () => null,
  id: () => crypto.randomUUID(),
  organizationId: () => crypto.randomUUID(),
  title: () => "Test task",
  updatedAt: () => new Date(),
});
```

### Context e auth

```ts
const context = graphqlContextFixture({
  actor,
  authentication: "session",
});

const jwtContext = graphqlContextFixture({
  actor,
  authentication: "bearer",
});
```

### Mock GraphQL type-safe

```ts
const handler = graphqlQueryHandler(ListTasksDocument, ({ variables }) => ({
  tasks: [
    taskFragmentFixture({
      organizationId: variables.organizationId,
    }),
  ],
}));
```

Il risultato del mock deve soddisfare `ResultOf<typeof ListTasksDocument>`.

### Test della cache

```ts
const cache = createTestApolloCache();

seedQuery(cache, ListTasksDocument, {
  data: { tasks: [existingTask] },
  variables: { organizationId },
});

taskResource.prependTo(
  taskResource.lists.byOrganization(organizationId)
).apply(cache, createdTask);

expect(readQuery(cache, ListTasksDocument, { organizationId })).toEqual({
  tasks: [createdTask, existingTask],
});
```

## 7. `@vyrel/media`

### Perché serve

User, Organization e Task implementano pipeline simili per avatar, logo e image:

```text
validazione File
  -> ottimizzazione full
  -> ottimizzazione thumbnail
  -> placeholder
  -> upload multipli
  -> object key persistite
  -> signed URL in lettura
  -> cleanup su update/delete/error
```

### Problemi risolti

- validazione MIME e dimensione duplicata;
- configurazioni optimizer sparse;
- upload e rollback non uniformi;
- naming degli object key duplicato;
- cleanup best-effort riscritto;
- mapping tra record DB e signed URL ripetuto;
- error mapping media duplicato.

### API proposta

```ts
export const taskImagePipeline = defineImagePipeline({
  namespace: "tasks",
  presets: {
    full: {
      format: "webp",
      maxHeight: 1600,
      maxWidth: 1600,
      quality: 85,
    },
    thumb: {
      format: "webp",
      maxHeight: 320,
      maxWidth: 320,
      quality: 75,
    },
  },
});
```

Uso:

```ts
const imageFields = yield* taskImagePipeline.upload(taskId, image);
yield* taskImagePipeline.remove(imageFields);
const publicImage = yield* taskImagePipeline.resolveUrls(imageFields);
```

### Transazioni e compensazione

Database e object storage non condividono una transazione. Il package deve
modellare in modo esplicito le compensazioni:

```ts
const uploaded = yield* taskImagePipeline.upload(taskId, image);

const record = yield* insertTask({
  ...input,
  ...uploaded.fields,
}).pipe(
  Effect.tapError(() => taskImagePipeline.remove(uploaded))
);
```

Il rollback non deve essere nascosto se può fallire. Errori di cleanup possono
essere loggati o inviati a una coda di retry.

## 8. `@vyrel/scaffold`

### Perché serve

Non tutto il boilerplate deve diventare un'astrazione runtime. Quando una
struttura è ripetitiva ma contiene molte decisioni specifiche, un generatore di
file può produrre un punto di partenza esplicito e modificabile.

### Problemi risolti

- creazione manuale delle directory di dominio;
- import GraphQL dimenticati;
- naming inconsistente;
- test mancanti;
- query client non allineate;
- ripetizione del setup Effect;
- tempo necessario per aggiungere una resource CRUD.

### Comando proposto

```bash
bun rover generate resource project
```

Prompt o flag possibili:

```text
Resource name: Project
Database table: project
Organization scoped: yes
Operations: create, read, list, update, delete
File fields: cover
Generate client feature: yes
Generate tests: yes
```

### Output server

```text
packages/api/src/models/project/
├── graphql/
│   ├── mutations/
│   │   ├── create.ts
│   │   ├── delete.ts
│   │   └── update.ts
│   ├── effect.ts
│   ├── project.graphql.ts
│   └── project.query.ts
├── services/
│   ├── create.service.ts
│   ├── delete.service.ts
│   ├── project.layer.ts
│   ├── read.service.ts
│   └── update.service.ts
├── types/
│   ├── base.types.ts
│   └── extra.types.ts
└── utils/
    ├── auth-api.ts
    └── errors.ts
```

### Output client

```text
apps/web/src/features/project/
├── components/
├── graphql/
│   ├── fragments.ts
│   ├── mutations.ts
│   ├── queries.ts
│   ├── resource.ts
│   └── types.ts
├── hooks/
├── screen/
└── tests/
```

### Regole di sicurezza

- non sovrascrivere file esistenti senza conferma;
- supportare `--dry-run`;
- mostrare il diff o l'elenco dei file;
- generare codice compilabile;
- eseguire check locali del package target;
- non modificare automaticamente schema DB senza un input esplicito;
- aggiornare `AGENTS.md` se introduce nuovi workflow o struttura stabile.

## 9. `@vyrel/domain-kit`

### Perché potrebbe essere utile

Una resource è oggi definita in più punti:

- tabella Drizzle;
- schema Zod select/insert/update;
- Morph model;
- Pothos object;
- query e mutation;
- Effect services;
- error mapping;
- documenti client;
- cache resource;
- fixture di test.

Una definizione di dominio condivisa potrebbe generare o collegare parte di
questi elementi.

### API ipotetica

```ts
export const TaskDomain = defineDomain({
  authorization: organizationMember({
    organizationId: (task) => task.organizationId,
  }),
  graphql: {
    key: "id",
    name: "Task",
  },
  schemas: {
    create: taskCreateSchema,
    query: taskQuerySchema,
    update: taskUpdateSchema,
  },
  table: task,
});
```

Possibili derivazioni:

```ts
export const taskGraphql = graphqlBridge.model(TaskDomain.graphqlModel());
export const taskFixture = createDomainFixture(TaskDomain);
export const taskClientResource = createClientResource(TaskDomain.contract());
```

### Rischi

- accoppiamento eccessivo tra client e server;
- difficoltà nel rappresentare domini non CRUD;
- tipi generici molto complessi;
- errori TypeScript poco comprensibili;
- framework interno difficile da mantenere;
- escape hatch più difficile;
- cambiamenti a un package con effetto su tutta la repo;
- tentazione di nascondere Drizzle, Pothos, Effect e Apollo.

### Raccomandazione

Non iniziare da `domain-kit`. Prima bisogna estrarre package più piccoli, usarli
su almeno tre domini e osservare quali pattern sono davvero stabili. Solo allora
sarà possibile capire se esiste una definizione di dominio comune oppure se un
generatore scaffold è sufficiente.

## Alternative esterne

### Apollo `refetchQueries`

### Quando usarlo

È la soluzione con il minor costo iniziale:

```ts
useMutation(CreateTaskDocument, {
  refetchQueries: [ListTasksDocument],
});
```

### Benefici

- pochissimo codice;
- cache riallineata al server;
- nessuna optimistic cache recipe complessa;
- ottimo fallback per feature poco frequenti.

### Limiti

- richiesta di rete aggiuntiva;
- query normalmente attiva necessaria per il refetch per documento/nome;
- stato intermedio meno fluido;
- non risolve optimistic UI offline o a bassa latenza;
- può rifare query costose.

`@vyrel/graphql-client` dovrebbe supportare una strategia `refetch` come escape
hatch:

```ts
useResourceMutation(CreateTaskDocument, {
  consistency: {
    mode: "refetch",
    queries: [ListTasksDocument],
  },
});
```

Riferimento:

- [Apollo Client mutations](https://www.apollographql.com/docs/react/data/mutations)

### Apollo type policies e field policies

Le type policies definiscono identità e comportamento dei campi cached:

```ts
const typePolicies = {
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
};
```

Sono la base corretta per normalizzazione, pagination e liste parametrizzate.
Un helper o generatore deve costruire sopra queste primitive, non sostituirle.

Riferimenti:

- [Apollo cache configuration](https://www.apollographql.com/docs/react/caching/cache-configuration)
- [Apollo cached field behavior](https://www.apollographql.com/docs/react/caching/cache-field-behavior)

### Relay

Relay offre un modello più dichiarativo per le connection. Direttive come:

- `@appendNode`;
- `@prependNode`;
- `@deleteRecord`;

possono ridurre il codice necessario a modificare liste normalizzate.

### Benefici

- compiler GraphQL molto forte;
- fragment ownership;
- connection e pagination standardizzate;
- mutation directive dichiarative;
- normalizzazione orientata agli ID.

### Costo di adozione

- sostituzione di Apollo Client;
- adozione del Relay Compiler;
- conversione delle liste in Relay Connections;
- modifica dello schema server;
- revisione dell'integrazione Next/RSC;
- riscrittura di query, mutation e cache logic;
- curva di apprendimento significativa.

### Raccomandazione

Non migrare a Relay soltanto per ridurre il boilerplate degli optimistic update.
Le primitive Apollo attuali sono sufficienti per creare un package più piccolo e
compatibile con l'architettura esistente.

Riferimento:

- [Relay connection updates](https://relay.dev/docs/guided-tour/list-data/updating-connections/)

### GraphQL Code Generator client preset

Il client preset genera TypedDocumentNode, tipi delle operation e fragment
masking. È un'ottima soluzione in progetti che non usano già `gql.tada`.

Vyrel usa già `gql.tada` per gli stessi obiettivi. Introdurre il client preset in
parallelo produrrebbe:

- due funzioni/document registries;
- due configurazioni di fragment masking;
- due pipeline di type generation;
- più artifact generated;
- maggiore costo cognitivo.

La parte utile di GraphQL Code Generator per Vyrel è invece il suo sistema di
plugin e la generazione di Apollo helpers, possible types e artifact custom.

## Possibile architettura finale

```text
                              BUILD TIME

Pothos schema
    |
    v
schema.graphql
    |
    +----------------------+
    |                      |
    v                      v
gql.tada output     @vyrel/graphql-codegen
    |                      |
    |                      v
    |             @vyrel/graphql-contract
    |                |             |
    +----------------+-------------+
                     |
                     v
                              RUNTIME CLIENT

TypedDocumentNode -> @vyrel/graphql-client -> Apollo Client


                              RUNTIME SERVER

Elysia / Yoga -> resolver -> @vyrel/effect-transport -> Effect service
                                      |
                                      v
                                @vyrel/authz
                                      |
                         +------------+------------+
                         |                         |
                         v                         v
                       Drizzle                @vyrel/media
```

## Ordine di implementazione consigliato

### Fase 0: misurazione e semplificazioni immediate

1. Inventariare tutti gli updater Apollo.
2. Identificare update di entità già gestiti dalla normalizzazione.
3. Rimuovere soltanto quelli dimostrati ridondanti tramite test.
4. Distinguere create, update, delete, move e invalidate/refetch.
5. Aggiungere test alla cache Task attuale come baseline.

Output atteso:

- meno codice senza nuovi package;
- comportamento attuale protetto da test;
- requisiti reali per il package client.

### Fase 1: primitive locali nella feature Task

Prima di creare un package, prototipare API locali:

```text
apps/web/src/features/dashboard/task/graphql/
├── resource.ts
├── task-cache.ts
└── task-cache.test.ts
```

Validare:

- ergonomia;
- inferenza TypeScript;
- messaggi di errore;
- optimistic layer;
- RSC hydration;
- fragment masking.

### Fase 2: estrazione di `@vyrel/graphql-client`

Estrarre soltanto primitive usate e testate. Migrare Task per primo, quindi una
seconda resource con caratteristiche diverse.

Criteri di successo:

- almeno il 50% di codice in meno negli hook mutation;
- nessuna perdita di type-safety;
- nessuna stringa libera per operation field e list field;
- escape hatch Apollo disponibile;
- bundle impact misurato;
- test di rollback e cache isolation.

### Fase 3: `@vyrel/effect-transport` e `@vyrel/authz`

Estrarre i pattern server che esistono già in Task, User e Organization.

Criteri di successo:

- rimozione dei runner duplicati;
- error mapping definito vicino al dominio;
- resolver più corti senza nascondere il service chiamato;
- test unitari delle policy;
- stessi code GraphQL/HTTP di prima.

### Fase 4: `@vyrel/graphql-contract`

Spostare gli artifact soltanto dopo aver verificato:

- import da `apps/web`;
- import da `apps/extension`;
- compatibilità con il plugin TypeScript di `gql.tada`;
- build Turborepo;
- deploy Next e server.

### Fase 5: `@vyrel/graphql-codegen`

Generare prima type policies e manifest semplici. Aggiungere resource codegen
soltanto dopo che l'API runtime è stabile.

Criteri di successo:

- output deterministico;
- task cacheable;
- errori chiari quando schema e config divergono;
- nessun codice generato modificato manualmente;
- supporto incremental/watch;
- nessuna dipendenza codegen nel bundle browser.

### Fase 6: testkit, media e scaffold

Estrarre questi package quando i pattern sono stati usati in almeno due o tre
domini. Lo scaffold deve usare le API stabili dei package precedenti.

## Criteri generali per creare un package

Un pattern dovrebbe diventare package quando:

- appare in almeno due o tre consumer;
- il comportamento comune è più grande delle differenze;
- l'API può essere spiegata senza conoscere un singolo dominio;
- esistono test chiari del boundary;
- riduce realmente il codice nei consumer;
- non introduce dipendenze circolari;
- può dichiarare correttamente le proprie workspace dependencies;
- il package ha ownership e responsabilità definite.

Un pattern dovrebbe rimanere locale quando:

- esiste in una sola feature;
- cambia frequentemente;
- richiede molte option booleane;
- l'astrazione è più lunga del codice sostituito;
- il generic TypeScript produce errori incomprensibili;
- nasconde business logic importante;
- obbliga consumer indipendenti a cambiare insieme.

## Anti-pattern da evitare

### Hook generati per ogni singola operation senza composizione

Generare `useCreateTaskMutation`, `useUpdateTaskMutation` e centinaia di wrapper
può ridurre qualche riga ma aumentare API surface e bundle. I wrapper generati
devono aggiungere una semantica reale: cache recipe, optimistic behavior o policy.

### Configurazioni basate su stringhe

```ts
defineMutation({
  list: "Query.tasks",
  result: "createTask",
});
```

Questa forma perde gran parte del vantaggio TypeScript e fallisce soltanto a
runtime o durante un codegen separato.

### Un unico package `@vyrel/core`

Raggruppare GraphQL, authz, media, testing ed Effect in un unico package crea:

- dipendenze inutili;
- bundle più grandi;
- confini poco chiari;
- rischio di cicli;
- difficoltà nel versioning.

Preferire package focalizzati.

### Generazione che modifica file manuali

Il generatore deve scrivere in directory dedicate o file completamente posseduti
dal codegen. Inserire porzioni generate dentro file manuali rende fragile la
rigenerazione.

### Automazione implicita delle liste

Non inserire automaticamente una nuova entità in ogni query che restituisce lo
stesso typename. Filtri, permessi e ordinamenti possono rendere il comportamento
errato.

### Sostituire framework già adeguati

Non creare wrapper generici che si limitano a rinominare:

- `useQuery`;
- `useMutation`;
- `Effect.gen`;
- `builder.queryFields`;
- `db.select`.

Un wrapper è giustificato soltanto se incorpora un pattern Vyrel concreto e
testato.

## Decisione raccomandata

Il primo investimento dovrebbe essere `@vyrel/graphql-client`, iniziando da un
prototipo locale sulla feature Task.

La ragione è che:

- il problema è già presente e misurabile;
- Apollo e `gql.tada` rimangono invariati;
- il rischio architetturale è contenuto;
- l'adozione può essere incrementale;
- il package può essere completamente type-safe;
- crea il contratto necessario per un futuro `@vyrel/graphql-codegen`;
- migliora immediatamente optimistic create/delete e liste parametrizzate.

In parallelo, `@vyrel/effect-transport` offre il miglior ritorno lato server con
un rischio relativamente basso, perché estrae runner ed error mapping già
duplicati in più domini.

La sequenza consigliata è quindi:

```text
1. semplificazioni Apollo già possibili
2. prototipo Task resource/cache
3. @vyrel/graphql-client
4. @vyrel/effect-transport
5. @vyrel/authz
6. @vyrel/graphql-contract
7. @vyrel/graphql-codegen
8. @vyrel/testkit e @vyrel/media
9. @vyrel/scaffold
10. eventuale valutazione di @vyrel/domain-kit
```

Questa progressione segue lo stesso principio di Morph: prima comprendere e
stabilizzare il pattern, poi automatizzare la parte meccanica, mantenendo sempre
accessibili gli strumenti sottostanti.
