import data from "./akathist-alexander-nevsky.json";

// Акафист святому благоверному великому князю Александру Невскому.
// Источник — Akafist_Alexandru_Nevskomu_redaktirovanny.pdf; текст лежит в
// akathist-alexander-nevsky.json (его же можно прочитать с сервера/скриптов),
// здесь — удобные обёртки для сайта.
//
// Структура JSON:
//   { id, title, source, refrain, sections: [ ... ] }
// Секции (по порядку чтения, 34 штуки):
//   { id: "kondak-1", type: "kondak", number: 1, title: "Кондак 1", text }
//   { id: "ikos-1", type: "ikos", number: 1, title: "Икос 1", intro, verses: [...] }
//     (последний verse у икосов — припев `refrain`)
//   { id: "molitva-1" | "molitva-2", type: "prayer", title, text }
//   { id: "troparion" | "troparion-2", type: "troparion", tone: 4, title, text, phrases }
//   { id: "kondak-glas" | "kondak-glas-2", type: "kontakion", tone, title, text, phrases }
//   { id: "velichanie", type: "megalynarion", title, text, phrases }
// Повтор в конце акафиста: id с суффиксом "-repeat" (ikos-1-repeat, kondak-1-repeat).

export const akathist = data;

export const akathistSections = data.sections;

export const getAkathistSection = (id) => data.sections.find((s) => s.id === id) || null;

// Текст секции одной строкой — для поиска, копирования, озвучки.
export function sectionToText(section) {
  if (section.type === "ikos") return [section.title, section.intro, ...section.verses].join("\n\n");
  return [section.title, section.text].join("\n\n");
}

export const akathistToPlainText = () => [data.title, ...data.sections.map(sectionToText)].join("\n\n");
