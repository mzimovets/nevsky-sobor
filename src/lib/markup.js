// Совместимость со старым форматом разметки расписания (a_nevsky_react):
//   *текст* → красный, @текст@ → жирный. Новые данные уже приходят HTML —
// это почти passthrough, срабатывает только на устаревших записях.
const SACRED_RED = "#990b0bfd";

const redHighlight = (text) => {
  if (!text) return text ?? "";
  return text.replaceAll(/\*.+?\*/g, (x) => {
    const open = `<span style="color: ${SACRED_RED}">`;
    return x.replace("*", open).replace("*", "</span>");
  });
};

const boldText = (text) => {
  if (!text) return text ?? "";
  return text.replaceAll(/@.+?@/g, (x) => x.replace("@", "<b>").replace("@", "</b>"));
};

export const markupToHtml = (value) => boldText(redHighlight(value ?? ""));
