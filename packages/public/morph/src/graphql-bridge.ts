import { initializeDrizzleGraphqlBridge } from './lib/define-drizzle-graphql-fields';
import { builder } from './pothos';

export const graphqlBridge = initializeDrizzleGraphqlBridge(builder, {
  defaultIdFields: ['id', 'orgId'],
  unmappedFields: 'throw',
});
