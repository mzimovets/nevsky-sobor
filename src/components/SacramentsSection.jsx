import { Link } from "react-router-dom";
import { RevealWords, Eyebrow, useInView } from "./Reveal.jsx";
import { SACRAMENTS } from "../lib/sacraments.js";

const GOLD_TEXT = "bg-gradient-to-b from-[#c0392b] to-[#7a1a10] bg-clip-text text-transparent";

const ICONS = {
  water: <path d="M12 3c3.6 4.2 6 7.2 6 10.3a6 6 0 0 1-12 0C6 10.2 8.4 7.2 12 3Zm-2.4 10.6a2.8 2.8 0 0 0 2.4 2.7" />,
  chalice: <path d="M7 4h10c0 4.2-1.6 7-5 7S7 8.2 7 4Zm5 7v5m-4 4h8m-6-4h4M9.5 7h5" />,
  scroll: <path d="M7 4h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 1-1.7M9 9h6M9 13h6M9 17h3" />,
  rings: <path d="M9.5 8.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm5 0a5 5 0 1 1 0 10m-8.2-9.2L8 5l1.5 2M14 5l1.5-1.5L17 5" />,
  oil: <path d="M8 20h8m-9-4h10l-1.4-5H8.4L7 16Zm5-5V8m0-4c1.6 1.6 2 2.8 0 4-2-1.2-1.6-2.4 0-4Z" />,
};

const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full" aria-hidden>
    {ICONS[name]}
  </svg>
);

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

function Card({ s, i, seen }) {
  const live = Boolean(s.href);
  const cls = `sacr-card group relative flex flex-col items-center rounded-t-[999px] rounded-b-[1.125rem] px-5 pb-7 pt-10 text-center ${
    live ? "sacr-card-live cursor-pointer" : "cursor-default"
  } ${seen ? "is-in" : ""}`;
  const body = (
    <>
      <span className="sacr-icon grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full border border-[#9b2316]/25 bg-white p-4 text-[#9b2316]">
        <Icon name={s.icon} />
      </span>
      <span className="mt-5 text-[0.625rem] uppercase tracking-[0.34em] text-[#9b2316]">Таинство {s.num}</span>
      <h3 style={{ textTransform: "none" }} className="font-serif-hero mt-2 text-[1.45rem] leading-[1.12] text-ink">{s.title}</h3>
      <p className="mt-3 text-[0.9rem] leading-relaxed text-ink/65">{s.text}</p>
      <span className="mt-auto pt-6">
        {live ? (
          <span className="grid h-10 w-10 place-items-center rounded-full border border-[#9b2316]/40 text-[#9b2316] transition-all duration-300 group-hover:border-[#9b2316] group-hover:bg-[#9b2316] group-hover:text-white">
            <Arrow />
          </span>
        ) : (
          <span className="rounded-full border border-ink/15 px-3 py-1 text-[0.625rem] uppercase tracking-[0.22em] text-ink/40">Скоро</span>
        )}
      </span>
    </>
  );
  const style = { transitionDelay: `${i * 90}ms` };
  return live ? (
    <Link to={s.href} className={cls} style={style}>{body}</Link>
  ) : (
    <div className={cls} style={style}>{body}</div>
  );
}

// Раздел «Таинства» на главной в стиле sobormihailsochi.ru: арочные карточки.
export default function SacramentsSection() {
  const [ref, seen] = useInView();
  return (
    <section id="sacraments" className="relative w-full overflow-hidden bg-[#f7f1ed] px-6 py-20 sm:px-10 sm:py-24">
      <span aria-hidden className="font-serif-hero pointer-events-none absolute -left-[4%] top-4 select-none whitespace-nowrap text-[min(22vw,22rem)] leading-none text-[#9b2316]/[0.045]">
        Таинства
      </span>
      <div className="relative mx-auto max-w-[88rem]">
        <Eyebrow className="flex items-center gap-4 text-xs uppercase text-[#9b2316]">
          <span aria-hidden className="eb-dot">◇</span>
          Духовная жизнь
        </Eyebrow>
        <h2 style={{ textTransform: "uppercase" }} className="font-slovic mt-4 max-w-3xl text-4xl leading-none sm:text-6xl">
          <RevealWords text="Таинства Православной Церкви" wordClassName={GOLD_TEXT} />
        </h2>
        <div ref={ref} className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {SACRAMENTS.map((s, i) => (
            <Card key={s.title} s={s} i={i} seen={seen} />
          ))}
        </div>
      </div>
    </section>
  );
}
