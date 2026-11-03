import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import ScrollToTopButton from "./components/ScrollToTopButton.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import Home from "./pages/Home.jsx";
import { COMMUNION, BAPTISM } from "./lib/sacraments.js";
const Schedule = lazy(() => import("./pages/Schedule.jsx"));
const AnnouncementsPage = lazy(() => import("./pages/AnnouncementsPage.jsx"));
const NewsPage = lazy(() => import("./pages/NewsPage.jsx"));
const DayPage = lazy(() => import("./pages/DayPage.jsx"));
const NewsArticlePage = lazy(() => import("./pages/NewsArticlePage.jsx"));
const RequisitesPage = lazy(() => import("./pages/RequisitesPage.jsx"));
const AboutPage = lazy(() => import("./pages/AboutPage.jsx"));
const ClergyPage = lazy(() => import("./pages/ClergyPage.jsx"));
const SacramentPage = lazy(() => import("./pages/SacramentPage.jsx"));

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Header />
      <main className="flex-1">
        {/* страницы кроме главной грузятся по требованию — первый заход легче */}
        <Suspense fallback={<div className="min-h-[60vh]" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/day/:date" element={<DayPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:id" element={<NewsArticlePage />} />
          <Route path="/requisites" element={<RequisitesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/clergy" element={<ClergyPage />} />
          <Route path="/tainstvo-prichashenie" element={<SacramentPage key="c" data={COMMUNION} />} />
          <Route path="/tainstvo-kreshenie" element={<SacramentPage key="b" data={BAPTISM} />} />
        </Routes>
        </Suspense>
      </main>
      <Footer />
      {/* Одна кнопка «наверх» на всё приложение — см. ScrollToTopButton.jsx */}
      <ScrollToTopButton />
    </div>
  );
}

export default App;
