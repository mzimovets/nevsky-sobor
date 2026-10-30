// «07:00 – Ранняя Литургия» → { time: "07:00", text: "Ранняя Литургия" };
// строки без времени остаются просто текстом.
export function parseServices(html) {
  const lines = (html || "")
    .replace(/<\/p>|<br\s*\/?>|\n/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((l) => l.replace(/&nbsp;/g, " ").trim())
    .filter(Boolean);
  return lines.map((line) => {
    const m = line.match(/^(\d{1,2}[:.]\d{2})\s*[–—-]\s*(.*)$/);
    return m ? { time: m[1].replace(".", ":"), text: m[2] } : { time: "", text: line };
  });
}
