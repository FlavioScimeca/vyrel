import { defineGraphqlClientRegistry } from "@vyrel/graphql-client/cache";
import type { GraphqlClientSchemaMetadata, ModelOf } from "@vyrel/graphql-client/codegen";
import type {} from "@vyrel/graphql-client";
import type { ResultOf } from "gql.tada";
import type { ExtensionHealthFragment as FragmentDocument0 } from "../queries";
import type { OrganizationListItemFragment as FragmentDocument1 } from "../../features/dashboard/organization/graphql/fragments";
import type { TaskListItemFragment as FragmentDocument2 } from "../../features/dashboard/task/graphql/fragments";
import { ListOrganizationsDocument as CollectionDocument0 } from "../../features/dashboard/organization/graphql/queries";
import { ListTasksDocument as CollectionDocument1 } from "../../features/dashboard/task/graphql/queries";

declare module "@vyrel/graphql-client" {
  interface FragmentTypeRegistry {
    readonly "ExtensionHealth": ResultOf<typeof FragmentDocument0>;
    readonly "OrganizationListItem": ResultOf<typeof FragmentDocument1>;
    readonly "TaskListItem": ResultOf<typeof FragmentDocument2>;
  }
}

export const graphqlClientSchema = {
  "enums": {
    "TaskPriority": [
      "HIGH",
      "LOW",
      "MEDIUM",
      "NONE"
    ],
    "TaskSort": [
      "DUE_DATE",
      "NEWEST",
      "PRIORITY",
      "RECENTLY_UPDATED"
    ],
    "TaskStatus": [
      "DONE",
      "IN_PROGRESS",
      "TODO"
    ]
  },
  "mutationType": "Mutation",
  "queryType": "Query",
  "types": {
    "Mutation": {
      "fields": {
        "createTask": {
          "type": {
            "kind": "NAMED",
            "name": "Task"
          }
        },
        "createTaskLabel": {
          "type": {
            "kind": "NAMED",
            "name": "TaskLabel"
          }
        },
        "deleteOrganization": {
          "type": {
            "kind": "NAMED",
            "name": "String"
          }
        },
        "deleteTask": {
          "type": {
            "kind": "NAMED",
            "name": "String"
          }
        },
        "deleteTaskLabel": {
          "type": {
            "kind": "NAMED",
            "name": "String"
          }
        },
        "deleteUser": {
          "type": {
            "kind": "NAMED",
            "name": "String"
          }
        },
        "updateOrganization": {
          "type": {
            "kind": "NAMED",
            "name": "Organization"
          }
        },
        "updateTask": {
          "type": {
            "kind": "NAMED",
            "name": "Task"
          }
        },
        "updateTaskLabel": {
          "type": {
            "kind": "NAMED",
            "name": "TaskLabel"
          }
        },
        "updateUser": {
          "type": {
            "kind": "NAMED",
            "name": "User"
          }
        }
      },
      "keyFields": []
    },
    "Organization": {
      "fields": {
        "createdAt": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "DateTime"
            }
          }
        },
        "id": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "ID"
            }
          }
        },
        "imageFull": {
          "type": {
            "kind": "NAMED",
            "name": "String"
          }
        },
        "imageThumb": {
          "type": {
            "kind": "NAMED",
            "name": "String"
          }
        },
        "logo": {
          "type": {
            "kind": "NAMED",
            "name": "String"
          }
        },
        "metadata": {
          "type": {
            "kind": "NAMED",
            "name": "String"
          }
        },
        "name": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "String"
            }
          }
        },
        "slug": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "String"
            }
          }
        }
      },
      "keyFields": [
        "id"
      ]
    },
    "Query": {
      "fields": {
        "health": {
          "type": {
            "kind": "NAMED",
            "name": "String"
          }
        },
        "organization": {
          "type": {
            "kind": "NAMED",
            "name": "Organization"
          }
        },
        "organizations": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "LIST",
              "ofType": {
                "kind": "NON_NULL",
                "ofType": {
                  "kind": "NAMED",
                  "name": "Organization"
                }
              }
            }
          }
        },
        "task": {
          "type": {
            "kind": "NAMED",
            "name": "Task"
          }
        },
        "taskConnection": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "TaskConnection"
            }
          }
        },
        "taskLabels": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "LIST",
              "ofType": {
                "kind": "NON_NULL",
                "ofType": {
                  "kind": "NAMED",
                  "name": "TaskLabel"
                }
              }
            }
          }
        },
        "taskSummary": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "TaskSummary"
            }
          }
        },
        "tasks": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "LIST",
              "ofType": {
                "kind": "NON_NULL",
                "ofType": {
                  "kind": "NAMED",
                  "name": "Task"
                }
              }
            }
          }
        },
        "user": {
          "type": {
            "kind": "NAMED",
            "name": "User"
          }
        }
      },
      "keyFields": []
    },
    "Task": {
      "fields": {
        "assignee": {
          "type": {
            "kind": "NAMED",
            "name": "User"
          }
        },
        "assigneeId": {
          "type": {
            "kind": "NAMED",
            "name": "String"
          }
        },
        "createdAt": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "DateTime"
            }
          }
        },
        "createdById": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "String"
            }
          }
        },
        "description": {
          "type": {
            "kind": "NAMED",
            "name": "String"
          }
        },
        "dueDate": {
          "type": {
            "kind": "NAMED",
            "name": "LocalDate"
          }
        },
        "id": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "ID"
            }
          }
        },
        "imageFull": {
          "type": {
            "kind": "NAMED",
            "name": "String"
          }
        },
        "imageThumb": {
          "type": {
            "kind": "NAMED",
            "name": "String"
          }
        },
        "labels": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "LIST",
              "ofType": {
                "kind": "NON_NULL",
                "ofType": {
                  "kind": "NAMED",
                  "name": "TaskLabel"
                }
              }
            }
          }
        },
        "organizationId": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "String"
            }
          }
        },
        "priority": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "TaskPriority"
            }
          }
        },
        "status": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "TaskStatus"
            }
          }
        },
        "title": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "String"
            }
          }
        },
        "updatedAt": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "DateTime"
            }
          }
        }
      },
      "keyFields": [
        "id"
      ]
    },
    "TaskConnection": {
      "fields": {
        "nodes": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "LIST",
              "ofType": {
                "kind": "NON_NULL",
                "ofType": {
                  "kind": "NAMED",
                  "name": "Task"
                }
              }
            }
          }
        },
        "pageInfo": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "TaskPageInfo"
            }
          }
        }
      },
      "keyFields": []
    },
    "TaskLabel": {
      "fields": {
        "color": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "String"
            }
          }
        },
        "createdAt": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "DateTime"
            }
          }
        },
        "id": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "ID"
            }
          }
        },
        "name": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "String"
            }
          }
        },
        "organizationId": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "String"
            }
          }
        }
      },
      "keyFields": [
        "id"
      ]
    },
    "TaskPageInfo": {
      "fields": {
        "endCursor": {
          "type": {
            "kind": "NAMED",
            "name": "String"
          }
        },
        "hasNextPage": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "Boolean"
            }
          }
        }
      },
      "keyFields": []
    },
    "TaskSummary": {
      "fields": {
        "done": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "Int"
            }
          }
        },
        "inProgress": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "Int"
            }
          }
        },
        "overdue": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "Int"
            }
          }
        },
        "todo": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "Int"
            }
          }
        },
        "total": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "Int"
            }
          }
        }
      },
      "keyFields": []
    },
    "User": {
      "fields": {
        "createdAt": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "DateTime"
            }
          }
        },
        "email": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "String"
            }
          }
        },
        "emailVerified": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "Boolean"
            }
          }
        },
        "id": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "ID"
            }
          }
        },
        "imageFull": {
          "type": {
            "kind": "NAMED",
            "name": "String"
          }
        },
        "imagePlaceholder": {
          "type": {
            "kind": "NAMED",
            "name": "String"
          }
        },
        "imageThumb": {
          "type": {
            "kind": "NAMED",
            "name": "String"
          }
        },
        "name": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "String"
            }
          }
        },
        "updatedAt": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "DateTime"
            }
          }
        }
      },
      "keyFields": [
        "id"
      ]
    }
  }
} as const satisfies GraphqlClientSchemaMetadata;

export interface GraphqlClientScalars {
  readonly "DateTime": string;
  readonly "File": unknown;
  readonly "JSON": unknown;
  readonly "LocalDate": string;
  readonly "URL": string;
}

export type GraphqlClientModel<TName extends keyof typeof graphqlClientSchema.types> = ModelOf<typeof graphqlClientSchema, TName, GraphqlClientScalars>;

export const graphqlClientTypePolicies = {
  "Organization": { keyFields: ["id"] },
  "Task": { keyFields: ["id"] },
  "TaskLabel": { keyFields: ["id"] },
  "User": { keyFields: ["id"] },
} as const;

export const graphqlClientRegistry = defineGraphqlClientRegistry({
  collections: {
    "Organization": { query: CollectionDocument0, responseKey: "organizations", storeFieldName: "organizations" },
    "Task": { query: CollectionDocument1, responseKey: "tasks", storeFieldName: "tasks" },
  },
  mutations: {
    "CreateTask": {
      "createTask": {"collectionVariablePaths":{"organizationId":["input","organizationId"]},"entityType":"Task","keyField":"id","kind":"create"},
    },
  },
});
