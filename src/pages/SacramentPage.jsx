import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { RevealWords, Eyebrow } from "../components/Reveal.jsx";

const GOLD_TEXT = "bg-gradient-to-b from-[#c0392b] to-[#7a1a10] bg-clip-text text-transparent";

const Cross = ({ className = "" }) => (
  <img src="/ornaments/cross.webp" alt="" aria-hidden width="18" height="18" draggable={false} className={`pointer-events-none select-none ${className}`} />
);

const Arrow = ({ dir = "right" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className={dir === "left" ? "rotate-180" : ""}>
    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// «ШАГ N» в рамке с завитками по бокам, как в брошюре
const StepBadge = ({ n }) => (
  <span className="inline-flex items-center gap-3 text-[#9b2316]" aria-hidden>
    <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#d4574a]/80 sm:w-14" />
    <span className="text-[0.55rem]">◇</span>
    <span className="rounded-md border border-[#9b2316]/60 bg-white px-4 py-1 font-serif-hero text-sm font-semibold uppercase tracking-[0.18em] shadow-sm">Шаг {n}</span>
    <span className="text-[0.55rem]">◇</span>
    <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#d4574a]/80 sm:w-14" />
  </span>
);

function Bullets({ items, className = "" }) {
  return (
    <ul className={`flex flex-col gap-3 ${className}`}>
      {items.map((t) => (
        <li key={t} className="flex gap-3 leading-relaxed">
          <Cross className="mt-[0.4rem] h-3 w-3 shrink-0" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Step({ step }) {
  return (
    <article className="step-in">
      <div className={`relative overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_24px_50px_-40px_rgba(70,20,14,0.6)] border-[#ece6e1]`}>
        <span aria-hidden className="font-slovic pointer-events-none absolute -right-2 -top-6 select-none text-[11rem] leading-none text-[#9b2316]/[0.06] sm:text-[15rem]">
          {step.n}
        </span>
        <div className="relative px-6 pb-7 pt-8 sm:px-12 sm:pb-9 sm:pt-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <StepBadge n={step.n} />
          </div>
          <p className="mt-6 text-[0.6875rem] uppercase tracking-[0.3em] text-[#9b2316]/80">{step.lead}</p>
          <h2 style={{ textTransform: "none" }} className="font-slovic mt-2 text-3xl leading-tight text-ink sm:text-5xl">{step.title}</h2>
          {step.intro && <p className="font-serif-hero mt-6 text-[1.18rem] leading-relaxed text-ink sm:text-[1.3rem]">{step.intro}</p>}
          <Bullets items={step.bullets} className={`font-serif-hero ${step.intro ? "mt-4" : "mt-6"} text-[1.18rem] text-ink sm:text-[1.3rem]`} />
        </div>

        {/* бордовая часть разворота брошюры: подробности всегда на виду */}
        <div className="relative bg-gradient-to-br from-[#7a1a10] via-[#6a1710] to-[#4a0f0a] px-3 pb-3 pt-6 sm:px-6 sm:pb-6 sm:pt-8">
          <h3 style={{ textTransform: "none" }} className="font-serif-hero px-3 text-xl leading-snug text-[#f3e3dc] sm:text-2xl">{step.detailsTitle}</h3>
          <div className="mt-4 rounded-[1.25rem] bg-white px-5 py-6 text-ink sm:px-8 sm:py-8">
            <div className="flex flex-col gap-6">
              {step.details.map((d, i) => (
                <div key={i}>
                  {d.title && <h4 style={{ textTransform: "none" }} className="font-serif-hero mb-3 text-lg font-semibold leading-snug text-[#7a1a10] sm:text-xl">{d.title}</h4>}
                  {d.text && <p className="leading-relaxed">{d.text}</p>}
                  {d.items && <Bullets items={d.items} />}
                  {d.qa && (
                    <div className="flex flex-col gap-5">
                      {d.qa.map((x) => (
                        <p key={x.q} className="leading-relaxed">
                          <strong className="font-semibold text-ink">{x.q}</strong> {x.a}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

// Страница таинства Причащения: «Подготовка ко Причастию» по брошюре собора —
// пять шагов, по одной карточке; листаются кнопками «Назад» / «Далее».
export default function SacramentPage({ data }) {
  const steps = data.steps;
  const [cur, setCur] = useState(1);
  const topRef = useRef(null);

  const go = (n) => {
    setCur(Math.max(1, Math.min(steps.length, n)));
    // после смены шага возвращаем начало карточки в поле зрения
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const step = steps[cur - 1];

  return (
    <div className="w-full px-4 pb-20 pt-8 sm:px-8">
      <div className="mx-auto max-w-[78rem]">
        <nav aria-label="Навигация" className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink/55">
          <Link to="/" className="transition-colors hover:text-[#9b2316]">Главная</Link>
          <span aria-hidden className="text-[#d4574a]">◆</span>
          <Link to="/#sacraments" className="transition-colors hover:text-[#9b2316]">Таинства</Link>
          <span aria-hidden className="text-[#d4574a]">◆</span>
          <span className="text-[#9b2316]">{data.crumb}</span>
        </nav>

        <header className="relative mt-6 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#4a0f0a] via-[#7a1a10] to-[#2c0f0c] px-6 py-12 text-[#f5ebe6] sm:px-14 sm:py-16">
          <img src="/ornaments/corner.webp" alt="" aria-hidden draggable={false} className="pointer-events-none absolute -bottom-6 -right-6 w-48 select-none opacity-25 sm:w-72" />
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.35" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute -right-6 top-1/2 h-[26rem] w-[26rem] -translate-y-1/2 text-white/[0.08] sm:right-10">
            <path d={data.heroIcon} />
          </svg>
          <div className="relative max-w-3xl">
            <Eyebrow className="flex items-center gap-4 text-xs uppercase text-[#e8a79e]">
              <span aria-hidden className="eb-dot">◇</span>
              {data.eyebrow}
            </Eyebrow>
            <h1 style={{ textTransform: "none" }} className="font-slovic mt-5 text-5xl leading-[0.98] sm:text-7xl">
              <RevealWords key={data.slug} text={data.title} wordClassName="text-[#f3dfc2]" />
            </h1>
            <p className="font-serif-hero mt-7 text-xl leading-relaxed text-[#f5ebe6]/90 sm:text-[1.4rem]">{data.intro}</p>
            <blockquote className="mt-8 border-l-2 border-[#e8a79e]/70 pl-5 text-[#f5ebe6]/75">
              <p className="font-serif-hero text-base italic leading-relaxed sm:text-lg">{data.verse}</p>
              <footer className="mt-2 text-xs uppercase tracking-[0.24em] text-[#e8a79e]">{data.verseRef}</footer>
            </blockquote>
            {data.extra && (
              <blockquote className="mt-6 border-l-2 border-[#e8a79e]/70 pl-5 text-[#f5ebe6]/75">
                <p className="font-serif-hero text-base italic leading-relaxed sm:text-lg">{data.extra.text}</p>
                <footer className="mt-2 text-xs uppercase tracking-[0.24em] text-[#e8a79e]">{data.extra.ref}</footer>
              </blockquote>
            )}
          </div>
        </header>

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
          <aside className="lg:self-start">
            <ol className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
              {steps.map((s) => {
                const on = cur === s.n;
                return (
                  <li key={s.n} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => go(s.n)}
                      aria-current={on ? "step" : undefined}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-300 ${
                        on ? "border-[#9b2316] bg-[#9b2316] text-white shadow-[0_10px_24px_-12px_rgba(122,26,16,0.8)]" : "border-[#ece6e1] bg-white text-ink/75 hover:border-[#b8453a]"
                      }`}
                    >
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm ${on ? "border-white/60" : "border-[#9b2316]/40 text-[#9b2316]"}`}>
                        <span className="font-serif-hero">{s.n}</span>
                      </span>
                      <span className="font-serif-hero whitespace-nowrap text-[0.95rem] leading-tight lg:whitespace-normal">{s.title}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>

          <div className="flex flex-col gap-8">
            <div ref={topRef} className="scroll-mt-28">
              <Step key={`${data.slug}-${cur}`} step={step} />
            </div>

            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => go(cur - 1)}
                disabled={cur === 1}
                className="inline-flex h-12 cursor-pointer items-center gap-2.5 rounded-full border border-[#9b2316]/40 px-6 text-[0.6875rem] uppercase tracking-[0.2em] text-[#9b2316] transition-colors hover:bg-[#9b2316] hover:text-white disabled:pointer-events-none disabled:opacity-30"
              >
                <Arrow dir="left" /> Назад
              </button>
              <span className="text-[0.6875rem] uppercase tracking-[0.24em] text-ink/50">Шаг {cur} из {steps.length}</span>
              <button
                type="button"
                onClick={() => go(cur + 1)}
                disabled={cur === steps.length}
                className="shimmer-gold inline-flex h-12 cursor-pointer items-center gap-2.5 rounded-full px-7 text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-white shadow-lg transition-opacity disabled:pointer-events-none disabled:opacity-30"
              >
                Далее <Arrow />
              </button>
            </div>

            <section className="relative overflow-hidden rounded-[1.75rem] border border-[#e3d6cf] bg-gradient-to-r from-[#f6e8e5] via-[#fbf4f2] to-white px-6 py-9 sm:px-12">
              <Cross className="absolute left-4 top-4 h-4 w-4" />
              <Cross className="absolute right-4 top-4 h-4 w-4" />
              <h2 style={{ textTransform: "none" }} className={`font-slovic text-3xl leading-tight sm:text-4xl ${GOLD_TEXT}`}>Остались вопросы?</h2>
              <p className="font-serif-hero mt-3 max-w-2xl text-lg leading-relaxed text-ink/80">
                Меру подготовки лучше всего уточнить у священника. Кафедральный собор святого благоверного князя Александра Невского, г. Волгоград, Александровский сад.
              </p>
              <a href="tel:+79965109090" className="mt-6 inline-flex h-12 items-center rounded-full border border-[#9b2316]/60 px-7 text-sm tracking-[0.1em] text-[#9b2316] transition-colors hover:bg-[#9b2316] hover:text-white">
                +7 (996) 510 90 90
              </a>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
