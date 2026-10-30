import { useState } from "react";
import { Link } from "react-router-dom";
import { RevealWords } from "../components/Reveal.jsx";
import { REQUISITE_SECTIONS } from "../lib/requisites.js";

const GOLD_TEXT = "bg-gradient-to-b from-[#c0392b] to-[#7a1a10] bg-clip-text text-transparent";

// Страница «Реквизиты собора» — ссылка на неё внизу сайта (Footer.jsx).
export default function RequisitesPage() {
  const [copied, setCopied] = useState(null);

  const copy = async (key, value) => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      // запасной путь, если буфер закрыт (http, не в фокусе): через скрытое поле
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      document.body.removeChild(ta);
    }
    if (!ok) return;
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
  };

  return (
    <section className="w-full px-6 py-12 sm:px-10">
      <div className="mx-auto max-w-4xl">
        <nav aria-label="Навигация" className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink/55">
          <Link to="/" className="transition-colors hover:text-[#9b2316]">Главная</Link>
          <span aria-hidden className="text-[#d4574a]">◆</span>
          <span className="text-[#9b2316]">Реквизиты собора</span>
        </nav>

        <h1 style={{ textTransform: "uppercase" }} className="font-slovic mt-6 text-4xl leading-none sm:text-5xl">
          <RevealWords text="Реквизиты собора" wordClassName={GOLD_TEXT} />
        </h1>

        {REQUISITE_SECTIONS.map((sec) => (
          <div key={sec.title} className="mt-10 rounded-[28px] border border-[#ece6e1] bg-[#ffffff] p-6 shadow-sm sm:p-10">
            <h2 style={{ textTransform: "none" }} className="font-serif-hero text-2xl text-[#7a1a10] sm:text-3xl">
              {sec.title}
            </h2>
            <div className="mt-3 flex items-center gap-3 text-[#d4574a]" aria-hidden>
              <span className="h-px flex-1 bg-gradient-to-r from-[#d4574a]/70 to-transparent" />
              <span className="text-[0.55rem]">◆</span>
            </div>

            <dl className="mt-2">
              {sec.rows.map((r) => (
                <div key={r.label} className="relative border-b border-[#9b2316]/20 py-5 last:border-b-0">
                  <dt className="text-[11px] uppercase tracking-[0.3em] text-[#9b2316]">{r.label}</dt>
                  <dd className="mt-2 min-h-[1.75rem]">
                    {r.value && (
                      <button
                        type="button"
                        onClick={() => copy(r.label, r.value)}
                        title="Нажмите, чтобы скопировать"
                        className={`copy-btn ${r.long ? "font-serif-hero text-xl leading-snug sm:text-2xl" : "text-2xl tabular-nums tracking-wide"} text-ink`}
                      >
                        <span className="copy-hl">{r.value}</span>
                      </button>
                    )}
                  </dd>
                  <span
                    role="status"
                    className={`pointer-events-none absolute right-0 top-4 rounded-full bg-[#9b2316] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white transition-all duration-300 ${
                      copied === r.label ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                    }`}
                  >
                    Скопировано
                  </span>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
