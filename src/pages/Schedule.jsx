import { useLiveSchedule } from "../lib/useLiveSchedule.js";
import PosterModal from "../components/PosterModal.jsx";

export default function Schedule() {
  const { loading, error, days, fontSize, stale } = useLiveSchedule();

  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      {loading && <p className="text-center text-muted">Загрузка…</p>}
      {error && <p className="text-center text-maroon">{error}</p>}
      {stale && (
        <p className="mb-4 text-center text-sm text-muted">
          Показано последнее сохранённое расписание — источник сейчас недоступен.
        </p>
      )}

      {!loading && !error && days.length === 0 && (
        <p className="text-center text-muted">Расписание пока не опубликовано.</p>
      )}

      {days.length > 0 && <PosterModal days={days} fontSize={fontSize} />}
    </section>
  );
}
