import { Link } from "react-router-dom";
import { RevealWords } from "../components/Reveal.jsx";
import { ARCHBISHOP, PRIESTS, DEACONS } from "../lib/clergy.js";

const GOLD_TEXT = "bg-gradient-to-b from-[#c0392b] to-[#7a1a10] bg-clip-text text-transparent";

const Cross = ({ className = "" }) => (
  <img src="/ornaments/cross.webp" alt="" aria-hidden width="18" height="18" draggable={false} className={`pointer-events-none h-3.5 w-3.5 select-none sm:h-[1.125rem] sm:w-[1.125rem] ${className}`} />
);

// карточка в рамке с крестиками по углам
const Frame = ({ className = "", children }) => (
  <div className={`relative rounded-[10px] border border-[#c0392b]/70 bg-white/55 ${className}`}>
    <Cross className="absolute left-2 top-2" />
    <Cross className="absolute right-2 top-2" />
    <Cross className="absolute bottom-2 left-2" />
    <Cross className="absolute bottom-2 right-2" />
    {children}
  </div>
);

// фото в арочной рамке: красная линия, белая полоса, затем фото; без файла — силуэт
const Portrait = ({ photo, name, className = "" }) => (
  <div className={`shrink-0 rounded-t-[999px] rounded-b-md border-2 border-[#b3261a]/80 bg-white p-[3px] ${className}`}>
    <div className="h-full w-full overflow-hidden rounded-t-[999px] rounded-b-[3px] bg-[#efe6df]">
      {photo ? (
        <img src={photo} alt={name} loading="lazy" className="h-full w-full object-cover object-top" />
      ) : (
        <svg viewBox="0 0 100 130" className="h-full w-full text-[#d9c9bf]" aria-hidden>
          <circle cx="50" cy="48" r="20" fill="currentColor" />
          <path d="M8 130c0-28 18-46 42-46s42 18 42 46z" fill="currentColor" />
        </svg>
      )}
    </div>
  </div>
);

const Divider = () => (
  <span className="flex w-full items-center gap-2 text-[#b3261a]" aria-hidden>
    <span className="h-px flex-1 bg-current opacity-70" />
    <Cross />
    <span className="h-px flex-1 bg-current opacity-70" />
  </span>
);

// Раскладка карточки зависит от её собственной ширины (@container): широкая —
// фото слева, текст справа; узкая — фото сверху, текст под ним по центру.
const Card = ({ p, className = "" }) => (
  <div className={`@container ${className}`}>
    <Frame className="flex flex-col items-center gap-4 px-6 py-7 @[20rem]:flex-row @[20rem]:gap-5">
      <Portrait photo={p.photo} name={p.name} className="h-36 w-28 @[20rem]:h-32 @[20rem]:w-24" />
      <div className="font-serif-hero flex min-w-0 flex-1 flex-col items-center text-center text-[#7a1a10]">
        <div className="text-sm">{p.rank}</div>
        <div className="text-lg leading-tight">{p.name}</div>
        {p.role && (
          <div className="mt-3 flex w-full max-w-[11rem] flex-col items-center gap-2">
            <Divider />
            <div className="whitespace-nowrap pl-[0.2em] text-[0.625rem] uppercase tracking-[0.2em]">{p.role}</div>
          </div>
        )}
      </div>
    </Frame>
  </div>
);

const Heading = ({ children }) => (
  <div className="mt-12 flex items-center gap-4 text-[#9b2316]">
    <span className="h-px flex-1 bg-current opacity-50" />
    <h2 style={{ textTransform: "uppercase" }} className="font-serif-hero text-xl tracking-wide sm:text-2xl">
      <Cross className="mr-3 inline-block align-[-2px]" />
      {children}
      <Cross className="ml-3 inline-block align-[-2px]" />
    </h2>
    <span className="h-px flex-1 bg-current opacity-50" />
  </div>
);

export default function ClergyPage() {
  return (
    <section className="w-full px-6 py-12 sm:px-10">
      <div className="mx-auto max-w-[88rem]">
        <nav aria-label="Навигация" className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink/55">
          <Link to="/" className="transition-colors hover:text-[#9b2316]">Главная</Link>
          <span aria-hidden className="text-[#d4574a]">◆</span>
          <span className="text-[#9b2316]">Духовенство</span>
        </nav>

        <h1 style={{ textTransform: "uppercase" }} className="font-slovic mt-6 text-center text-4xl leading-none sm:text-6xl">
          <RevealWords text="Духовенство собора" wordClassName={GOLD_TEXT} />
        </h1>

        <Frame className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-5 p-6 sm:flex-row sm:gap-8 sm:p-8 md:pl-14 lg:gap-12 lg:pl-24 lg:pr-16">
          <Portrait photo={ARCHBISHOP.photo} name={ARCHBISHOP.name} className="h-52 w-40 sm:h-56 sm:w-44" />
          <div className="font-serif-hero text-center text-[#7a1a10] sm:text-left">
            <div className="text-2xl sm:text-3xl">{ARCHBISHOP.rank}</div>
            <div className="text-lg sm:text-xl">{ARCHBISHOP.rankNote}</div>
            <div style={{ textTransform: "none" }} className="font-slovic mt-1 text-4xl sm:text-5xl">{ARCHBISHOP.name}</div>
            <div className="mt-3 mx-auto flex w-fit flex-col items-center gap-3 sm:mx-0">
              <Divider />
              <div className="pl-[0.3em] text-xs uppercase tracking-[0.3em]">{ARCHBISHOP.role}</div>
            </div>
          </div>
        </Frame>

        <Heading>Священники</Heading>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PRIESTS.map((p) => <Card key={p.name} p={p} />)}
        </div>

        <Heading>Диаконы</Heading>
        <div className="mx-auto mt-6 flex max-w-5xl flex-wrap justify-center gap-4">
          {DEACONS.map((p) => <Card key={p.name} p={p} className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.7rem)]" />)}
        </div>
      </div>
    </section>
  );
}
