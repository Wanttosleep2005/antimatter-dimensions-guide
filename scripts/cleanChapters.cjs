const fs = require('fs');
const path = require('path');

const chaptersDir = path.join(__dirname, '..', 'src', 'data', 'chapters');
const chapterIdsToSplit = new Set([3, 4, 5, 10, 11, 13, 14, 15, 16, 17]);
const pageMarkerRe = /^---\s*Page\s+\d+\s*---$/;
const buyerLineRe = /购买器设置/;
const buyerHeaderRe = /自动大坍缩\s+自动星系\s+自动维度提升/;
const buyerDataRe = /^(?:\d+(?:\.\d+)?(?:e\d+)?(?:AM|IP|EP|TT|DT|RM|IM|RS|TP)?|0(?:AM|IP|EP|TT|DT|RM|IM|RS|TP)?|不限制|打开|关闭)\s+/i;
const currencies = ['AM', 'IP', 'EP', 'TT', 'DT', 'RM', 'IM', 'RS', 'TP', 'TC', 'AP'];
const currencyRe = new RegExp(`(?<=\\d)(${currencies.join('|')})(?![a-zA-Z])`, 'g');
const stageNames = [
  '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
];
const sectionTitleOverrides = {
  3: ['3.1 3e4-1e5 IP', '3.2 1e5-1e8 IP', '3.3 1e8-1e11 IP', '3.4 1e11-5e11 IP'],
  4: ['4.1 5e11-1e24 IP', '4.2 1e24-1e128 IP', '4.3 1e128-1e140 IP'],
  5: ['5.1 1e140-1e190 IP', '5.2 1e190-1e308 IP（永恒前检查）'],
  10: ['10.1 0-1e6 DT', '10.2 1e6-1e11 DT', '10.3 1e11-1e15 DT'],
  11: ['11.1 1e2400-1e3100 EP', '11.2 1e3100-1e4150 EP', '11.3 1e1000-1e3830 EP（r143）'],
  13: ['13.1 1e4-5e5 RM', '13.2 5e5-1e6 RM（解锁 Cel1）'],
  14: ['14.1 1e6-1e13 RM', '14.2 1e13-1e21 RM', '14.3 1e21-1e24 RM'],
  15: ['15.1 1e24-1e30 RM（3e9-5e11 RS）', '15.2 100-1500级 Cel2挑战'],
  16: ['16.1 1e30-1e51 RM', '16.2 1e15 DT-1e4000 EP（Cel3挑战）'],
  17: ['17.1 1e51-1e60 RM', '17.2 1e60-1e68 RM', '17.3 1e68-1e92 RM', '17.4 1e92-1e95 RM（解锁 Cel5）'],
};

function normalizeTitle(title) {
  return title
    .replace(/\s+/g, ' ')
    .replace(/（\s+/g, '（')
    .replace(/\s+）/g, '）')
    .replace(/\s+([,，、；;:：])/g, '$1')
    .replace(currencyRe, ' $1')
    .replace(/\s+/g, ' ')
    .trim();
}

function sameTitleLine(line, chapterTitle) {
  const normalizedLine = normalizeTitle(line);
  if (normalizedLine === chapterTitle) return true;
  return /^[一二三四五六七八九十]+、/.test(normalizedLine);
}

function splitByPageMarkers(chapter) {
  if (!chapterIdsToSplit.has(chapter.id)) return chapter.sections;
  if (chapter.sections.length !== 1 || chapter.sections[0].title.trim()) return chapter.sections;

  const chapterTitle = normalizeTitle(chapter.title);
  const sourceLines = chapter.sections[0].content.filter((line, index) => {
    return index !== 0 || !sameTitleLine(line, chapterTitle);
  });
  const chunks = [[]];

  for (const line of sourceLines) {
    if (pageMarkerRe.test(line.trim())) {
      const current = chunks[chunks.length - 1];
      const lastLine = current[current.length - 1] || '';
      if (!buyerLineRe.test(lastLine) && current.length > 0) chunks.push([]);
      continue;
    }
    chunks[chunks.length - 1].push(line);
  }

  return chunks
    .filter(lines => lines.some(line => line.trim()))
    .map((content, index) => ({
      title: `${chapter.id}.${index + 1} 阶段${stageNames[index] || index + 1}`,
      content,
    }));
}

function isBuyerTableLine(line) {
  const trimmed = line.trim();
  return buyerHeaderRe.test(trimmed) || (buyerDataRe.test(trimmed) && /打开|关闭|不限制|不勾选/.test(trimmed));
}

function fixCrossSectionBuyerTables(sections) {
  for (let i = 0; i < sections.length - 1; i++) {
    const current = sections[i].content;
    if (!current.length || !buyerLineRe.test(current[current.length - 1])) continue;

    const next = sections[i + 1].content;
    while (next.length && isBuyerTableLine(next[0])) {
      current.push(next.shift());
    }
  }
  return sections.filter(section => section.content.some(line => line.trim()));
}

function mergeSections(sections, groups) {
  return groups.map(group => ({
    title: sections[group[0]].title,
    content: group.flatMap(index => sections[index]?.content || []),
  }));
}

function applyManualStructure(chapter, sections) {
  let result = sections;

  if (chapter.id === 5 && result.length === 3) {
    result = mergeSections(result, [[0], [1, 2]]);
  } else if (chapter.id === 11 && result.length === 4) {
    result = mergeSections(result, [[0, 1], [2], [3]]);
  } else if (chapter.id === 13 && result.length === 3) {
    result = mergeSections(result, [[0, 1], [2]]);
  }

  const titles = sectionTitleOverrides[chapter.id];
  if (titles && titles.length === result.length) {
    result = result.map((section, index) => ({
      ...section,
      title: titles[index],
    }));
  }

  return result;
}

const sentenceEndChars = new Set(['。', '！', '？', '.', '!', '?', '）', ')']);

function isCompleteBoundaryLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (sentenceEndChars.has(trimmed[trimmed.length - 1])) return true;
  if (/\|\d+$/.test(trimmed)) return true;
  return false;
}

function isContinuationHead(line, previousLine) {
  const trimmed = line.trim();
  const previous = previousLine.trim();
  if (!trimmed || !previous) return false;

  if (/[，、：:,-]$/.test(previous)) return true;
  if (/^[A-Za-z]+至/.test(trimmed)) return true;
  if (/^\d{2,3}(?:,\d{2,3}){2,}/.test(trimmed)) return true;
  if (/^(内|系|径|级|条|文|到|至|度|刷到|等待|两次|然后|继续)/.test(trimmed)) return true;
  return false;
}

function moveTrailingPageContinuations(sections) {
  for (let i = 0; i < sections.length - 1; i++) {
    const current = sections[i].content;
    const next = sections[i + 1].content;
    const lastMarker = current.map(line => pageMarkerRe.test(line.trim())).lastIndexOf(true);
    if (lastMarker === -1 || lastMarker < current.length - 4) continue;

    const trailing = current.slice(lastMarker + 1);
    if (trailing.length === 0 || next.length === 0) continue;

    const tail = trailing[trailing.length - 1];
    const head = next[0];
    if (isCompleteBoundaryLine(tail) || !isContinuationHead(head, tail)) continue;

    current.splice(lastMarker);
    next.unshift(...trailing);
  }
  return sections;
}

function repairCrossSectionContinuations(sections) {
  sections = moveTrailingPageContinuations(sections);
  for (let i = 0; i < sections.length - 1; i++) {
    const current = sections[i].content;
    const next = sections[i + 1].content;

    while (current.length > 0 && next.length > 0) {
      const tail = current[current.length - 1];
      const head = next[0];
      if (isCompleteBoundaryLine(tail) || !isContinuationHead(head, tail)) break;

      current.push(next.shift());
      if (isCompleteBoundaryLine(current[current.length - 1])) break;
    }
  }

  return sections.filter(section => section.content.some(line => line.trim()));
}

function normalizeChapter(chapter) {
  const sections = repairCrossSectionContinuations(applyManualStructure(
    chapter,
    fixCrossSectionBuyerTables(splitByPageMarkers(chapter)),
  )).map(section => ({
    ...section,
    title: normalizeTitle(section.title),
  }));

  return {
    ...chapter,
    title: normalizeTitle(chapter.title),
    description: chapter.description,
    sections,
    content: sections.flatMap(section => [section.title, ...section.content]).join('\n'),
  };
}

const indexPath = path.join(chaptersDir, 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const updatedIndex = [];

for (const entry of index) {
  const chapterPath = path.join(chaptersDir, `${entry.id}.json`);
  const chapter = normalizeChapter(JSON.parse(fs.readFileSync(chapterPath, 'utf8')));
  fs.writeFileSync(chapterPath, `${JSON.stringify(chapter)}\n`, 'utf8');

  updatedIndex.push({
    ...entry,
    title: chapter.title,
    sectionCount: chapter.sections.length,
    contentLength: chapter.content.length,
  });
}

fs.writeFileSync(indexPath, `${JSON.stringify(updatedIndex, null, 2)}\n`, 'utf8');
console.log(`Cleaned ${updatedIndex.length} chapter index entries and chapter files.`);
