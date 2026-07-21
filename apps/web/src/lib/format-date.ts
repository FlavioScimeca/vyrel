const mediumDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export function formatMediumDate(value: Date | string | number): string {
  return mediumDate.format(new Date(value));
}
