import { useEffect, useRef, useState } from "react";
import { Drawer } from "@heroui/react";

const cache = new Map(); // ref → { items, url } — повторно на сервер не ходим

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const Chevron = ({ dir }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);

// «Феофилакт Болгарский, блж. (†1107)» → «Феофилакт Болгарский, блж.»
const shortAuthor = (a) => (a || "").replace(/\s*\(†[^)]*\)\s*$/, "").trim();

function useCommentary(ref, open) {
  const [state, setState] = useState({ loading: false, error: null, data: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open || !ref) return undefined;
    if (cache.has(ref)) {
      setState({ loading: false, error: null, data: cache.get(ref) });
      return undefined;
    }
    let cancelled = false;
    setState({ loading: true, error: null, data: null });
    fetch(`/api/verse-commentary?ref=${encodeURIComponent(ref)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Толкования сейчас недоступны — попробуйте чуть позже");
        return res.json();
      })
      .then((data) => {
        cache.set(ref, data);
        if (!cancelled) setState({ loading: false, error: null, data });
      })
      .catch((err) => !cancelled && setState({ loading: false, error: err.message, data: null }));
    return () => {
      cancelled = true;
    };
  }, [ref, open, attempt]);
  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

// Окно снизу с толкованием на стих. Сверху — «Стих N» и мелко в скобках, от
// кого толкование (выбранный автор); ниже — сам стих, ряд авторов для выбора и
// текст толкования с ссылкой на источник.
export default function VerseCommentary({ verse: incoming, prev, next, onStep, onClose }) {
  const open = Boolean(incoming);
  // При закрытии родитель обнуляет стих, а окно ещё доигрывает анимацию ухода —
  // поэтому показываем последний открытый стих, иначе содержимое «падает».
  const lastRef = useRef(null);
  if (incoming) lastRef.current = incoming;
  const verse = incoming || lastRef.current;
  const bodyRef = useRef(null);
  useEffect(() => {
    bodyRef.current?.scrollTo?.({ top: 0 });
  }, [verse?.ref]);
  // ← и → переключают стихи, пока окно открыто
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "ArrowLeft" && prev) onStep?.(-1);
      if (e.key === "ArrowRight" && next) onStep?.(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, prev, next, onStep]);
  const { loading, error, data, retry } = useCommentary(verse?.ref, open);
  const [picked, setPicked] = useState(0);
  useEffect(() => setPicked(0), [verse?.ref]);

  const items = data?.items || [];
  const current = items[picked] || null;

  return (
    <Drawer isOpen={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Backdrop variant="blur">
        <Drawer.Content placement="bottom">
          <Drawer.Dialog className="mx-auto w-full max-w-3xl !rounded-b-none !rounded-t-[28px] !bg-white !p-0 shadow-[0_-24px_60px_-24px_rgba(60,15,10,0.45)]">
            <Drawer.CloseTrigger className="!absolute right-4 top-4 z-20 grid !h-10 !w-10 place-items-center !rounded-full !bg-[#f5f1ed] !text-[#9b2316] transition-colors hover:!bg-[#9b2316] hover:!text-white">
              <CloseIcon />
            </Drawer.CloseTrigger>

            <div className="shrink-0 px-6 pb-4 pt-6 pr-16 sm:px-9 sm:pr-20">
              <p className="text-[0.6875rem] uppercase tracking-[0.24em] text-[#9b2316]">
                {verse?.bookTitle || "Толкование"}
              </p>
              <Drawer.Heading style={{ fontFamily: "inherit", textTransform: "none", letterSpacing: 0 }} className="mt-1.5 font-serif-hero text-[1.9rem] font-medium leading-tight text-ink">
                {verse?.abbr}{verse?.chapter}:{verse?.n}
                {current && <span className="ml-2 text-base font-normal text-ink/55">({shortAuthor(current.author)})</span>}
              </Drawer.Heading>
              {verse?.text && (
                <p
                  className="mt-3 border-l-2 border-[#d4574a]/60 pl-4 font-serif-hero text-[1.0625rem] italic leading-snug text-ink/75"
                  dangerouslySetInnerHTML={{ __html: verse.text }}
                />
              )}
            </div>

            {items.length > 1 && (
              <div className="shrink-0 border-y border-[#ece6e1] px-6 py-3 sm:px-9">
                <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {items.map((it, i) => (
                    <button
                      key={`${it.author}-${i}`}
                      type="button"
                      onClick={() => setPicked(i)}
                      aria-pressed={i === picked}
                      className={`shrink-0 rounded-full border px-4 py-2 text-[0.8125rem] transition-colors ${
                        i === picked ? "border-[#9b2316] bg-[#9b2316] text-white" : "border-[#e3d6cf] bg-white text-ink/80 hover:border-[#d4574a] hover:text-[#9b2316]"
                      }`}
                    >
                      {shortAuthor(it.author)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Drawer.Body ref={bodyRef} className="min-h-[9rem] px-6 pb-6 pt-5 sm:px-9">
              {loading && (
                <div className="flex animate-pulse flex-col gap-3" aria-label="Загружаем толкование">
                  <span className="h-4 w-11/12 rounded bg-[#ece6e1]" />
                  <span className="h-4 w-full rounded bg-[#ece6e1]" />
                  <span className="h-4 w-10/12 rounded bg-[#ece6e1]" />
                  <span className="h-4 w-8/12 rounded bg-[#ece6e1]" />
                </div>
              )}
              {error && (
                <div className="text-ink/70">
                  <p>{error}</p>
                  <button type="button" onClick={retry} className="mt-3 rounded-full border border-[#9b2316]/50 px-5 py-2 text-xs uppercase tracking-[0.18em] text-[#9b2316] transition-colors hover:bg-[#9b2316] hover:text-white">
                    Повторить
                  </button>
                </div>
              )}
              {!loading && !error && data && items.length === 0 && <p className="text-ink/60">Толкований на этот стих пока нет.</p>}
              {current && (
                <div key={`${verse?.ref}-${picked}`}>
                  <div className="commentary-text text-[1.0625rem] leading-relaxed text-ink" dangerouslySetInnerHTML={{ __html: current.html }} />
                  <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.18em]">
                    {current.source?.url && (
                      <a href={current.source.url} target="_blank" rel="noreferrer" className="text-[#9b2316] transition-colors hover:text-maroon-dark">
                        {current.source.title || "Источник"} <span aria-hidden>↗</span>
                      </a>
                    )}
                    {data?.url && (
                      <a href={data.url} target="_blank" rel="noreferrer" className="text-ink/50 transition-colors hover:text-[#9b2316]">
                        Все толкования на azbyka.ru <span aria-hidden>↗</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </Drawer.Body>

            {/* Переключение стихов чтения, не закрывая окно */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#ece6e1] px-5 py-3 sm:px-8">
              <button
                type="button"
                onClick={() => onStep?.(-1)}
                disabled={!prev}
                aria-label="Предыдущий стих"
                className="flex items-center gap-2 rounded-full border border-[#9b2316]/40 py-2 pl-3 pr-5 text-sm text-[#9b2316] transition-colors hover:bg-[#9b2316] hover:text-white disabled:pointer-events-none disabled:opacity-30"
              >
                <Chevron dir="left" />
                <span>{prev ? `${prev.abbr}${prev.chapter}:${prev.n}` : "Назад"}</span>
              </button>
              <button
                type="button"
                onClick={() => onStep?.(1)}
                disabled={!next}
                aria-label="Следующий стих"
                className="flex items-center gap-2 rounded-full border border-[#9b2316]/40 py-2 pl-5 pr-3 text-sm text-[#9b2316] transition-colors hover:bg-[#9b2316] hover:text-white disabled:pointer-events-none disabled:opacity-30"
              >
                <span>{next ? `${next.abbr}${next.chapter}:${next.n}` : "Дальше"}</span>
                <Chevron dir="right" />
              </button>
            </div>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
