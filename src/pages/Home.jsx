import { useLiveSchedule } from "../lib/useLiveSchedule.js";
import Hero from "../components/Hero.jsx";
import Announcements from "../components/Announcements.jsx";
import DaySchedule from "../components/DaySchedule.jsx";
import AkathistBanner from "../components/AkathistBanner.jsx";
import SacramentsSection from "../components/SacramentsSection.jsx";
import NewsSection from "../components/NewsSection.jsx";

export default function Home() {
  const { loading, days, fontSize } = useLiveSchedule();

  return (
    <>
      <Hero />
      <div id="home-content" />

      {loading && <p className="px-6 py-10 text-muted sm:px-10">Загрузка…</p>}
      {!loading && days.length === 0 && (
        <p className="px-6 py-10 text-muted sm:px-10">Расписание пока не опубликовано.</p>
      )}

      <Announcements />

      {/* Весь массив дней, не обрезанный до сегодня (было upcomingDays().
          slice(0,6)) — DaySchedule сам находит сегодняшний день внутри него
          (todayIndex) и стартует с него, но теперь может листать стрелкой
          назад и в прошлые дни расписания, а не только вперёд. */}
      <DaySchedule days={days} fontSize={fontSize} />

      <AkathistBanner />

      <SacramentsSection />

      <NewsSection />
    </>
  );
}
