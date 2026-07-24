import { defineGraphqlClientRegistry } from "@vyrel/graphql-client/cache";
import type { GraphqlClientSchemaMetadata, ModelOf } from "@vyrel/graphql-client/codegen";
import type { ResultOf } from "gql.tada";
import type { OrganizationListItemFragment as FragmentDocument0 } from "../../features/dashboard/organization/graphql/fragments";
import type { TaskListItemFragment as FragmentDocument1 } from "../../features/dashboard/task/graphql/fragments";
import type { UserProfileFragment as FragmentDocument2 } from "../../features/dashboard/user/graphql/fragments";
import { ListOrganizationsDocument as CollectionDocument0 } from "../../features/dashboard/organization/graphql/queries";
import { ListTasksDocument as CollectionDocument1 } from "../../features/dashboard/task/graphql/queries";

declare module "@vyrel/graphql-client" {
  interface FragmentTypeRegistry {
    readonly "OrganizationListItem": ResultOf<typeof FragmentDocument0>;
    readonly "TaskListItem": ResultOf<typeof FragmentDocument1>;
    readonly "UserProfile": ResultOf<typeof FragmentDocument2>;
  }
}

export const graphqlClientSchema = {
  "enums": {},
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
        "organizationId": {
          "type": {
            "kind": "NON_NULL",
            "ofType": {
              "kind": "NAMED",
              "name": "String"
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
  readonly "URL": string;
}

export type GraphqlClientModel<TName extends keyof typeof graphqlClientSchema.types> = ModelOf<typeof graphqlClientSchema, TName, GraphqlClientScalars>;

export const graphqlClientTypePolicies = {
  "Organization": { keyFields: ["id"] },
  "Task": { keyFields: ["id"] },
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
    "DeleteOrganization": {
      "deleteOrganization": {"entityType":"Organization","keyField":"id","kind":"delete"},
    },
    "DeleteTask": {
      "deleteTask": {"entityType":"Task","keyField":"id","kind":"delete"},
    },
    "DeleteUser": {
      "deleteUser": {"entityType":"User","keyField":"id","kind":"delete"},
    },
    "UpdateOrganization": {
      "updateOrganization": {"entityType":"Organization","keyField":"id","kind":"update"},
    },
    "UpdateTask": {
      "updateTask": {"entityType":"Task","keyField":"id","kind":"update"},
    },
    "UpdateUser": {
      "updateUser": {"entityType":"User","keyField":"id","kind":"update"},
    },
  },
});
