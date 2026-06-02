import type { Chapter } from '../types';

// Chapter index metadata — full chapter content is imported dynamically
export const chapterIndex: { id: number; title: string }[] = [
  { id: 1, title: '一、无限（10-1e308 AM）' },
  { id: 2, title: '二、无限升级（1-3e4 IP）' },
  { id: 3, title: '三、打破无限（3e4-5e11 IP）' },
  { id: 4, title: '四、无限挑战（5e11-1e140 IP）' },
  { id: 5, title: '五、复制器（1e140-1e308 IP）' },
  { id: 6, title: '六、早期永恒（1-1e17 EP）' },
  { id: 7, title: '七、早期永恒挑战（130-330 TT）' },
  { id: 8, title: '八、中期永恒挑战（330-860 TT）' },
  { id: 9, title: '九、后期永恒挑战（860-12900 TT）' },
  { id: 10, title: '十、前期时间膨胀（0-1e15 DT）' },
  { id: 11, title: '十一、后期时间膨胀（1e2400-1e4300 EP）' },
  { id: 12, title: '十二、早期现实（2-30 REAL）' },
  { id: 13, title: '十三、完成现实升级（1e4-1e6 RM）' },
  { id: 14, title: '十四、Cel1（1e6-1e24 RM）' },
  { id: 15, title: '十五、Cel2（1e24-1e30 RM）' },
  { id: 16, title: '十六、Cel3（1e30-1e51 RM）' },
  { id: 17, title: '十七、Cel4（1e51-1e92 RM）' },
  { id: 18, title: '十八、Cel5（1e92-1e1000+1e9 iRM）' },
  { id: 19, title: '十九、Cel6（1e9-2e15 IM）' },
  { id: 20, title: '二十、Cel7' },
];

// Import a single chapter's full content dynamically
export async function loadChapter(id: number): Promise<Chapter | null> {
  try {
    const mod = await import(`./chapters/${id}.ts`);
    return mod.default || mod.chapter || null;
  } catch {
    return null;
  }
}
