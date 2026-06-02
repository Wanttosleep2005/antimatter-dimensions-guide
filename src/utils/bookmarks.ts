export interface Bookmark {
  chapterId: number;
  chapterTitle: string;
  sectionId: string;
  sectionTitle: string;
  savedAt: string; // ISO date
}

const BM_KEY = 'ad-bookmarks';

export function getBookmarks(): Bookmark[] {
  try {
    return JSON.parse(localStorage.getItem(BM_KEY) || '[]');
  } catch {
    return [];
  }
}

export function toggleBookmark(bm: Bookmark): Bookmark[] {
  const list = getBookmarks();
  const idx = list.findIndex((b) => b.sectionId === bm.sectionId);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.unshift(bm);
    if (list.length > 20) list.pop();
  }
  localStorage.setItem(BM_KEY, JSON.stringify(list));
  return list;
}

export function isBookmarked(sectionId: string): boolean {
  return getBookmarks().some((b) => b.sectionId === sectionId);
}
