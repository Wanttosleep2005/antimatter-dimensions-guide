import type { Chapter } from '../types';

export interface StudyTreeHit {
  id: string;
  chapterId: number;
  chapterTitle: string;
  label: string;
  tree: string;
  context: string;
}

export interface AchievementHit {
  id: string;
  achievement: string;
  chapterId: number;
  chapterTitle: string;
  context: string;
}

const STUDY_TREE_RE = /(?:\d{2,3}\s*,\s*){5,}\d{2,3}\s*(?:\|\s*\d{1,2})?/g;
const ACHIEVEMENT_CHAIN_RE = /r(\d{2})((?:\/\d{2})+)/g;
const ACHIEVEMENT_RE = /\br\d{2,3}\b/g;

function normalizeSpace(text: string) {
  return text.replace(/---\s*Page\s+\d+\s*---/gi, ' ').replace(/\s+/g, ' ').trim();
}

function excerpt(content: string, index: number, length: number) {
  const start = Math.max(0, index - 80);
  const end = Math.min(content.length, index + length + 90);
  return normalizeSpace(content.slice(start, end));
}

function compactTree(tree: string) {
  return tree.replace(/\s+/g, '').replace(/，/g, ',');
}

function inferTreeLabel(context: string, chapterId: number) {
  const ec = context.match(/EC\d+(?:×\d+)?/i)?.[0];
  const tt = context.match(/\d{2,5}\s*TT/i)?.[0]?.replace(/\s+/g, '');
  const named = context.includes('标准树') ? '标准树' : context.includes('挂机路径') ? '挂机路径' : context.includes('活跃路径') ? '活跃路径' : '';
  return [ec, tt, named].filter(Boolean).join(' · ') || `第 ${chapterId} 章研究树`;
}

export function extractStudyTrees(chapters: Chapter[]) {
  const seen = new Set<string>();
  const hits: StudyTreeHit[] = [];

  chapters.forEach((chapter) => {
    for (const match of chapter.content.matchAll(STUDY_TREE_RE)) {
      const raw = match[0];
      const tree = compactTree(raw);
      if (tree.split(',').length < 6) continue;

      const key = `${chapter.id}:${tree}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const index = match.index ?? 0;
      const context = excerpt(chapter.content, index, raw.length);
      hits.push({
        id: key,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        label: inferTreeLabel(context, chapter.id),
        tree,
        context,
      });
    }
  });

  return hits;
}

function expandAchievementChains(content: string) {
  return content.replace(ACHIEVEMENT_CHAIN_RE, (_, base: string, suffixes: string) => {
    const rest = suffixes.split('/').filter(Boolean).map((part: string) => `r${part}`);
    return [`r${base}`, ...rest].join(' ');
  });
}

export function extractAchievements(chapters: Chapter[]) {
  const seen = new Set<string>();
  const hits: AchievementHit[] = [];

  chapters.forEach((chapter) => {
    const content = expandAchievementChains(chapter.content);
    for (const match of content.matchAll(ACHIEVEMENT_RE)) {
      const achievement = match[0];
      const index = match.index ?? 0;
      const key = `${achievement}:${chapter.id}:${index}`;
      if (seen.has(key)) continue;
      seen.add(key);

      hits.push({
        id: key,
        achievement,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        context: excerpt(content, index, achievement.length),
      });
    }
  });

  return hits;
}
