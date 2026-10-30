import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Calendar } from "@heroui/react";
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";
import heic2any from "heic2any";
import { useNewsItem } from "../lib/useNews.js";
import RichTextEditor from "../components/RichTextEditor.jsx";
import ImagePositioner from "../components/ImagePositioner.jsx";
import { formatNewsDate, formatViewCount, coverImageStyle } from "../components/NewsCard.jsx";

const HERO_ASPECT = "aspect-[21/9]";

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

// Страница статьи (/news/:id) — двойное назначение: обычный читатель видит
// готовый разворот (обложка, дата/просмотры, заголовок, категория, текст —
// оформление по референсу с valaam.ru), а «админ» (тут это буквально любой
// посетитель — на сайте нет авторизации нигде, см. остальные редакторы) той
// же кнопкой-карандашом переключает страницу в режим редактирования: поля
// заголовка/категории/даты/обложки и RichTextEditor прямо здесь, без
// отдельной модалки. Черновик, созданный кнопкой «Добавить» на /news (см.
// NewsPage.jsx), открывается сюда сразу с ?edit=1 — если его отменить
// (Отмена), не сохранив ни разу, он просто удаляется, а не остаётся в
// списке пустой «Новой новостью» (см. isFreshDraft/handleCancel).
export default function NewsArticlePage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loading, error: loadError, item, update, remove, upload, incrementView } = useNewsItem(id);

  const isFreshDraft = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState(isFreshDraft);
  const [editSession, setEditSession] = useState(0);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [publishedDate, setPublishedDate] = useState("");
  const [coverImgSrc, setCoverImgSrc] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverFocus, setCoverFocus] = useState({ x: 50, y: 50 });
  const [coverZoom, setCoverZoom] = useState(1);
  const [bodyHtml, setBodyHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fileInputRef = useRef(null);
  const objectUrlRef = useRef(null);
  const startedFreshRef = useRef(false);

  const startEditing = (source) => {
    setTitle(source?.title || "");
    setCategory(source?.category || "");
    setPublishedDate(new Date(source?.publishedAt || Date.now()).toISOString().slice(0, 10));
    setCoverImgSrc(source?.imageUrl || null);
    setCoverFile(null);
    setCoverFocus(
      source?.imageFocus && Number.isFinite(source.imageFocus.x) && Number.isFinite(source.imageFocus.y)
        ? source.imageFocus
        : { x: 50, y: 50 }
    );
    setCoverZoom(Number.isFinite(source?.imageZoom) ? source.imageZoom : 1);
    setBodyHtml(source?.body || "");
    setFormError(null);
    setEditSession((s) => s + 1);
    setEditing(true);
  };

  // Черновик из «Добавить» (isFreshDraft) — сразу входим в редактирование,
  // как только сама новость подгрузилась (один раз, см. startedFreshRef).
  useEffect(() => {
    if (!isFreshDraft || startedFreshRef.current || !item) return;
    startedFreshRef.current = true;
    startEditing(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFreshDraft, item]);

  // Просмотр считаем только в режиме чтения — не пока автор сам заходит в
  // свежесозданный черновик редактировать его (см. incrementView в
  // useNews.js — там же защита от повторного счёта в одной вкладке).
  useEffect(() => {
    if (!loading && item && !editing) incrementView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, item, editing]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  const isHeic = (f) => /\.hei[cf]$/i.test(f.name) || /^image\/hei[cf]/i.test(f.type);

  const handleCoverFile = async (picked) => {
    if (!picked) return;
    setFormError(null);
    let workingFile = picked;
    if (isHeic(picked)) {
      setConverting(true);
      try {
        const converted = await heic2any({ blob: picked, toType: "image/jpeg", quality: 0.9 });
        const convertedBlob = Array.isArray(converted) ? converted[0] : converted;
        workingFile = new File([convertedBlob], picked.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" });
      } catch {
        setFormError("Не удалось прочитать HEIC-файл — попробуйте другой формат");
        setConverting(false);
        return;
      }
      setConverting(false);
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(workingFile);
    objectUrlRef.current = url;
    setCoverImgSrc(url);
    setCoverFile(workingFile);
    // Новая картинка — старые кадрирование/масштаб от прежней к ней не
    // подходят, начинаем заново.
    setCoverFocus({ x: 50, y: 50 });
    setCoverZoom(1);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setFormError("Укажите заголовок");
      return;
    }
    if (!publishedDate) {
      setFormError("Укажите дату публикации");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      let imageUrl;
      if (coverFile) imageUrl = await upload(coverFile);
      else if (!coverImgSrc) imageUrl = null;
      const publishedAt = new Date(`${publishedDate}T00:00:00`).getTime();
      const patch = { title: title.trim(), body: bodyHtml, category: category.trim() || null, publishedAt };
      if (imageUrl !== undefined) patch.imageUrl = imageUrl;
      if (coverImgSrc) {
        patch.imageFocus = coverFocus;
        patch.imageZoom = coverZoom;
      }
      await update(patch);
      setEditing(false);
      if (isFreshDraft) navigate(`/news/${id}`, { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (isFreshDraft) {
      await remove().catch(() => {});
      navigate("/news");
      return;
    }
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Удалить эту новость без возможности восстановления?")) return;
    await remove().catch((err) => setFormError(err.message));
    navigate("/news");
  };

  if (loading) return <p className="mx-auto max-w-5xl px-4 py-10 text-center text-muted">Загрузка…</p>;
  if (loadError || !item) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-center">
        <p className="text-muted">{loadError || "Новость не найдена"}</p>
        <Link to="/news" className="mt-4 inline-block text-sm text-maroon hover:underline">
          ← Все новости
        </Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-5xl px-4 py-10">
      <Link to="/news" className="mb-6 inline-block text-sm text-muted transition-colors hover:text-maroon">
        ← Все новости
      </Link>

      {editing ? (
        <div className="flex flex-col gap-4">
          {converting ? (
            <div className={`flex w-full items-center justify-center rounded-2xl border border-line bg-white/20 ${HERO_ASPECT}`}>
              <span className="text-sm text-muted">Обработка HEIC…</span>
            </div>
          ) : coverImgSrc ? (
            <ImagePositioner
              src={coverImgSrc}
              focus={coverFocus}
              zoom={coverZoom}
              aspectClassName={HERO_ASPECT}
              onChange={({ x, y, zoom }) => {
                setCoverFocus({ x, y });
                setCoverZoom(zoom);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`flex w-full items-center justify-center overflow-hidden rounded-2xl border border-line bg-white/20 backdrop-blur-md ${HERO_ASPECT}`}
            >
              <span className="text-sm text-muted">Добавить обложку (необязательно)</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleCoverFile(e.target.files?.[0] || null)}
          />
          {coverImgSrc && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full border border-line bg-white px-3 py-1 text-xs text-muted hover:text-maroon"
              >
                Заменить обложку
              </button>
              <button
                type="button"
                onClick={() => {
                  if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
                  objectUrlRef.current = null;
                  setCoverImgSrc(null);
                  setCoverFile(null);
                  setCoverFocus({ x: 50, y: 50 });
                  setCoverZoom(1);
                }}
                className="rounded-full border border-line bg-white px-3 py-1 text-xs text-muted hover:text-maroon"
              >
                Убрать обложку
              </button>
            </div>
          )}

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заголовок новости"
            className="rich-heading w-full rounded-lg border border-line bg-white px-3 py-2 text-xl normal-case tracking-normal text-ink"
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Категория (необязательно)"
              className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            />
            <details className="group relative flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink">
              <summary className="cursor-pointer list-none">
                Дата публикации — {publishedDate.split("-").reverse().join(".")}
              </summary>
              <div className="absolute left-0 top-full z-10 mt-2 rounded-xl border border-line bg-paper p-2 shadow-lg">
                <Calendar
                  aria-label="Дата публикации"
                  value={publishedDate ? parseDate(publishedDate) : today(getLocalTimeZone())}
                  onChange={(date) => setPublishedDate(date ? date.toString() : "")}
                >
                  <Calendar.Header className="flex items-center justify-between px-1">
                    <Calendar.NavButton slot="previous" className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-maroon">
                      ‹
                    </Calendar.NavButton>
                    <Calendar.Heading className="rich-heading text-sm normal-case tracking-normal text-maroon" />
                    <Calendar.NavButton slot="next" className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-maroon">
                      ›
                    </Calendar.NavButton>
                  </Calendar.Header>
                  <Calendar.Grid>
                    <Calendar.GridHeader>
                      {(day) => <Calendar.HeaderCell className="text-xs text-muted">{day}</Calendar.HeaderCell>}
                    </Calendar.GridHeader>
                    <Calendar.GridBody>
                      {(date) => (
                        <Calendar.Cell
                          date={date}
                          className="rounded-full text-sm text-ink data-[selected=true]:bg-maroon data-[selected=true]:text-white data-[today=true]:font-bold data-[today=true]:text-maroon data-[outside-month=true]:text-line"
                        />
                      )}
                    </Calendar.GridBody>
                  </Calendar.Grid>
                </Calendar>
              </div>
            </details>
          </div>

          <RichTextEditor key={editSession} content={bodyHtml} onChange={setBodyHtml} uploadImage={upload} />

          {formError && <p className="text-sm text-maroon">{formError}</p>}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-maroon px-5 py-2 text-sm text-white transition-colors hover:bg-maroon-dark disabled:opacity-50"
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="rounded-full border border-line bg-white px-5 py-2 text-sm text-muted hover:text-maroon"
            >
              Отмена
            </button>
            {!isFreshDraft && (
              <button
                type="button"
                onClick={handleDelete}
                className="ml-auto flex items-center gap-1 rounded-full border border-line bg-white px-4 py-2 text-sm text-muted hover:text-maroon"
              >
                <TrashIcon /> Удалить
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div />
            <button
              type="button"
              onClick={() => startEditing(item)}
              className="flex shrink-0 items-center gap-1 rounded-full border border-line bg-white px-3 py-1.5 text-xs text-muted transition-colors hover:text-maroon"
            >
              <EditIcon /> Редактировать
            </button>
          </div>

          {item.imageUrl && (
            <div className={`relative mb-6 w-full overflow-hidden rounded-2xl shadow-sm ${HERO_ASPECT}`}>
              <img
                src={item.imageUrl}
                alt=""
                style={coverImageStyle(item)}
                className="absolute inset-0 h-full w-full object-cover [transform:scale(var(--z))]"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>{formatNewsDate(item.publishedAt)}</span>
            <span className="flex items-center gap-1">
              <EyeIcon /> {formatViewCount(item.viewCount)}
            </span>
            {item.category && <span className="rounded-full bg-cream px-2.5 py-0.5 text-xs text-maroon">{item.category}</span>}
          </div>

          <h1 className="rich-heading mt-3 text-2xl normal-case tracking-normal text-maroon sm:text-3xl">{item.title}</h1>

          {item.body ? (
            <div className="article-content mt-6" dangerouslySetInnerHTML={{ __html: item.body }} />
          ) : (
            <p className="mt-6 text-muted">Текст новости пока не добавлен.</p>
          )}
        </div>
      )}
    </article>
  );
}
