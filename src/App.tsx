import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { SearchModal } from './components/search/SearchModal';
import { SplashPage } from './pages/SplashPage';
import { HomePage } from './pages/HomePage';
import { ChapterPage } from './pages/ChapterPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { useProgress } from './hooks/useProgress';
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor';
import { useMemoryGuard } from './hooks/useMemoryGuard';
import { chapterIndex } from './data/loadChapter';

// Lazy-load heavy pages — code splitting for performance
const StudyTreesPage = lazy(() => import('./pages/StudyTreesPage').then(m => ({ default: m.StudyTreesPage })));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage').then(m => ({ default: m.AchievementsPage })));
const AutomatorPage = lazy(() => import('./pages/AutomatorPage').then(m => ({ default: m.AutomatorPage })));

function PageSkeleton() {
  return <div className="max-w-5xl mx-auto px-4 py-20"><div className="skeleton h-96 rounded-lg" /></div>;
}

// Cache cleanup on app start
function cleanCache() {
  try {
    const preserve = [
      'ad-guide-progress', 'ad-bookmarks', 'ad-hide-completed',
      'ad-recent-chapters', 'ad-search-history', 'ad-guide-fontsize',
      'ad-guide-last-chapter', 'ad-perf-mode', 'ad-scroll-pos-',
      'ad-reading-days', 'ad-guide-checklist',
    ];
    let cleaned = 0;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && !preserve.some((p) => key.startsWith(p))) {
        localStorage.removeItem(key);
        cleaned++;
      }
    }
    if (cleaned > 0) console.log(`[Perf] Cleaned ${cleaned} stale cache entries`);
  } catch { /* ignore */ }
}

function AppRoutes() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [splashDone, setSplashDone] = useState(() => {
    return sessionStorage.getItem('ad-splash') === 'done';
  });
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('ad-guide-fontsize');
    return saved ? parseInt(saved) : 0;
  });
  const { setChapterStatus, getStatus, getCompletionStats } = useProgress();
  const perfMode = usePerformanceMonitor();
  useMemoryGuard();
  const navigate = useNavigate();
  const location = useLocation();

  // Cache cleanup on app mount
  useEffect(() => { cleanCache(); }, []);

  // Memory pressure listener
  useEffect(() => {
    const h = () => cleanCache();
    window.addEventListener('ad-memory-pressure', h);
    return () => window.removeEventListener('ad-memory-pressure', h);
  }, []);

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

  // Enter key to dismiss splash page
  useEffect(() => {
    if (!splashDone) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          sessionStorage.setItem('ad-splash', 'done');
          setSplashDone(true);
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [splashDone]);

  const handleEnter = () => {
    sessionStorage.setItem('ad-splash', 'done');
    setSplashDone(true);
  };

  if (!splashDone) {
    return <SplashPage onEnter={handleEnter} />;
  }

  return (
    <>
      <Layout
        onOpenSearch={() => setSearchOpen(true)}
        getStatus={getStatus}
        perfMode={perfMode.current}
      >
        <Routes>
          <Route
            path="/"
            element={<HomePage completed={stats.completed} total={stats.total} inProgress={stats.inProgress} getStatus={getStatus} onOpenSearch={() => setSearchOpen(true)} />}
          />
          <Route
            path="/chapter/:id"
            element={<ChapterPage onStatusChange={setChapterStatus} getStatus={getStatus} fontSize={fontSize} onFontSizeChange={setFontSize} />}
          />
          <Route path="/glossary" element={<GlossaryPage />} />
          <Route path="/tools/study-trees" element={<Suspense fallback={<PageSkeleton />}><StudyTreesPage /></Suspense>} />
          <Route path="/tools/achievements" element={<Suspense fallback={<PageSkeleton />}><AchievementsPage /></Suspense>} />
          <Route path="/tools/automator" element={<Suspense fallback={<PageSkeleton />}><AutomatorPage /></Suspense>} />
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
