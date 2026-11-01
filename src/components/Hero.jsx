import { Link } from "react-router-dom";
import { smoothScrollToId } from "../lib/smoothScroll.js";

const PinIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
    <path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

const ClockIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2.5" strokeLinecap="round" />
  </svg>
);
const PhoneIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
    <path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
  </svg>
);
const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
  </svg>
);

// Часы работы — временное значение, заменить на настоящее.
const INFO = [
  { label: "Режим работы", value: "Ежедневно, 7:00 — 19:00", icon: <ClockIcon /> },
  {
    label: "Адрес",
    value: "Волгоград, пл. Павших Борцов, 9",
    icon: <PinIcon />,
    anchor: "contacts",
  },
  { label: "Телефон", value: "+7 996 510 90 90", icon: <PhoneIcon />, tel: "+79965109090" },
];

// Декоративный крест на разделителях панели — контурный, с белой серединой
// (public/ornaments/cross-outline.webp).
const CrossMark = () => (
  <img src="/ornaments/cross-outline.webp" alt="" aria-hidden width="22" height="22" className="block h-[22px] w-[22px] select-none" draggable={false} />
);

export default function Hero() {
  return (
    <section id="hero" className="relative flex min-h-[640px] flex-col overflow-hidden bg-[#e9f1fa] text-ink md:h-[min(100svh,860px)]">
      <img
        src="/hero.webp"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[72%_center] md:object-right"
      />
      {/* на телефоне собор занимает почти весь кадр — слева светлая вуаль под текст */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/75 via-white/30 to-transparent md:hidden" aria-hidden />

      <div className="relative mx-auto flex w-[94%] flex-1 flex-col justify-center pb-10 pt-32">
        <h1 className="font-slovic bg-gradient-to-b from-[#c0392b] to-[#7a1a10] bg-clip-text text-5xl font-medium leading-[1.02] text-transparent sm:text-6xl md:text-[4.25rem]">
          Собор
          <br />
          Александра Невского
        </h1>
        <p className="mt-5 text-sm uppercase tracking-[0.4em] text-ink/70">Волгоград</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/about" className="shimmer-gold h-12 rounded-full px-8 text-xs uppercase tracking-[0.2em] text-white shadow-lg inline-flex items-center">
            О соборе
          </Link>
          {/* Не уводит на отдельную страницу, а плавно листает вниз к блоку
              расписания на главной (с отступом под фиксированную шапку). */}
          <button type="button" onClick={() => smoothScrollToId("schedule", { offset: 96 })} className="flex h-12 items-center gap-2.5 rounded-full border border-[#9b2316]/60 bg-white/60 px-7 text-xs uppercase tracking-[0.2em] text-[#9b2316] backdrop-blur transition-colors hover:bg-[#9b2316] hover:text-white">
            <CalendarIcon /> Расписание
          </button>
        </div>
      </div>

      <div className="relative mx-auto mb-6 grid w-[94%] grid-cols-1 notched gold-frame bg-white/92 backdrop-blur-md sm:mb-8 sm:grid-cols-3" style={{ "--notch": "14px" }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
          e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
        }}
      >
        {INFO.map((item, i) => {
          const body = (
            <>
              <span className="text-[#9b2316] transition-colors group-hover:text-[#7a1a10]">{item.icon}</span>
              <span className="mt-3 block text-xs uppercase tracking-[0.2em] text-[#9b2316] transition-colors group-hover:text-[#7a1a10]">
                {item.label}
              </span>
              <span className="mt-2 block text-sm text-ink/90 transition-colors group-hover:text-ink">{item.value}</span>
            </>
          );
          const cls = `group relative block px-8 py-6 sm:py-7 ${i > 0 ? "border-t border-[#9b2316]/15 sm:border-t-0" : ""}`;
          // Разделитель между блоками: тонкая линия с разрывом посередине и
          // небольшим крестом-«звёздочкой» на месте разрыва (как на макете).
          const divider =
            i > 0 ? (
              <>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 hidden w-px bg-[#9b2316]/20 sm:block [mask-image:linear-gradient(to_bottom,#000_0,#000_calc(50%-16px),transparent_calc(50%-16px),transparent_calc(50%+16px),#000_calc(50%+16px),#000_100%)]"
                />
                <span aria-hidden className="pointer-events-none absolute left-0 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 sm:block">
                  <CrossMark />
                </span>
              </>
            ) : null;
          if (item.anchor)
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => smoothScrollToId(item.anchor)}
                className={`${cls} w-full cursor-pointer text-left`}
              >
                {divider}
                {body}
              </button>
            );
          if (item.tel) return <a key={item.label} href={`tel:${item.tel}`} className={cls}>{divider}{body}</a>;
          if (item.href)
            return <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className={cls}>{divider}{body}</a>;
          return <div key={item.label} className={cls}>{divider}{body}</div>;
        })}
      </div>
    </section>
  );
}
