// Данные дня несут только dateWeek/month (без года) — год берём из
// today, с поправкой на переход через Новый год (декабрь ↔ январь).
function toDate(day, today) {
  const month = Number(day.month) - 1;
  const date = Number(day.dateWeek);
  if (!Number.isFinite(month) || !Number.isFinite(date)) return null;

  let year = today.getFullYear();
  if (month < today.getMonth() - 6) year += 1;
  else if (month > today.getMonth() + 6) year -= 1;

  return new Date(year, month, date, 23, 59, 59, 999);
}

// ISO-дата (YYYY-MM-DD) дня расписания — для страницы /day/:date, той же
// логикой восстановления года, что и toDate() выше.
export function dayISODate(day, today = new Date()) {
  const d = toDate(day, today);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 'past' | 'today' | 'future' — для оформления карточек дней на главной.
export function dayStatus(day, today = new Date()) {
  const d = toDate(day, today);
  if (!d) return "future";
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (d < startOfToday) return "past";
  const sameDay =
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  return sameDay ? "today" : "future";
}

// Индекс первого дня в массиве, который сегодня или позже (-1, если такого
// нет — всё расписание уже в прошлом).
function findTodayIndex(days, today) {
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return days.findIndex((day) => {
    const d = toDate(day, today);
    return d && d >= startOfToday;
  });
}

// Обрезает массив дней так, чтобы первым шёл сегодняшний (или ближайший
// следующий) день — прошедшие дни недели в начале расписания не показываем.
// Если расписание давно не обновляли и все дни уже в прошлом — показываем
// не самые старые дни с начала массива, а последние (ближе к сегодня).
export function upcomingDays(days, today = new Date(), fallbackCount = 6) {
  const idx = findTodayIndex(days, today);
  if (idx !== -1) return days.slice(idx);
  return days.slice(Math.max(0, days.length - fallbackCount));
}

// Индекс сегодняшнего (или ближайшего следующего) дня в НЕобрезанном
// массиве — чтобы листать блок «Расписание» на главной (DaySchedule.jsx)
// можно было не только вперёд, но и назад, до самого первого дня, что есть
// в расписании (см. запрос пользователя — раньше листалось только от
// сегодня и дальше, потому что на главную передавался уже обрезанный
// upcomingDays()). Тот же фолбэк, что и в upcomingDays выше: если все дни
// уже в прошлом — считаем «сегодня» последним (ближайшим к текущей дате)
// днём массива.
export function todayIndex(days, today = new Date()) {
  const idx = findTodayIndex(days, today);
  if (idx !== -1) return idx;
  return Math.max(0, days.length - 1);
}
