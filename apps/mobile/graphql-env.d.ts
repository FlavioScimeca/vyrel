/* eslint-disable */
/* prettier-ignore */

export type introspection_types = {
    'Boolean': unknown;
    'CreateTask': { kind: 'INPUT_OBJECT'; name: 'CreateTask'; isOneOf: false; inputFields: [{ name: 'description'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; }; defaultValue: null }, { name: 'image'; type: { kind: 'SCALAR'; name: 'File'; ofType: null; }; defaultValue: null }, { name: 'organizationId'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; }; defaultValue: null }, { name: 'title'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; }; defaultValue: null }]; };
    'DateTime': unknown;
    'DeleteOrganization': { kind: 'INPUT_OBJECT'; name: 'DeleteOrganization'; isOneOf: false; inputFields: [{ name: 'organizationId'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; }; defaultValue: null }]; };
    'DeleteTask': { kind: 'INPUT_OBJECT'; name: 'DeleteTask'; isOneOf: false; inputFields: [{ name: 'taskId'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; }; defaultValue: null }]; };
    'DeleteUser': { kind: 'INPUT_OBJECT'; name: 'DeleteUser'; isOneOf: false; inputFields: [{ name: 'callbackURL'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; }; defaultValue: null }, { name: 'password'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; }; defaultValue: null }, { name: 'token'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; }; defaultValue: null }]; };
    'File': unknown;
    'ID': unknown;
    'JSON': unknown;
    'Mutation': { kind: 'OBJECT'; name: 'Mutation'; fields: { 'createTask': { name: 'createTask'; type: { kind: 'OBJECT'; name: 'Task'; ofType: null; } }; 'deleteOrganization': { name: 'deleteOrganization'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'deleteTask': { name: 'deleteTask'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'deleteUser': { name: 'deleteUser'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'updateOrganization': { name: 'updateOrganization'; type: { kind: 'OBJECT'; name: 'Organization'; ofType: null; } }; 'updateTask': { name: 'updateTask'; type: { kind: 'OBJECT'; name: 'Task'; ofType: null; } }; 'updateUser': { name: 'updateUser'; type: { kind: 'OBJECT'; name: 'User'; ofType: null; } }; }; };
    'Organization': { kind: 'OBJECT'; name: 'Organization'; fields: { 'createdAt': { name: 'createdAt'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'DateTime'; ofType: null; }; } }; 'id': { name: 'id'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'ID'; ofType: null; }; } }; 'imageFull': { name: 'imageFull'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'imageThumb': { name: 'imageThumb'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'logo': { name: 'logo'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'metadata': { name: 'metadata'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'name': { name: 'name'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'slug': { name: 'slug'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; }; };
    'Query': { kind: 'OBJECT'; name: 'Query'; fields: { 'health': { name: 'health'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'organization': { name: 'organization'; type: { kind: 'OBJECT'; name: 'Organization'; ofType: null; } }; 'organizations': { name: 'organizations'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Organization'; ofType: null; }; }; }; } }; 'task': { name: 'task'; type: { kind: 'OBJECT'; name: 'Task'; ofType: null; } }; 'tasks': { name: 'tasks'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'LIST'; name: never; ofType: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'Task'; ofType: null; }; }; }; } }; 'user': { name: 'user'; type: { kind: 'OBJECT'; name: 'User'; ofType: null; } }; }; };
    'String': unknown;
    'Task': { kind: 'OBJECT'; name: 'Task'; fields: { 'createdAt': { name: 'createdAt'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'DateTime'; ofType: null; }; } }; 'createdById': { name: 'createdById'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'description': { name: 'description'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'id': { name: 'id'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'ID'; ofType: null; }; } }; 'imageFull': { name: 'imageFull'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'imageThumb': { name: 'imageThumb'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'organizationId': { name: 'organizationId'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'title': { name: 'title'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'updatedAt': { name: 'updatedAt'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'DateTime'; ofType: null; }; } }; }; };
    'URL': unknown;
    'UpdateOrganization': { kind: 'INPUT_OBJECT'; name: 'UpdateOrganization'; isOneOf: false; inputFields: [{ name: 'logo'; type: { kind: 'SCALAR'; name: 'File'; ofType: null; }; defaultValue: null }, { name: 'name'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; }; defaultValue: null }, { name: 'organizationId'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; }; defaultValue: null }, { name: 'slug'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; }; defaultValue: null }]; };
    'UpdateTask': { kind: 'INPUT_OBJECT'; name: 'UpdateTask'; isOneOf: false; inputFields: [{ name: 'description'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; }; defaultValue: null }, { name: 'image'; type: { kind: 'SCALAR'; name: 'File'; ofType: null; }; defaultValue: null }, { name: 'taskId'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; }; defaultValue: null }, { name: 'title'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; }; defaultValue: null }]; };
    'UpdateUser': { kind: 'INPUT_OBJECT'; name: 'UpdateUser'; isOneOf: false; inputFields: [{ name: 'avatar'; type: { kind: 'SCALAR'; name: 'File'; ofType: null; }; defaultValue: null }, { name: 'name'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; }; defaultValue: null }]; };
    'User': { kind: 'OBJECT'; name: 'User'; fields: { 'createdAt': { name: 'createdAt'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'DateTime'; ofType: null; }; } }; 'email': { name: 'email'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'emailVerified': { name: 'emailVerified'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'Boolean'; ofType: null; }; } }; 'id': { name: 'id'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'ID'; ofType: null; }; } }; 'imageFull': { name: 'imageFull'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'imagePlaceholder': { name: 'imagePlaceholder'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'imageThumb': { name: 'imageThumb'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'name': { name: 'name'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'updatedAt': { name: 'updatedAt'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'DateTime'; ofType: null; }; } }; }; };
};

/** An IntrospectionQuery representation of your schema.
 *
 * @remarks
 * This is an introspection of your schema saved as a file by GraphQLSP.
 * It will automatically be used by `gql.tada` to infer the types of your GraphQL documents.
 * If you need to reuse this data or update your `scalars`, update `tadaOutputLocation` to
 * instead save to a .ts instead of a .d.ts file.
 */
export type introspection = {
  name: never;
  query: 'Query';
  mutation: 'Mutation';
  subscription: never;
  types: introspection_types;
};

import * as gqlTada from 'gql.tada';

declare module 'gql.tada' {
  interface setupSchema {
    introspection: introspection
  }
}