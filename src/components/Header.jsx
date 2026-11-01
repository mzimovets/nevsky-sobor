import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@heroui/react";

const NAV = [
  { to: "/about", label: "О соборе" },
  { to: "/schedule", label: "Расписание" },
  { to: "/announcements", label: "Объявления" },
  { to: "/news", label: "Новости" },
];

const CathedralIcon = () => (
  <svg width="38" height="44" viewBox="0 0 38 44" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
    <path d="M19 1v5M17 3h4" strokeLinecap="round" />
    <path d="M10 16c0-6 4-9 9-9s9 3 9 9" />
    <path d="M7 16h24M9 16v22M29 16v22M5 38h28M5 42h28M14 38V26a5 5 0 0 1 10 0v12M3 26c0-4 2-6 4-6M35 26c0-4-2-6-4-6" strokeLinecap="round" />
  </svg>
);

const BurgerIcon = ({ open }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const linkClass = (solid) => ({ isActive }) =>
  `text-sm tracking-wide transition-colors duration-300 ${
    solid
      ? `hover:text-[#9b2316] ${isActive ? "text-[#9b2316]" : "text-ink/75"}`
      : `hover:text-[#9b2316] ${isActive ? "text-[#9b2316]" : "text-ink/80"}`
  }`;

// Шапка всегда на экране (при прокрутке остаётся сверху). На главной, пока
// она в самом верху поверх фото-хиро, — прозрачная; как только начата
// прокрутка — плавно становится белой с тонкой линией снизу. На остальных страницах
// (светлый фон) сразу белая.
export default function Header() {
  const { pathname } = useLocation();
  const home = pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const solid = !home || pastHero;

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!home) {
      setPastHero(false);
      return undefined;
    }
    const onScroll = () => {
      // после небольшой прокрутки (40px) шапка плавно становится белой
      setPastHero(window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [home]);

  const nav = linkClass(solid);

  return (
    <header
      className={`inset-x-0 top-0 z-30 transition-colors duration-300 ease-out ${home ? "fixed" : "sticky"} ${"text-ink"}`}
    >
      {/* подложка шапки: плавно проявляется/гаснет вместе с размытием и линией */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 border-b border-[#ece6e1] bg-white/95 shadow-[0_6px_20px_-14px_rgba(70,20,14,0.5)] backdrop-blur transition-[opacity,transform] duration-300 ease-out ${
          solid ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
        }`}
      />
      <div className="relative mx-auto flex w-[94%] items-center justify-between gap-6 py-4 sm:py-5">
        <NavLink to="/" className="flex items-center gap-3">
          <span className="text-[#9b2316]"><CathedralIcon /></span>
          <span className={`font-serif-hero leading-tight transition-colors duration-300 ${solid ? "text-ink" : "text-[#8a1f14]"}`}>
            <span className="block text-lg sm:text-xl">Собор</span>
            <span className="block text-lg sm:text-xl">Александра Невского</span>
            <span className={`mt-0.5 block text-[10px] uppercase tracking-[0.25em] transition-colors duration-500 ${"text-[#9b2316]"}`}>Волгоград</span>
          </span>
        </NavLink>

        <nav className="hidden items-center gap-9 md:flex">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={nav}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Button
          isIconOnly
          variant="ghost"
          aria-label="Меню"
          className="text-ink md:hidden"
          onPress={() => setMenuOpen((v) => !v)}
        >
          <BurgerIcon open={menuOpen} />
        </Button>
      </div>

      {menuOpen && (
        <nav className={`relative mx-4 mb-3 flex flex-col gap-1 rounded-2xl p-3 backdrop-blur md:hidden ${solid ? "border border-[#ece6e1] bg-white" : "bg-maroon/95"}`}>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={(st) => `rounded-xl px-3 py-2.5 ${nav(st)}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
