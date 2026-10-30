import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNews } from "../lib/useNews.js";
import NewsCard, { excerptOfHtml } from "../components/NewsCard.jsx";
import NewsCarousel from "../components/NewsCarousel.jsx";

const PAGE_SIZE = 9;
const FEATURED_COUNT = 2;

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Страница «Все новости» (переход по клику на заголовок «Новости»/«Все
// новости →» на главной, см. NewsSection.jsx). Сверху — карусель последних
// новостей (см. NewsCarousel.jsx, независима от поиска/фильтра — это просто
// «витрина», листается сама и вручную). Ниже — поиск и фильтр по категории,
// затем список: первые FEATURED_COUNT — крупными карточками (как хедлайны
// у референса, valaam.ru/publishing), остальные — сеткой помельче.
// «Показать ещё» вместо номерной пагинации — по клику подгружает
// (точнее, просто показывает) следующую порцию уже загруженного списка:
// новостей на приходском сайте немного, полный список и так на руках (см.
// useNews.js), гонять его постранично через сервер незачем.
//
// «Добавить» не открывает форму в модалке — сразу создаёт черновик и
// переводит на его страницу статьи в режиме редактирования (см.
// NewsArticlePage.jsx, ?edit=1): весь ввод (включая полноценный редактор
// текста) там же, а не тут.
export default function NewsPage() {
  const { loading, items, create } = useNews();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, category]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru")),
    [items]
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (category && item.category !== category) return false;
      if (!q) return true;
      // body — HTML из редактора (см. RichTextEditor.jsx), ищем по тексту
      // без разметки, иначе искалось бы заодно и по служебным атрибутам
      // (style="color: ...", src картинок и т.п.).
      return item.title.toLowerCase().includes(q) || excerptOfHtml(item.body, Infinity).toLowerCase().includes(q);
    });
  }, [items, search, category]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const featured = visibleItems.slice(0, FEATURED_COUNT);
  const rest = visibleItems.slice(FEATURED_COUNT);
  const hasMore = filteredItems.length > visibleItems.length;

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const doc = await create({ title: "Новая новость", body: "", publishedAt: Date.now() });
      navigate(`/news/${doc._id}?edit=1`);
    } catch (err) {
      setCreateError(err.message);
      setCreating(false);
    }
  };

  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl text-maroon">Новости</h1>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-1 rounded-full bg-maroon px-4 py-2 text-sm text-white transition-colors hover:bg-maroon-dark disabled:opacity-50"
          >
            <PlusIcon /> {creating ? "Создаём…" : "Добавить"}
          </button>
        </div>
        {createError && <p className="mb-4 text-sm text-maroon">{createError}</p>}

        {!loading && items.length > 0 && (
          <div className="mb-10">
            <NewsCarousel items={items.slice(0, 6)} />
          </div>
        )}

        <div className="mb-6 flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-line bg-white px-3 py-2">
            <SearchIcon />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по новостям"
              className="w-full text-sm text-ink outline-none"
            />
          </div>
          {categories.length > 0 && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-full border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="">Все категории</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading && <p className="text-center text-muted">Загрузка…</p>}
        {!loading && items.length === 0 && <p className="text-center text-muted">Новостей пока нет.</p>}
        {!loading && items.length > 0 && filteredItems.length === 0 && (
          <p className="text-center text-muted">Ничего не найдено.</p>
        )}

        {featured.length > 0 && (
          <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {featured.map((item) => (
              <NewsCard key={item._id} item={item} large />
            ))}
          </div>
        )}

        {rest.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((item) => (
              <NewsCard key={item._id} item={item} />
            ))}
          </div>
        )}

        {hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="rounded-full border border-line bg-white px-6 py-2.5 text-sm text-maroon shadow-sm transition-colors hover:bg-maroon hover:text-white"
            >
              Показать ещё
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
