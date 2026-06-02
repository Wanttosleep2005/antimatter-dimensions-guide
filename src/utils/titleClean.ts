/**
 * Remove chapter number prefix from chapter titles.
 * Supports multiple patterns:
 * - "第X章 " prefix → cleanTitle("第一章 无限") = "无限"
 * - Leading Chinese/ASCII numeral → cleanTitle("一、概述") = "概述"
 * Falls back to original title if no prefix matched.
 */
export function cleanTitle(title: string): string {
  // Pattern A: "第X章 " prefix (X can be Chinese or ASCII digits)
  const a = title.replace(/^第.+?\s*/, '');
  if (a !== title) return a;

  // Pattern B: Leading Chinese or ASCII numeral + separator
  return title.replace(/^[一二三四五六七八九十\d]+[、.\s-]*/, '');
}
