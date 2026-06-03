import { glossaryTerms } from '../data/glossary';

// Build a map of term → definition for fast lookup
const termMap = new Map<string, { fullName: string; description: string }>();
for (const t of glossaryTerms) {
  termMap.set(t.term, { fullName: t.fullName, description: t.description });
}

// Sort terms by length (longest first) to avoid partial matches
const sortedTerms = [...glossaryTerms].sort((a, b) => b.term.length - a.term.length);
const TAG_RE = /<[^>]+>/g;
const SKIP_CLASS_RE = /\b(?:currency-inline|game-term|rune-spec|rune-spec-label|rune-tooltip|rune-tooltip-content|rune-combo|glossary-inline|number-format)\b/;
const SKIP_TAGS = new Set(['a', 'code', 'mark']);

/**
 * Wrap glossary terms in the content with tooltip spans.
 * Uses tag-aware parsing to avoid matching inside HTML tags and data-tip attributes.
 */
export function injectGlossaryTooltips(html: string): string {
  let out = '';
  let lastIndex = 0;
  let skipDepth = 0;
  const stack: { tagName: string; skip: boolean }[] = [];
  TAG_RE.lastIndex = 0;

  for (const match of html.matchAll(TAG_RE)) {
    const tag = match[0];
    const index = match.index ?? 0;
    const text = html.slice(lastIndex, index);
    out += skipDepth > 0 ? text : wrapGlossaryText(text);
    out += tag;

    updateSkipStack(tag, stack, (delta) => {
      skipDepth = Math.max(0, skipDepth + delta);
    });
    lastIndex = index + tag.length;
  }

  const tail = html.slice(lastIndex);
  out += skipDepth > 0 ? tail : wrapGlossaryText(tail);
  return out;
}

function wrapGlossaryText(text: string): string {
  for (const term of sortedTerms) {
    const escaped = term.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const asciiTerm = /^[A-Za-z0-9-]+$/.test(term.term);
    const regex = new RegExp(
      asciiTerm ? `(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])` : escaped,
      'g',
    );
    text = text.replace(regex, () => {
      const def = termMap.get(term.term);
      if (!def) return term.term;
      return `<span class="glossary-inline" data-tip="${escapeAttr(def.fullName)}｜${escapeAttr(def.description)}">${term.term}</span>`;
    });
  }
  return text;
}

function updateSkipStack(
  tag: string,
  stack: { tagName: string; skip: boolean }[],
  updateDepth: (delta: number) => void,
) {
  const closing = tag.match(/^<\/\s*([a-z0-9-]+)/i);
  if (closing) {
    const item = stack.pop();
    if (item?.skip) updateDepth(-1);
    return;
  }

  const opening = tag.match(/^<\s*([a-z0-9-]+)/i);
  if (!opening || /\/\s*>$/.test(tag)) return;

  const tagName = opening[1].toLowerCase();
  const skip = SKIP_TAGS.has(tagName) || SKIP_CLASS_RE.test(tag);
  stack.push({ tagName, skip });
  if (skip) updateDepth(1);
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
