import { Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import ScrollToTopButton from "./components/ScrollToTopButton.jsx";
import Home from "./pages/Home.jsx";
import Schedule from "./pages/Schedule.jsx";
import AnnouncementsPage from "./pages/AnnouncementsPage.jsx";
import NewsPage from "./pages/NewsPage.jsx";
import DayPage from "./pages/DayPage.jsx";
import NewsArticlePage from "./pages/NewsArticlePage.jsx";
import RequisitesPage from "./pages/RequisitesPage.jsx";

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/day/:date" element={<DayPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:id" element={<NewsArticlePage />} />
          <Route path="/requisites" element={<RequisitesPage />} />
        </Routes>
      </main>
      <Footer />
      {/* Одна кнопка «наверх» на всё приложение — см. ScrollToTopButton.jsx */}
      <ScrollToTopButton />
    </div>
  );
}

export default App;
