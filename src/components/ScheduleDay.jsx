import { fallbackHeading } from "../lib/dayHeading.js";

// Дни недели, для которых prayerTimes/saintsOfDay пришли как HTML-строки из
// редактора расписания (Tiptap) — тот же формат, что и в a_nevsky_react.
// Класс rich-text перебивает инлайн font-family из редактора (Устав и т.п.),
// чтобы на сайте всегда был шрифт проекта.
// Карточка занимает всю высоту обёртки (h-full задаёт вызывающий компонент,
// см. ScheduleCarousel) — так карточки в карусели одного размера; если
// текста «Святые дня» больше, чем влезает, блок скроллится, а не обрезается.
export default function ScheduleDay({ day }) {
  const isSunday = day.dayWeek === "Воскресенье" || day.dayWeek === 0;

  return (
    <article className="flex h-full flex-col rounded-lg border border-line bg-white p-5 shadow-sm">
      {day.heading ? (
        <h3
          className={`rich-heading mb-3 shrink-0 text-base normal-case tracking-normal ${
            isSunday ? "text-maroon" : "text-ink"
          }`}
          dangerouslySetInnerHTML={{ __html: day.heading }}
        />
      ) : (
        <h3
          className={`mb-3 shrink-0 text-base normal-case tracking-normal ${
            isSunday ? "text-maroon" : "text-ink"
          }`}
        >
          {fallbackHeading(day)}
        </h3>
      )}
      {day.prayerTimes && (
        <div
          className="rich-text mb-2 shrink-0 text-sm leading-relaxed break-words"
          dangerouslySetInnerHTML={{ __html: day.prayerTimes }}
        />
      )}
      {day.saintsOfDay && (
        <div
          className="rich-text min-h-0 flex-1 overflow-y-auto text-sm leading-relaxed break-words text-muted"
          dangerouslySetInnerHTML={{ __html: day.saintsOfDay }}
        />
      )}
    </article>
  );
}
