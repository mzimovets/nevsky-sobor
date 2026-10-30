export async function fetchSchedule() {
  const res = await fetch("/api/schedule");
  if (!res.ok) throw new Error("Не удалось загрузить расписание");
  return res.json();
}
