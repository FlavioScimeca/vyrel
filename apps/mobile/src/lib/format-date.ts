const mediumDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatMediumDate(value: string): string {
  const localDateMatch = LOCAL_DATE_PATTERN.exec(value);
  const date =
    localDateMatch === null
      ? new Date(value)
      : new Date(
          Number(localDateMatch[1]),
          Number(localDateMatch[2]) - 1,
          Number(localDateMatch[3])
        );
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return mediumDateFormatter.format(date);
}
