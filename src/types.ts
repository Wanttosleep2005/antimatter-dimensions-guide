export interface ChapterSection {
  title: string;
  content: string[];
}

export interface Chapter {
  id: number;
  title: string;
  description: string[];
  sections: ChapterSection[];
  content: string;
}

export interface GlossaryTerm {
  term: string;
  fullName: string;
  description: string;
  category: string;
}

export interface SearchResult {
  chapterId: number;
  chapterTitle: string;
  matchText: string;
  score: number;
}


export interface Progress {
  [chapterId: number]: 'not-started' | 'in-progress' | 'completed';
}
