import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { SearchModal } from './components/search/SearchModal';
import { HomePage } from './pages/HomePage';
import { ChapterPage } from './pages/ChapterPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { useProgress } from './hooks/useProgress';
import { chapterIndex } from './data/loadChapter';

function AppRoutes() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('ad-guide-fontsize');
    return saved ? parseInt(saved) : 0;
  });
  const { setChapterStatus, getStatus, getCompletionStats } = useProgress();
  const navigate = useNavigate();
  const location = useLocation();

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const chapterMatch = location.pathname.match(/\/chapter\/(\d+)/);
      const currentId = chapterMatch ? parseInt(chapterMatch[1]) : null;

      // j/k: prev/next chapter
      if (e.key === 'j' && !e.ctrlKey && !e.metaKey) {
        if (currentId && currentId < chapterIndex.length) navigate(`/chapter/${currentId + 1}`);
        return;
      }
      if (e.key === 'k' && !e.ctrlKey && !e.metaKey) {
        if (currentId && currentId > 1) navigate(`/chapter/${currentId - 1}`);
        return;
      }
      // /: search
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location]);

  // Ctrl+K for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Font size
  useEffect(() => {
    localStorage.setItem('ad-guide-fontsize', String(fontSize));
    document.documentElement.style.setProperty('--font-size-adjust', `${fontSize}px`);
  }, [fontSize]);

  // Cursor glow tracking
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--cursor-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--cursor-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  const stats = getCompletionStats();

  return (
    <>
      <Layout
        onOpenSearch={() => setSearchOpen(true)}
      >
        <Routes>
          <Route
            path="/"
            element={<HomePage completed={stats.completed} total={stats.total} inProgress={stats.inProgress} />}
          />
          <Route
            path="/chapter/:id"
            element={<ChapterPage onStatusChange={setChapterStatus} getStatus={getStatus} fontSize={fontSize} onFontSizeChange={setFontSize} />}
          />
          <Route path="/glossary" element={<GlossaryPage />} />
        </Routes>
      </Layout>
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
