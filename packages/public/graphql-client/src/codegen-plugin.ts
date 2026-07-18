import { resolve } from "node:path";
import type { DocumentNode, GraphQLSchema } from "graphql";
import type { GraphqlClientCodegenConfig } from "./codegen/generate";
import { generateGraphqlClientArtifact } from "./codegen/generate";

interface PluginDocumentFile {
  readonly document?: DocumentNode;
  readonly location?: string;
}

interface PluginOutputInfo {
  readonly outputFile?: string;
}

export const plugin = (
  schema: GraphQLSchema,
  documents: readonly PluginDocumentFile[],
  configuration: GraphqlClientCodegenConfig,
  info: PluginOutputInfo
): string => {
  if (info.outputFile === undefined) {
    throw new Error("GraphQL Codegen did not provide an output file path.");
  }

  return generateGraphqlClientArtifact(
    schema,
    documents,
    resolve(info.outputFile),
    configuration
  );
};
