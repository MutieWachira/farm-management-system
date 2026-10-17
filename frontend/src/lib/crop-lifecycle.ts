export function isPlantingDateDue(
  plantingDate: string | null,
  today = new Date(),
): boolean {
  if (!plantingDate) return false;

  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  return plantingDate.slice(0, 10) <= todayKey;
}
