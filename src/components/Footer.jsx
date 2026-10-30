import { Link } from "react-router-dom";
import { Eyebrow, RevealWords } from "./Reveal.jsx";
const SOCIALS = [
  { label: "ВКонтакте", href: "https://vk.ru/club211613236", icon: "vk" },
  { label: "Telegram", href: "https://t.me/nevskiy_sobor_vlg", icon: "tg" },
];

const ADDRESS = "Волгоград, пл. Павших Борцов, 9";
const q = encodeURIComponent(ADDRESS);

// Маршрут «от меня» до собора. Компьютер — Яндекс Карты, маршрут строится
// сам (пустое начало «~» = моё местоположение). Телефон — приложение карт:
// iPhone/iPad — Apple Карты, Android — Google Карты (приложение открывается
// по ссылке, маршрут строится из текущего места).
const ROUTE_DESKTOP = `https://yandex.ru/maps/?rtext=~${q}&rtt=auto`;
const isIOS = () =>
  /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroid = () => /Android/i.test(navigator.userAgent);
const routeUrl = () => {
  if (isIOS()) return `https://maps.apple.com/?daddr=${q}&dirflg=d`;
  if (isAndroid()) return `https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=driving`;
  return ROUTE_DESKTOP;
};
const onRouteClick = (e) => {
  if (isIOS() || isAndroid()) {
    e.preventDefault();
    window.location.href = routeUrl();
  }
};

// Контуры иконок — те же, что на sobormihailsochi.ru (viewBox 48×48).
const ICONS = {
  vk: { transform: "translate(24 24) scale(0.98) translate(-13.5 -16)", d: "M16.563 15.75c-0.5-0.188-0.5-0.906-0.531-1.406-0.125-1.781 0.5-4.5-0.25-5.656-0.531-0.688-3.094-0.625-4.656-0.531-0.438 0.063-0.969 0.156-1.344 0.344s-0.75 0.5-0.75 0.781c0 0.406 0.938 0.344 1.281 0.875 0.375 0.563 0.375 1.781 0.375 2.781 0 1.156-0.188 2.688-0.656 2.75-0.719 0.031-1.125-0.688-1.5-1.219-0.75-1.031-1.5-2.313-2.063-3.563-0.281-0.656-0.438-1.375-0.844-1.656-0.625-0.438-1.75-0.469-2.844-0.438-1 0.031-2.438-0.094-2.719 0.5-0.219 0.656 0.25 1.281 0.5 1.813 1.281 2.781 2.656 5.219 4.344 7.531 1.563 2.156 3.031 3.875 5.906 4.781 0.813 0.25 4.375 0.969 5.094 0 0.25-0.375 0.188-1.219 0.313-1.844s0.281-1.25 0.875-1.281c0.5-0.031 0.781 0.406 1.094 0.719 0.344 0.344 0.625 0.625 0.875 0.938 0.594 0.594 1.219 1.406 1.969 1.719 1.031 0.438 2.625 0.313 4.125 0.25 1.219-0.031 2.094-0.281 2.188-1 0.063-0.563-0.563-1.375-0.938-1.844-0.938-1.156-1.375-1.5-2.438-2.563-0.469-0.469-1.063-0.969-1.063-1.531-0.031-0.344 0.25-0.656 0.5-1 1.094-1.625 2.188-2.781 3.188-4.469 0.281-0.5 0.938-1.656 0.688-2.219-0.281-0.625-1.844-0.438-2.813-0.438-1.25 0-2.875-0.094-3.188 0.156-0.594 0.406-0.844 1.063-1.125 1.688-0.625 1.438-1.469 2.906-2.344 4-0.313 0.375-0.906 1.156-1.250 1.031z" },
  tg: { transform: "translate(24 24) scale(0.66) translate(-24 -24)", d: "M41.4193 7.30899C41.4193 7.30899 45.3046 5.79399 44.9808 9.47328C44.8729 10.9883 43.9016 16.2908 43.1461 22.0262L40.5559 39.0159C40.5559 39.0159 40.3401 41.5048 38.3974 41.9377C36.4547 42.3705 33.5408 40.4227 33.0011 39.9898C32.5694 39.6652 24.9068 34.7955 22.2086 32.4148C21.4531 31.7655 20.5897 30.4669 22.3165 28.9519L33.6487 18.1305C34.9438 16.8319 36.2389 13.8019 30.8426 17.4812L15.7331 27.7616C15.7331 27.7616 14.0063 28.8437 10.7686 27.8698L3.75342 25.7055C3.75342 25.7055 1.16321 24.0823 5.58815 22.459C16.3807 17.3729 29.6555 12.1786 41.4193 7.30899Z" },
};

const lineIcon = (d) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

// Часы работы — временное значение, заменить на настоящее.
const CONTACTS = [
  {
    label: "Адрес",
    value: ADDRESS,
    href: ROUTE_DESKTOP,
    onClick: onRouteClick,
    external: true,
    icon: lineIcon(
      <>
        <path d="M12 22s7-6.500 7-12a7 7 0 1 0-14 0c0 5.500 7 12 7 12Z" />
        <circle cx="12" cy="10" r="2.600" />
      </>
    ),
  },
  {
    label: "Телефон",
    value: "+7 996 510 90 90",
    href: "tel:+79965109090",
    icon: lineIcon(<path d="M5 3h4l2 5-2.500 1.500a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z" />),
  },
  {
    label: "Режим работы",
    value: "Ежедневно, 7:00 — 19:00",
    icon: lineIcon(
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.500 2" />
      </>
    ),
  },
];

const LINK_GROUPS = [
  {
    title: "Церковь и епархия",
    note: "Официальные новости и документы",
    links: [
      {
        label: "Волгоградская епархия",
        text: "Официальный сайт епархии: новости, приходы и объявления.",
        href: "https://volgeparhia.ru/",
        logo: "/links/volgeparhia.png",
        tint: ["#d6e0f5", "#e9e1d0"],
      },
      {
        label: "Патриархия.ru",
        text: "Сайт Русской Православной Церкви: новости, документы, слово Патриарха.",
        href: "https://patriarchia.ru/",
        logo: "/links/patriarchia.png",
        tint: ["#f4e2b0", "#eadbbd"],
      },
    ],
  },
  {
    title: "Богослужение",
    note: "Следить за службой и понимать её",
    links: [
      {
        label: "WebTypikon",
        text: "Полный текст службы на любой день года: удобно следить за богослужением.",
        href: "https://webtypikon.ru/",
        logo: "/links/webtypikon.svg",
        tint: ["#f6d3cb", "#ecdacd"],
      },
      {
        label: "Последование.рф",
        text: "Тексты богослужений по датам: можно следить за службой и читать вместе.",
        href: "https://xn--80adfddrquddgz.xn--p1ai/",
        logo: "/links/posledovanie.png",
        tint: ["#f2cbc4", "#ebd6cb"],
      },
    ],
  },
  {
    title: "Чтение и слово",
    note: "Для души и домашнего чтения",
    links: [
      {
        label: "Азбука веры",
        text: "Православная библиотека, молитвослов, календарь, жития святых.",
        href: "https://azbyka.ru/",
        logo: "/links/azbyka.svg",
        tint: ["#e8c0bd", "#e8d4c8"],
        scale: 0.9,
      },
      {
        label: "Радио ВЕРА",
        text: "Православное радио онлайн: беседы, проповеди и музыка.",
        href: "https://radiovera.ru/",
        logo: "/links/radiovera.png",
        tint: ["#c9e4f5", "#dfe2da"],
        scale: 0.95,
      },
    ],
  },
];

const YANDEX_MAP = "https://yandex.ru/map-widget/v1/?ol=biz&oid=116732981896&z=16&lang=ru_RU";
function MapCard({ title, src }) {
  return (
    <div className="rounded-[1.75rem] border border-[#ece6e1] bg-[#ffffff] p-1.5 shadow-sm">
      <div className="relative h-[480px] overflow-hidden rounded-[1.4rem] sm:h-[520px] lg:h-[560px]">
        <iframe
          title={title}
          src={src}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </div>
  );
}

const GOLD_TEXT =
  "bg-gradient-to-r from-[#9b2316] via-[#d4574a] to-[#7a5524] bg-clip-text text-transparent";

export default function Footer() {
  return (
    <footer>
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <linearGradient id="gold-icon" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f0a89f" />
            <stop offset="0.5" stopColor="#b8924d" />
            <stop offset="1" stopColor="#9b2316" />
          </linearGradient>
        </defs>
      </svg>

      <div className="mx-auto my-10 flex w-[94%] flex-col gap-10 rounded-[2rem] border border-[#ece6e1] bg-[#ffffff] px-8 py-10 shadow-sm sm:px-14 lg:flex-row lg:items-center lg:justify-between lg:py-14">
        <div>
          <Eyebrow className="flex items-center gap-4 text-xs uppercase text-[#9b2316]">
            <span aria-hidden className="eb-dot">◇</span>
            Подписывайтесь
            <span className="eb-line hidden h-px w-24 bg-gradient-to-r from-[#9b2316] to-transparent sm:block" aria-hidden />
          </Eyebrow>
          <h2 style={{ textTransform: "uppercase" }} className="font-slovic mt-5 text-4xl leading-tight sm:text-5xl lg:text-6xl">
            <RevealWords text="Мы в социальных сетях" wordClassName={GOLD_TEXT} />
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink/80">
            <RevealWords mode="wave" text="Следите за жизнью прихода и будьте в курсе последних новостей." />
          </p>
        </div>

        <div className="flex gap-6 sm:gap-10">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              aria-label={s.label}
              className="group flex flex-col items-center gap-4"
            >
              <span className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-[#b8453a]/40 bg-white shadow-[0_0_0_0_rgba(155,35,22,0)] transition-[box-shadow,border-color,background-color] duration-500 ease-out group-hover:border-transparent group-hover:bg-[#d4574a] group-hover:shadow-[0_24px_34px_-18px_rgba(155,35,22,0.65)] sm:h-24 sm:w-24">
                <span
                  className="absolute -inset-px rounded-full bg-[radial-gradient(circle_at_30%_25%,#f6c4bc,#d4574a_45%,#9b2316)] scale-0 opacity-0 transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-100 group-hover:opacity-100"
                  aria-hidden
                />
                <svg
                  viewBox="0 0 48 48"
                  className="relative h-[58%] w-[58%]"
                  aria-hidden="true"
                >
                  <path
                    transform={ICONS[s.icon].transform}
                    d={ICONS[s.icon].d}
                    fill="url(#gold-icon)"
                    className="transition-[fill] duration-500 group-hover:fill-white"
                  />
                </svg>
              </span>
              <span className="text-[11px] uppercase tracking-[0.25em] text-ink/70 transition-colors group-hover:text-[#9b2316]">
                {s.label}
              </span>
            </a>
          ))}
        </div>
      </div>

      <div id="contacts" className="mx-auto mb-12 grid w-[94%] gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
        <div>
          <Eyebrow className="flex items-center gap-4 text-xs uppercase text-[#9b2316]">
            <span aria-hidden className="eb-dot">◇</span>
            Как нас найти
            <span className="eb-line hidden h-px w-24 bg-gradient-to-r from-[#9b2316] to-transparent sm:block" aria-hidden />
          </Eyebrow>
          <h2 style={{ textTransform: "uppercase" }} className="font-slovic mt-4 text-5xl leading-none sm:text-6xl">
            <RevealWords text="Контакты" wordClassName={GOLD_TEXT} />
          </h2>

          <ul className="mt-8 border-t border-[#9b2316]/25">
            {CONTACTS.map((c) => {
              const body = (
                <>
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[#b8453a]/40 bg-white text-[#b8453a] transition-colors duration-500 group-hover:border-transparent group-hover:bg-[#d4574a] group-hover:text-white">
                    {c.icon}
                  </span>
                  <span>
                    <span className="block text-[11px] uppercase tracking-[0.25em] text-ink/55">{c.label}</span>
                    <span className={`mt-1.5 block text-lg text-ink transition-colors ${c.href ? "group-hover:text-[#9b2316]" : ""}`}>{c.value}</span>
                  </span>
                </>
              );
              const cls = "group flex items-center gap-5 border-b border-[#9b2316]/25 py-5";
              return (
                <li key={c.label}>
                  {c.href ? (
                    <a
                      href={c.href}
                      onClick={c.onClick}
                      {...(c.external ? { target: "_blank", rel: "noreferrer" } : {})}
                      className={`${cls} cursor-pointer`}
                    >
                      {body}
                    </a>
                  ) : (
                    <div className={cls}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <MapCard title="Собор Александра Невского на Яндекс Картах" src={YANDEX_MAP} />
      </div>

      <div className="mx-auto mb-14 w-[94%]">
        <Eyebrow className="flex items-center gap-4 text-xs uppercase text-[#9b2316]">
          <span aria-hidden className="eb-dot">◇</span>
          Православные ресурсы
          <span className="eb-line hidden h-px w-24 bg-gradient-to-r from-[#9b2316] to-transparent sm:block" aria-hidden />
        </Eyebrow>
        <h2 style={{ textTransform: "uppercase" }} className="font-slovic mt-4 text-5xl leading-none sm:text-6xl">
            <RevealWords text="Полезные ссылки" wordClassName={GOLD_TEXT} />
          </h2>

        <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-6 lg:gap-10">
          {LINK_GROUPS.map((g) => (
            <section key={g.title}>
              <div className="mb-4 border-b border-[#9b2316]/25 pb-3">
                <h3 style={{ textTransform: "none" }} className="font-serif-hero text-2xl text-[#7a1a10]">
                  <RevealWords text={g.title} />
                </h3>
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-ink/55">{g.note}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {g.links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    style={{ "--lc-a": l.tint[0], "--lc-b": l.tint[1] }}
                    className="lc lc-bg group relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-[#e3d6cf] p-4 transition-[border-color,box-shadow] duration-500 hover:border-[#d4574a] hover:shadow-[0_22px_40px_-22px_rgba(155,35,22,0.7)]"
                  >
                    <span
                      className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.6),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      aria-hidden
                    />
                    <span
                      className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-[transform,opacity] duration-1000 ease-out group-hover:translate-x-[400%] group-hover:opacity-100"
                      aria-hidden
                    />
                    <span
                      className="absolute right-3.5 top-3.5 text-base leading-none text-[#b8453a] opacity-0 transition-[opacity,transform] duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                      aria-hidden
                    >
                      ↗
                    </span>
                    <span className="lc-stage">
                      <span className="lc-logo relative grid h-24 w-24 place-items-center self-center sm:h-28 sm:w-28">
                        <img
                          src={l.logo}
                          alt={l.label}
                          style={{ transform: l.scale ? `scale(${l.scale})` : undefined }}
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                      </span>
                    </span>
                    <span className="lc-text relative">
                      <span className="block text-[12px] font-semibold uppercase leading-snug tracking-[0.08em] text-[#7a1a10]">{l.label}</span>
                      <span className="mx-auto mt-2 block h-px w-10 bg-gradient-to-r from-transparent via-[#d4574a] to-transparent" aria-hidden />
                      <span className="mt-2 block text-[12.5px] leading-snug text-ink/75">{l.text}</span>
                    </span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden bg-slate px-6 py-12 text-center sm:px-10">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4574a]/70 to-transparent" />
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-center gap-4 text-[#d4574a]" aria-hidden>
            <span className="h-px w-14 bg-gradient-to-r from-transparent to-[#d4574a]/70" />
            <span className="text-[0.6rem]">◆</span>
            <span className="h-px w-14 bg-gradient-to-l from-transparent to-[#d4574a]/70" />
          </div>
          <Link
            to="/requisites"
            onClick={() => window.scrollTo({ top: 0 })}
            className="mt-7 inline-flex h-12 items-center rounded-full border border-[#d4574a]/60 px-8 text-xs uppercase tracking-[0.25em] text-[#f0a89f] transition-colors hover:border-transparent hover:bg-[#d4574a] hover:text-white"
          >
            Реквизиты собора
          </Link>
          <p className="mt-10 text-xs uppercase tracking-[0.25em] text-white/45">
            © {new Date().getFullYear()} · Собор Александра Невского · Волгоград
          </p>
        </div>
      </div>
    </footer>
  );
}
