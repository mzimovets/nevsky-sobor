import { Link } from "react-router-dom";

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

// ru-RU для длинной даты сама добавляет "г." в конце ("24 сентября 2026 г.")
// — референс пользователя (скриншот) без него, срезаем.
export const formatNewsDate = (ms) =>
  ms ? new Date(ms).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }).replace(/\s*г\.$/, "") : "";

export const formatViewCount = (n) => (n || 0).toLocaleString("ru-RU");

// Кадрирование обложки — настраивается один раз на странице статьи
// (ImagePositioner.jsx) и применяется везде, где она показывается обрезанной
// (карточки тут, карусель, шапка статьи): objectPosition — какая точка
// картинки остаётся в кадре, --z — CSS-переменная с масштабом (используется
// в transform:scale(var(--z)) в className, а не тут в style, — чтобы можно
// было ещё чуть увеличивать при наведении курсора через group-hover, что
// одним style перекрыть было бы нельзя, см. использование ниже).
export const coverImageStyle = (item) => {
  const focus =
    item?.imageFocus && Number.isFinite(item.imageFocus.x) && Number.isFinite(item.imageFocus.y)
      ? item.imageFocus
      : { x: 50, y: 50 };
  const zoom = Number.isFinite(item?.imageZoom) ? item.imageZoom : 1;
  return { objectPosition: `${focus.x}% ${focus.y}%`, transformOrigin: `${focus.x}% ${focus.y}%`, "--z": zoom };
};

export const excerptOfHtml = (html, len = 140) => {
  if (!html) return "";
  const text = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > len ? `${text.slice(0, len).trimEnd()}…` : text;
};

// Карточка новости — картинка сверху (при наведении чуть увеличивается —
// group-hover:scale, обрезана контейнером с overflow-hidden), снизу белая
// панель: дата + иконка-глаз со счётчиком просмотров, заголовок, и на
// hover — выезжающее превью начала текста (max-h 0→24 + opacity, а не
// display:none/block — чтобы плавно, а не рывком). Ссылка на страницу
// статьи (см. App.jsx: /news/:id, NewsArticlePage.jsx), не модалка — цель
// пользователя была именно отдельная полноценная страница. large — крупный
// вариант для «витринных» карточек (первые на /news и тизер на главной, см.
// NewsPage.jsx/NewsSection.jsx), обычный — для остальных в сетке.
const GOLD_TEXT = "bg-gradient-to-b from-[#c0392b] to-[#7a1a10] bg-clip-text text-transparent";

// Золотое пятно рамки и лёгкий наклон следуют за курсором (стили .dwrap/.dcard
// в theme.css — те же, что у карточек расписания).
const onCardMove = (e, k = 4) => {
  const card = e.currentTarget.firstElementChild;
  const r = card.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  card.style.setProperty("--mx", `${x}px`);
  card.style.setProperty("--my", `${y}px`);
  card.style.setProperty("--ry", `${(x / r.width - 0.5) * k}deg`);
  card.style.setProperty("--rx", `${-(y / r.height - 0.5) * k}deg`);
};

export default function NewsCard({ item, large = false }) {
  return (
    <div className="dwrap h-full" onPointerMove={onCardMove}>
      <Link
        to={`/news/${item._id}`}
        className="dcard group relative flex h-full flex-col rounded-[18px] border border-[#ece6e1] bg-white p-2.5"
      >
        <span aria-hidden className="dlayer" />
        <div className={`relative overflow-hidden rounded-[12px] bg-cream ${large ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt=""
              style={coverImageStyle(item)}
              className="h-full w-full object-cover [transform:scale(var(--z))] transition-transform duration-500 ease-out group-hover:[transform:scale(calc(var(--z)*1.05))]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="font-serif-hero text-2xl text-[#9b2316]/50">Собор</span>
            </div>
          )}
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[12px] ring-1 ring-inset ring-[#9b2316]/20" />
        </div>

        <div className="flex flex-1 flex-col px-3 pb-3 pt-4">
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-[#9b2316]">
            <span>{formatNewsDate(item.publishedAt)}</span>
            <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-[#d4574a]/60 to-transparent" />
            <span className="flex items-center gap-1 tracking-normal text-ink/50">
              <EyeIcon /> {formatViewCount(item.viewCount)}
            </span>
          </div>
          <p className={`font-serif-hero mt-3 leading-tight ${GOLD_TEXT} ${large ? "text-[1.7rem]" : "text-xl"}`}>{item.title}</p>
          {item.body && (
            <p className="excerpt-reveal mt-0 max-h-0 overflow-hidden text-sm leading-relaxed text-ink/65 opacity-0 transition-all duration-300 ease-out group-hover:mt-2 group-hover:max-h-24 group-hover:opacity-100">
              {excerptOfHtml(item.body)}
            </p>
          )}
        </div>
      </Link>
    </div>
  );
}
