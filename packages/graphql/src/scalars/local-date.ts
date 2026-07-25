import { GraphQLError, GraphQLScalarType, Kind } from "graphql";

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseLocalDate = (value: unknown): string => {
  if (typeof value !== "string" || !LOCAL_DATE_PATTERN.test(value)) {
    throw new GraphQLError("LocalDate must use the YYYY-MM-DD format.");
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new GraphQLError("LocalDate must be a valid calendar date.");
  }

  return value;
};

export const GraphQLLocalDate = new GraphQLScalarType<string, string>({
  description:
    "A calendar date without a time zone, serialized in YYYY-MM-DD format.",
  name: "LocalDate",
  parseLiteral: (node) => {
    if (node.kind !== Kind.STRING) {
      throw new GraphQLError("LocalDate must be a string.");
    }
    return parseLocalDate(node.value);
  },
  parseValue: parseLocalDate,
  serialize: parseLocalDate,
});
