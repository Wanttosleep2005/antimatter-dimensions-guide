import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { chapterIndex, loadChapter } from '../data/loadChapter';
import { GuideContent } from '../components/guide/GuideContent';
import type { Chapter } from '../types';

interface ChapterPageProps {
  onStatusChange: (id: number, status: 'not-started' | 'in-progress' | 'completed') => void;
  getStatus: (id: number) => 'not-started' | 'in-progress' | 'completed';
  fontSize: number;
  onFontSizeChange: (v: number) => void;
}

export function ChapterPage({ onStatusChange, getStatus, fontSize, onFontSizeChange }: ChapterPageProps) {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const chapterId = parseInt(id || '1');
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const chapterMeta = chapterIndex.find(c => c.id === chapterId);

  // Phase color mapping
  const phaseColor = (() => {
    if (chapterId <= 5) return 'var(--phase-infinity)';
    if (chapterId <= 9) return 'var(--phase-eternity)';
    if (chapterId <= 11) return 'var(--phase-dilation)';
    if (chapterId <= 13) return 'var(--phase-reality)';
    return 'var(--phase-celestial)';
  })();

  useEffect(() => {
    setLoading(true);
    loadChapter(chapterId).then(ch => {
      setChapter(ch);
      setLoading(false);
    });
  }, [chapterId]);

  useEffect(() => {
    if (chapterMeta) {
      const current = getStatus(chapterId);
      if (current !== 'completed') {
        onStatusChange(chapterId, 'in-progress');
      }
      localStorage.setItem('ad-guide-last-chapter', JSON.stringify({ id: chapterId, title: chapterMeta.title }));

      // Track recent chapters
      try {
        const raw = localStorage.getItem('ad-recent-chapters');
        const list: { id: number; title: string; ts: string }[] = raw ? JSON.parse(raw) : [];
        const filtered = list.filter(c => c.id !== chapterId);
        const now = new Date();
        const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        filtered.unshift({ id: chapterId, title: chapterMeta.title, ts });
        localStorage.setItem('ad-recent-chapters', JSON.stringify(filtered.slice(0, 10)));
      } catch { /* ignore */ }
    }
  }, [chapterId]);

  const status = getStatus(chapterId);
  const searchQuery = searchParams.get('q') || undefined;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 animate-fade-in">
        <div className="skeleton h-8 w-48 mb-4" />
        <div className="skeleton h-4 w-full mb-2" />
        <div className="skeleton h-4 w-3/4 mb-2" />
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-[var(--text-tertiary)]">章节内容尚未恢复。</p>
        <Link to="/" className="mt-4 inline-block" style={{ color: 'var(--accent-color)' }}>← 返回首页</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 animate-fade-in-up" style={{ '--chapter-phase-color': phaseColor } as React.CSSProperties}>
      <GuideContent
        chapter={chapter}
        chapterId={chapterId}
        status={status}
        onStatusChange={(s) => onStatusChange(chapterId, s)}
        fontSize={fontSize}
        onFontSizeChange={onFontSizeChange}
        totalChapters={chapterIndex.length}
        searchQuery={searchQuery}
      />
    </div>
  );
}
