import { Eyebrow, RevealWords } from "./Reveal.jsx";
import { Link } from "react-router-dom";
import { useNews } from "../lib/useNews.js";
import NewsCard from "./NewsCard.jsx";

const LATEST_COUNT = 3;
const GOLD_TEXT = "bg-gradient-to-b from-[#c0392b] to-[#7a1a10] bg-clip-text text-transparent";

// Раздел «Новости» на главной, ниже «Расписание» (см. Home.jsx) — только
// несколько последних новостей (LATEST_COUNT), без управления (добавление/
// редактирование/удаление — только на отдельной странице /news, см.
// NewsPage.jsx/NewsArticlePage.jsx; та же логика уже применена к
// объявлениям — админку с главной убрали). Фон секции — bg-cream (theme.css),
// чуть светлее/холоднее окружающего paper, чтобы раздел выделялся на
// главной, а не сливался с соседними (просили явно). Карточки — те же, что
// и в сетке /news (NewsCard, large-вариант), ведут прямо на страницу статьи.
export default function NewsSection() {
  const { loading, items } = useNews();

  // Пока новостей ни одной нет — раздел просто не показываем (не нужен
  // отдельный «пусто» на тизере главной, в отличие от полной страницы).
  if (loading || items.length === 0) return null;

  const latest = items.slice(0, LATEST_COUNT);

  return (
    <section className="w-full px-6 py-12 sm:px-10">
      <div className="mx-auto max-w-[1700px]">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <Eyebrow className="text-xs uppercase text-[#9b2316]">Жизнь собора</Eyebrow>
            <h2 style={{ textTransform: "uppercase" }} className="font-slovic mt-3 text-4xl leading-none sm:text-5xl">
              <Link to="/news" className="transition-opacity hover:opacity-80">
                <RevealWords text="Новости" wordClassName={GOLD_TEXT} />
              </Link>
            </h2>
          </div>
          <Link
            to="/news"
            className="shrink-0 rounded-full border border-[#9b2316]/30 px-6 py-3 text-xs uppercase tracking-[0.2em] text-ink transition-all hover:border-maroon-dark hover:bg-maroon-dark hover:text-white active:scale-95"
          >
            Все новости
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {latest.map((item) => (
            <NewsCard key={item._id} item={item} large />
          ))}
        </div>
      </div>
    </section>
  );
}
