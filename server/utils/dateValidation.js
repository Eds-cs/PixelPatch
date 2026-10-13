export function isValidDateOnly(value) {
  let year;
  let month;
  let day;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return false;
    year = value.getFullYear();
    month = value.getMonth() + 1;
    day = value.getDate();
  } else {
    if (typeof value !== "string" || !/^(\d{4})-(\d{2})-(\d{2})$/.test(value)) return false;
    [year, month, day] = value.split("-").map(Number);
  }

  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
}