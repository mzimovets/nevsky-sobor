const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

// heading может отсутствовать (источник не заполнил его) — тогда строим
// заголовок из dateWeek/month/dayWeek, как defaultHeading() в a_nevsky_react
// (и в Poster.jsx): «22 Сентября - Вторник» — с дефисом перед днём недели,
// чтобы оформление совпадало с заполненными вручную заголовками.
export function fallbackHeading(day) {
  const monthName = MONTHS[Number(day.month) - 1] || "";
  const datePart = [day.dateWeek, monthName].filter(Boolean).join(" ");
  return datePart ? `${datePart} - ${day.dayWeek || ""}`.trim() : day.dayWeek || "";
}

// Заголовок дня как обычный текст (без HTML/цвета) — для мест, где нужен
// просто «22 Сентября - Вторник», а не размеченная HTML-строка из day.heading.
export function dayHeadingText(day) {
  if (!day) return "";
  if (day.heading) {
    const div = typeof document !== "undefined" ? document.createElement("div") : null;
    if (div) {
      div.innerHTML = day.heading;
      const text = div.textContent.trim();
      if (text) return text;
    }
  }
  return fallbackHeading(day);
}

// Дата дня без дня недели — «22 Сентября» (для «даты памяти» под именем
// иконы в карточке святого: день недели там не нужен).
export function dayDateText(day) {
  if (!day) return "";
  const monthName = MONTHS[Number(day.month) - 1] || "";
  return [day.dateWeek, monthName].filter(Boolean).join(" ");
}
