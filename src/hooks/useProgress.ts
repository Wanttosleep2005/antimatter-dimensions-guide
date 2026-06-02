import { useState, useCallback } from 'react';
import type { Progress } from '../types';

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem('ad-guide-progress');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(p: Progress) {
  localStorage.setItem('ad-guide-progress', JSON.stringify(p));
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(loadProgress);

  const setChapterStatus = useCallback((chapterId: number, status: 'not-started' | 'in-progress' | 'completed') => {
    setProgress(prev => {
      const next = { ...prev, [chapterId]: status };
      saveProgress(next);
      return next;
    });
  }, []);

  const getStatus = useCallback((chapterId: number): 'not-started' | 'in-progress' | 'completed' => {
    return progress[chapterId] || 'not-started';
  }, [progress]);

  const getCompletionStats = useCallback(() => {
    const entries = Object.values(progress);
    const completed = entries.filter(s => s === 'completed').length;
    const inProgress = entries.filter(s => s === 'in-progress').length;
    const total = 20;
    return { completed, inProgress, total };
  }, [progress]);

  return { setChapterStatus, getStatus, getCompletionStats };
}
