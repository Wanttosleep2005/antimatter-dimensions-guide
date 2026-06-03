import { getRune, decodeBraille, RUNE_COLORS, RUNES } from '../data/runes';

/** Infer rune letter from braille dot pattern by finding which rune has matching effects */
function inferRuneFromBraille(braille: string): string {
  if (!braille) return '';
  const effects = decodeBraille(braille);
  if (effects.length === 0) return '';
  // Try to match effects to a specific rune
  for (const r of RUNES) {
    const runeEffectIds = Object.keys(r.effects).map(Number);
    if (effects.every((id) => runeEffectIds.includes(id))) return r.letter;
  }
  return '';
}

// Inline abbreviation definitions with colors
const currencyDefs: Record<string, { label: string; color: string }> = {
  AM:  { label: '反物质 (Antimatter)', color: '#8b5cf6' },
  IP:  { label: '无限点数 (Infinity Points)', color: '#06b6d4' },
  EP:  { label: '永恒点数 (Eternity Points)', color: '#f59e0b' },
  TT:  { label: '时间定理 (Time Theorems)', color: '#a78bfa' },
  DT:  { label: '膨胀时间 (Dilated Time)', color: '#22d3ee' },
  RM:  { label: '现实机器 (Reality Machines)', color: '#f472b6' },
  IM:  { label: '虚数机器 (Imaginary Machines)', color: '#c084fc' },
  RS:  { label: '现实碎片 (Reality Shards)', color: '#e879f9' },
  TP:  { label: '超光速粒子 (Tachyon Particles)', color: '#38bdf8' },
  TC:  { label: '时间研究 (Time Studies)', color: '#818cf8' },
  AP:  { label: '自动机点数 (Automator Points)', color: '#a78bfa' },
  RU:  { label: '现实升级 (Reality Upgrades)', color: '#fb923c' },
  PP:  { label: '复兴点 (Perk Points)', color: '#fbbf24' },
  AD:  { label: '反物质维度乘数 (AD)', color: '#ef4444' },
};

// Guild tree node definitions with category colors
const guildTermDefs: Record<string, { label: string; color: string }> = {
  // ── Purple ──
  ECB:   { label: '复兴树节点', color: '#a855f7' },
  ECR:   { label: '复兴树节点', color: '#a855f7' },
  EC1R:  { label: '复兴树节点', color: '#a855f7' },
  EC2R:  { label: '复兴树节点', color: '#a855f7' },
  EC3R:  { label: '复兴树节点', color: '#a855f7' },
  EC5R:  { label: '复兴树节点', color: '#a855f7' },
  ACT:   { label: '复兴树节点', color: '#a855f7' },
  PASS:  { label: '复兴树节点', color: '#a855f7' },
  IDL:   { label: '复兴树节点', color: '#a855f7' },
  EU1:   { label: '复兴树节点', color: '#a855f7' },
  EU2:   { label: '复兴树节点', color: '#a855f7' },
  SEP1:  { label: '复兴树节点', color: '#a855f7' },
  SEP2:  { label: '复兴树节点', color: '#a855f7' },
  SEP3:  { label: '复兴树节点', color: '#a855f7' },
  ATT:   { label: '复兴树节点', color: '#a855f7' },
  ATP:   { label: '复兴树节点', color: '#a855f7' },
  // ── Red ──
  TTS:   { label: '复兴树节点', color: '#ef4444' },
  TTF:   { label: '复兴树节点', color: '#ef4444' },
  TTM:   { label: '复兴树节点', color: '#ef4444' },
  PEC1:  { label: '复兴树节点', color: '#ef4444' },
  PEC2:  { label: '复兴树节点', color: '#ef4444' },
  PEC3:  { label: '复兴树节点', color: '#ef4444' },
  IDAS:  { label: '复兴树节点', color: '#ef4444' },
  REPAS: { label: '复兴树节点', color: '#ef4444' },
  DAU:   { label: '复兴树节点', color: '#ef4444' },
  DAB:   { label: '复兴树节点', color: '#ef4444' },
  DAS:   { label: '复兴树节点', color: '#ef4444' },
  TGR:   { label: '复兴树节点', color: '#ef4444' },
  // ── Gold ──
  ACH1:  { label: '复兴树节点', color: '#f59e0b' },
  ACH2:  { label: '复兴树节点', color: '#f59e0b' },
  ACH3:  { label: '复兴树节点', color: '#f59e0b' },
  ACH4:  { label: '复兴树节点', color: '#f59e0b' },
  ACHNR: { label: '复兴树节点', color: '#f59e0b' },
  // ── Brown ──
  SIP1:  { label: '复兴树节点', color: '#a07040' },
  SIP2:  { label: '复兴树节点', color: '#a07040' },
  IDR:   { label: '复兴树节点', color: '#a07040' },
  // ── Green/Indigo ──
  START: { label: '复兴树节点', color: '#22c55e' },
  SAM:   { label: '复兴树节点', color: '#22c55e' },
  ANR:   { label: '复兴树节点', color: '#6366f1' },
  STP:   { label: '复兴树节点', color: '#22c55e' },
  REAL:  { label: '复兴树节点', color: '#22c55e' },
  DILR:  { label: '复兴树节点', color: '#6366f1' },
  TP1:   { label: '复兴树节点', color: '#6366f1' },
  TP2:   { label: '复兴树节点', color: '#6366f1' },
  TP3:   { label: '复兴树节点', color: '#6366f1' },
  TP4:   { label: '复兴树节点', color: '#6366f1' },
  DU1:   { label: '复兴树节点', color: '#6366f1' },
  DU2:   { label: '复兴树节点', color: '#6366f1' },
  ATD:   { label: '复兴树节点', color: '#a855f7' },
  CYER:  { label: '复兴树节点', color: '#6366f1' },
};

// Build dynamic game term regex from guild terms
const GUILD_TERMS = Object.keys(guildTermDefs).sort((a, b) => b.length - a.length).join('|');
const GAME_TERM_RE = new RegExp(
  `\\b(EC\\d+|C\\d+|IC\\d+|IU\\d+|PU\\d+|Cel\\d+|TS\\d+|ID\\d+|r\\d{2,3}|RU\\d+|TD\\d+|TP\\d+|ACH\\d+|IM\\d+|${GUILD_TERMS}|AM|IP|EP|TT|DT|RM|IM|RS|TP|TC|AP|RU|PP|AD)\\b`,
  'g',
);

// Currency abbreviation regex. Do not capture numbered terms like RU11/TS181.
const CURRENCY_RE = /(?<![a-zA-Z])(AM|IP|EP|TT|DT|RM|IM|RS|TP|TC|AP|RU|PP|AD)(?![a-zA-Z0-9])/g;

// Rune combo: 3-6 rune letters in sequence (ETRIP, RRRRD, YETTT, CCCET, etc.).
// Two-letter resources like IP/TT/DT/TP are handled as currencies instead.
const RUNE_COMBO_RE = /(?<![a-zA-Z<>])([CPITRDEY]{3,6})(?![a-zA-Z<>])/g;
const RUNE_COMBO_EXCLUDES = new Set([
  ...Object.keys(currencyDefs),
  ...Object.keys(guildTermDefs),
]);

// Rune spec: letter + braille + level — R⠴(134), D⠆(12)
// Also matches standalone braille specs like ⠔(13) without letter prefix
const RUNE_SPEC_RE_HTML = /([PITRDEY])?([⠁-⣿]+)\((\d+)\)/g;

// Scientific notation
const SCI_RE = /(\d+(?:\.\d+)?e\d+)/g;

// URL regex
const URL_RE = /(https?:\/\/[^\s，。》）\]]+)/g;

// Achievement format: r1122 -> r11 r22
const ACH_RE = /r(\d{2})((?:\/\d{2})+)/g;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Protect existing HTML tags from subsequent regex replacements.
// Returns { text: string with placeholders, tags: original HTML fragments }
function protectTags(s: string) {
  const tags: string[] = [];
  const text = s.replace(/<[^>]+>/g, (tag) => {
    tags.push(tag);
    return `\x00${tags.length - 1}\x00`;
  });
  return { text, tags };
}

// Restore protected HTML tags from placeholders
function restoreTags(s: string, tags: string[]) {
  return s.replace(/\x00(\d+)\x00/g, (_, i) => tags[parseInt(i)]);
}

/** Build rune spec tooltip HTML — full rich tooltip like original G0 component */
function buildRuneTooltip(letter: string, braille: string, level: number): string {
  const rune = getRune(letter);
  if (!rune) return escapeAttr(letter + braille + '(' + level + ')');

  const activeEffects = braille ? decodeBraille(braille) : [];
  const activeSet = new Set(activeEffects);
  const allEffects = Object.entries(rune.effects);

  const effectsList = allEffects.map(([id, desc]) => {
    const isActive = activeSet.has(Number(id));
    const check = isActive ? ' <span class="rune-tip-check">&#10003;</span>' : '';
    return `<div class="rune-tip-row${isActive ? ' rune-tip-active' : ''}"><span class="rune-tip-id">${id}</span><span class="rune-tip-desc">${escapeAttr(desc)}</span>${check}</div>`;
  }).join('');

  const activeSection = activeEffects.length > 0
    ? `<div class="rune-tip-section">
        <div class="rune-tip-label">已激活词条 (${activeEffects.join(',')})</div>
        ${activeEffects.map(id => `<div class="rune-tip-active-effect">&#8226; ${escapeAttr(rune.effects[id] || '')}</div>`).join('')}
       </div>`
    : (!braille
        ? '<div class="rune-tip-nobraille">（无盲文 — 所有基础词条均激活）</div>'
        : '');

  return `<span class="rune-tooltip-content">
    <div class="rune-tip-header">
      <span class="rune-tip-letter">${letter}</span>
      <span>${rune.name}符文</span>
      <span class="rune-tip-level">Lv.${level}</span>
    </div>
    ${activeSection}
    <div class="rune-tip-section">
      <div class="rune-tip-label">全部词条</div>
      ${effectsList}
    </div>
  </span>`;
}

/** Build rune combo tooltip */
function buildComboTooltip(combo: string): string {
  const letters = combo.split('');
  const runeNames = letters.map(l => {
    const r = getRune(l);
    if (r) return `<span style="color:${RUNE_COLORS[l] || '#fff'}">${r.name}</span>`;
    if (l === 'C') return `<span style="color:${RUNE_COLORS.C}">诅咒</span>`;
    return l;
  }).join(' ');
  return `<span class="rune-tooltip-content"><div class="rune-tip-header">符文组合</div><div class="rune-tip-combo">${runeNames}</div></span>`;
}

function getGameTermTip(term: string): string | null {
  if (/^RU\d+$/.test(term)) return `现实升级 ${term} — Reality Upgrade`;
  if (/^DU\d+$/.test(term)) return `膨胀升级 ${term} — Dilation Upgrade`;
  if (/^IU\d+$/.test(term)) return `虚幻升级 ${term} — Imaginary Upgrade`;
  if (/^PU\d+$/.test(term)) return `佩勒升级 ${term} — Pelle Upgrade`;
  if (/^TS\d+$/.test(term)) return `时间研究 ${term} — Time Study`;
  if (/^TD\d+$/.test(term)) return `时间维度 ${term} — Time Dimension`;
  if (/^ID\d+$/.test(term)) return `无限维度 ${term} — Infinity Dimension`;
  if (/^EC\d+$/.test(term)) return `永恒挑战 ${term} — Eternity Challenge`;
  if (/^IC\d+$/.test(term)) return `无限挑战 ${term} — Infinity Challenge`;
  if (/^C\d+$/.test(term)) return `普通挑战 ${term} — Challenge`;
  if (/^Cel\d+$/.test(term)) return `天界层 ${term} — Celestial`;
  if (/^ACH\d+$/.test(term)) return `成就 ${term}`;
  return null;
}

/**
 * Full text processing pipeline:
 * 0. Achievement format normalization
 * 1. Search highlight
 * 2. Currency abbreviations → tooltip (MUST be before rune — IP/EP/TT/DT/TP/PP overlap)
 * 3. Rune spec (R⠴(134)) → full tooltip spans
 * 4. Rune combo (RRRDD) → colored spans (now safe: currencies already wrapped)
 * 5. Scientific notation
 * 6. Guild term highlighting
 * 7. URLs → links
 */
export function highlightTerms(text: string, searchQuery?: string, achievementHighlight?: string): string {
  let s = text;

  // Step 0: Normalize achievement format r1122 -> r11 r22
  s = s.replace(ACH_RE, (_, base, suffixes) => {
    const parts = suffixes.split('/').filter(Boolean);
    return 'r' + base + ' ' + parts.map((p: string) => 'r' + p).join(' ');
  });

  // Step 0.1: Normalize game term casing (ru52 → RU52, du1 → DU1, etc.)
  s = s.replace(/\b(ru|du|iu|pu|ts|ec|ic|td|id|cel)(\d+)\b/gi,
    (_, prefix, num) => prefix.toUpperCase() + num
  );

  // Step 0.5: Achievement highlight (before search highlight, separate color)
  if (achievementHighlight && achievementHighlight.trim()) {
    const escaped = escapeRegex(achievementHighlight.trim());
    const re = new RegExp(`(${escaped})`, 'gi');
    let count = 0;
    s = s.replace(re, (match) => {
      const cls = count === 0 ? 'achievement-query-highlight achievement-query-highlight-first' : 'achievement-query-highlight';
      count++;
      return `<mark class="${cls}">${match}</mark>`;
    });
  }

  // Step 1: Search query highlighting (before other processing)
  if (searchQuery && searchQuery.trim()) {
    const escaped = escapeRegex(searchQuery.trim());
    const re = new RegExp(`(${escaped})`, 'gi');
    let count = 0;
    s = s.replace(re, (match) => {
      const cls = count === 0 ? 'search-highlight search-highlight-first' : 'search-highlight';
      count++;
      return `<mark class="${cls}">${match}</mark>`;
    });
  }

  // Step 2: Currency abbreviations — MUST come before rune combo
  // (IP/EP/TT/DT/TP/PP would otherwise be captured as rune combos)
  s = s.replace(CURRENCY_RE, (match, abbr: string) => {
    if (match.includes('<')) return match;
    const def = currencyDefs[abbr];
    if (!def) return match;
    return `<span class="currency-inline" style="color:${def.color};border-color:${def.color}" data-tip="${escapeAttr(def.label)}">${abbr}</span>`;
  });

  // Step 3: Rune specs (R⠴(134), D⠆(12), standalone ⠔(13)) → full tooltip spans
  s = s.replace(RUNE_SPEC_RE_HTML, (match, letter, braille, levelStr) => {
    if (match.includes('<')) return match;
    const brailleStr = braille || '';
    const level = parseInt(levelStr);

    // If no letter prefix, infer from braille + context
    let runeLetter = letter || '';
    if (!runeLetter) {
      runeLetter = inferRuneFromBraille(brailleStr);
    }

    const color = RUNE_COLORS[runeLetter] || '#a855f7';
    const rune = getRune(runeLetter);
    const label = rune ? `${rune.name}符文` : runeLetter;
    return `<span class="rune-spec group">
      <span class="rune-spec-label" style="border-color:${color};color:${color}" title="${escapeAttr(label)} Lv.${level}">
        ${runeLetter}${brailleStr}(${level})
      </span>
      <span class="rune-tooltip">${buildRuneTooltip(runeLetter, brailleStr, level)}</span>
    </span>`;
  });

  // Step 4: Rune combos (RRRDD, RRRRD) — safe now, currencies already wrapped
  s = s.replace(RUNE_COMBO_RE, (match) => {
    if (match.includes('<')) return match;
    if (RUNE_COMBO_EXCLUDES.has(match)) return match;
    const letters = match.split('');
    const colored = letters.map(l => {
      const color = RUNE_COLORS[l] || '#fff';
      return `<span style="color:${color}">${l}</span>`;
    }).join('');
    return `<span class="rune-combo group">${colored}<span class="rune-tooltip">${buildComboTooltip(match)}</span></span>`;
  });

  // Steps 5-7: Must NOT touch text inside HTML tags (data-tip attributes etc.)
  // Protect all HTML, run safe regexes, then restore
  const { text: protected_, tags: htmlTags } = protectTags(s);
  let sp = protected_;

  // Step 5: Scientific notation numbers
  sp = sp.replace(SCI_RE, '<code class="number-format">$1</code>');

  // Step 6: Game term highlighting with tooltips
  sp = sp.replace(GAME_TERM_RE, (match) => {
    if (match.includes('<')) return match;
    if (currencyDefs[match]) return match;
    if (/^r\d{2,3}$/.test(match)) {
      const achNum = match.slice(1);
      return `<span class="game-term" data-tip="成就 r${achNum} — Achievement">${match}</span>`;
    }
    // DU1/DU2: default to 膨胀升级 (dilation upgrade), not reality tree node
    if (/^DU[12]$/.test(match)) {
      const gameTip = getGameTermTip(match);
      return `<span class="game-term" data-tip="${escapeAttr(gameTip || `膨胀升级 ${match}`)}">${match}</span>`;
    }
    const guildDef = guildTermDefs[match];
    if (guildDef) {
      return `<span class="game-term" style="color:${guildDef.color};background:${guildDef.color}18;border-color:${guildDef.color}66" data-tip="${escapeAttr(guildDef.label)}">${match}</span>`;
    }
    const gameTip = getGameTermTip(match);
    if (gameTip) {
      return `<span class="game-term" data-tip="${escapeAttr(gameTip)}">${match}</span>`;
    }
    return `<span class="game-term">${match}</span>`;
  });

  // Step 7: URLs → clickable links
  sp = sp.replace(URL_RE, (url) => {
    if (url.includes('<')) return url;
    return `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer" class="text-[var(--accent2-color)] underline">${url}</a>`;
  });

  s = restoreTags(sp, htmlTags);
  return s;
}
