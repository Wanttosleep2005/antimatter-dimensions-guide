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

  useEffect(() => {
    setLoading(true);
    loadChapter(chapterId).then(ch => {
      setChapter(ch);
      setLoading(false);
    });
  }, [chapterId]);

  useEffect(() => {
    if (chapterMeta) {
      onStatusChange(chapterId, 'in-progress');
      localStorage.setItem('ad-guide-last-chapter', JSON.stringify({ id: chapterId, title: chapterMeta.title }));
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 animate-fade-in-up">
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
