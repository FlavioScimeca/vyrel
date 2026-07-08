import { GraphQLScalarType } from "graphql";

export const GraphQLFile = new GraphQLScalarType({
  description: "The `File` scalar type represents a file upload.",
  name: "File",
  parseLiteral() {
    throw new TypeError("File uploads must be sent as multipart form data");
  },
  parseValue(value: unknown) {
    if (value instanceof Blob) {
      return value as File;
    }
    throw new TypeError("Expected a File or Blob upload");
  },
  serialize() {
    throw new TypeError("File output serialization is not supported");
  },
});
