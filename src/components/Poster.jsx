import parse from "html-react-parser";
import { markupToHtml } from "../lib/markup.js";

export const POSTER_WIDTH = 911;
export const POSTER_HEIGHT = 1288.414;

const MONTHS = {
  "01": "Января", "02": "Февраля", "03": "Марта", "04": "Апреля",
  "05": "Мая", "06": "Июня", "07": "Июля", "08": "Августа",
  "09": "Сентября", 10: "Октября", 11: "Ноября", 12: "Декабря",
};
const monthLiteral = (v) => MONTHS[v] || MONTHS[String(v).padStart(2, "0")] || "";
const dateNum = (v) => (v ? String(parseInt(v, 10)) : "");

const defaultHeading = (el) => {
  const parts = [dateNum(el.dateWeek), monthLiteral(el.month)].filter(Boolean);
  const txt = parts.length ? `${parts.join(" ")} - ${el.dayWeek}` : el.dayWeek || "";
  return el.dayWeek === "Воскресенье" ? `<span style="color: #990b0bfd">${txt}</span>` : txt;
};

// Готовит HTML ячейки: убирает пустые <p>, лишние пробелы между тегами —
// как toContent() в a_nevsky_react/src/components/Schedule.jsx.
const BLOCK_RE = /^\s*<(p|div|ul|ol|h[1-6]|br)[\s>/]/i;
const toContent = (value) => {
  let html = markupToHtml(value || "");
  if (typeof document !== "undefined") {
    const box = document.createElement("div");
    box.innerHTML = html;
    box.querySelectorAll("p, div").forEach((n) => {
      const empty = !n.textContent.replace(/ /g, "").trim() && !n.querySelector("img");
      if (empty) n.remove();
    });
    html = box.innerHTML;
  }
  html = html.replace(/>\s+</g, "><").replace(/<p>\s+/gi, "<p>").replace(/\s+<\/p>/gi, "</p>").trim();
  return BLOCK_RE.test(html) ? html : `<p>${html}</p>`;
};

const Cell = ({ value }) => <div className="tiptap ProseMirror">{parse(toContent(value))}</div>;

const isSunday = (el) => el.dayWeek === "Воскресенье";

// Постер 1:1 как на schedule.nevsky-sobor.ru: фон-картинка с рамкой и
// заголовком собора + абсолютно спозиционированная таблица поверх.
export default function Poster({ days, fontSize = "17px" }) {
  return (
    <div className="poster">
      <div className="font-serif">
        <div className="f-img-block">
          <img src="/poster/background.webp" alt="" />
          <table className="schedule-table" style={{ fontSize }}>
            <tbody>
              <tr>
                <td style={{ textAlign: "center", borderRight: "1px #989898 solid" }}>День недели</td>
                <td style={{ textAlign: "center" }}>Святые дня</td>
              </tr>
              {days.map((el, i) => {
                const headingValue = el.heading != null && el.heading !== "" ? el.heading : defaultHeading(el);
                return (
                  <tr key={el.id || i}>
                    <td>
                      <div className="cell-heading" style={{ paddingTop: 4, color: isSunday(el) ? "#990b0bfd" : "black" }}>
                        <Cell value={headingValue} />
                      </div>
                      <div style={{ paddingRight: 4, color: isSunday(el) ? "#990b0bfd" : "black" }}>
                        <Cell value={el.prayerTimes} />
                      </div>
                    </td>
                    <td>
                      <div style={{ textAlign: "center", padding: 8, color: isSunday(el) ? "#990b0bfd" : "black" }}>
                        <Cell value={el.saintsOfDay} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
