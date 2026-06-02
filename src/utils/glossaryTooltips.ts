import { glossaryTerms } from '../data/glossary';

// Build a map of term → definition for fast lookup
const termMap = new Map<string, { fullName: string; description: string }>();
for (const t of glossaryTerms) {
  termMap.set(t.term, { fullName: t.fullName, description: t.description });
}

// Sort terms by length (longest first) to avoid partial matches
const sortedTerms = [...glossaryTerms].sort((a, b) => b.term.length - a.term.length);

/**
 * Wrap glossary terms in the content with tooltip spans.
 * Returns HTML string with inline glossary tooltips.
 */
export function injectGlossaryTooltips(html: string): string {
  // Create a regex that matches any glossary term as a whole word
  // but NOT inside HTML tags, attributes, or existing tooltips
  for (const term of sortedTerms) {
    const escaped = term.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match the term only if it's:
    // - Not inside an HTML tag (not preceded by < without closing >)
    // - Not inside a data-tip attribute
    // - Not already inside a glossary-inline span
    const regex = new RegExp(
      `(?<!<[^>]*)(?<!data-tip="[^"]*)(?<!glossary-inline">)${escaped}(?!</span>|<)`,
      'g',
    );
    html = html.replace(regex, () => {
      const def = termMap.get(term.term);
      if (!def) return term.term;
      return `<span class="glossary-inline" data-tip="${escapeAttr(def.fullName)}｜${escapeAttr(def.description)}">${term.term}</span>`;
    });
  }
  return html;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
