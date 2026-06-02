import Fuse from 'fuse.js';
import { useMemo } from 'react';
import type { Chapter } from '../types';

export function useSearch(chapters: Chapter[]) {
  const fuse = useMemo(() => {
    return new Fuse(chapters, {
      keys: ['title', 'content', 'sections.content'],
      threshold: 0.3,
      includeScore: true,
    });
  }, [chapters]);

  const search = (query: string) => {
    if (!query.trim()) return [];
    return fuse.search(query).map(r => ({
      chapterId: r.item.id,
      chapterTitle: r.item.title,
      matchText: query,
      score: r.score || 0,
    }));
  };

  return { search };
}
