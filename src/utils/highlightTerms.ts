import { getRune, decodeBraille, RUNE_COLORS } from '../data/runes';

// Inline abbreviation definitions with colors
const currencyDefs: Record<string, { label: string; color: string }> = {
  AM:  { label: '反物质 (Antimatter) — 游戏最基础货币，通过维度产生', color: '#8b5cf6' },
  IP:  { label: '无限点数 (Infinity Points) — 到达1e308AM后大坍缩获得', color: '#06b6d4' },
  EP:  { label: '永恒点数 (Eternity Points) — 完成永恒后获得', color: '#f59e0b' },
  TT:  { label: '时间定理 (Time Theorems) — 解锁时间研究树的资源', color: '#a78bfa' },
  DT:  { label: '膨胀时间 (Dilated Time) — 时间膨胀机制中的特殊资源', color: '#22d3ee' },
  RM:  { label: '现实机器 (Reality Machines) — 完成现实后获得', color: '#f472b6' },
  IM:  { label: '虚数机器 (Imaginary Machines) — Cel5+ 阶段专用资源', color: '#c084fc' },
  RS:  { label: '现实碎片 (Reality Shards) — 天界层阶段的特殊资源', color: '#e879f9' },
  TP:  { label: '超光速粒子 (Tachyon Particles) — 时间膨胀阶段资源', color: '#38bdf8' },
  TC:  { label: '时间研究 (Time Studies) — 研究树中的各项研究', color: '#818cf8' },
  AP:  { label: '自动机点数 (Automator Points) — 用于解锁自动机相关功能', color: '#a78bfa' },
  RU:  { label: '现实升级 (Reality Upgrades) — 使用现实机器购买的永久升级', color: '#fb923c' },
  PP:  { label: '复兴点 (Perk Points) — 用于购买复兴树节点', color: '#fbbf24' },
  AD:  { label: '反物质维度乘数 (AD) — 符文P的词条效果', color: '#ef4444' },
};

// Guild tree node definitions (from original q0)
const guildTermDefs: Record<string, string> = {
  DILR: '复兴树节点 — 膨胀相关保留/自动化',
  TTM: '复兴树节点 — 时间之理相关',
  ACHNR: '复兴树节点 — 成就保留相关',
  ECB: '复兴树节点 — 永恒挑战保留相关',
  ECR: '复兴树节点 — 永恒挑战相关',
  TTF: '复兴树节点 — 时间之理相关',
  TTS: '复兴树节点 — 时间研究相关',
  TGR: '复兴树节点 — 时间膨胀/超光速相关',
  ACT: '复兴树节点 — 自动化相关',
  ATT: '复兴树节点 — 自动化相关',
  ATD: '复兴树节点 — 自动化相关',
  REAL: '复兴树节点 — 现实 (Reality) 解锁相关',
  PASS: '复兴树节点 — 被动路径相关',
  MATTER: '复兴树节点 — 反物质相关',
  START: '复兴树节点 — 早期现实起始',
  YOUNG: '复兴树节点 — 早期现实任务',
  DM: '复兴树节点 — 暗物质/维度相关',
  DR: '复兴树节点 — 现实/膨胀相关',
  DAU: '复兴树节点 — 膨胀升级自动化',
  CYER: '复兴树节点 — 天界/现实阶段',
  EU1: '复兴树节点 — 永恒升级相关',
  EU2: '复兴树节点 — 永恒升级相关',
};

// Game term regex — multi-letter terms only (single letters handled by rune processing)
const GAME_TERM_RE = /\b(EC\d+|C\d+|IC\d+|IU\d+|PU\d+|Cel\d+|TS\d+|ID\d+|r\d{2,3}|RU\d+|DU\d+|EU\d+|TD\d+|TP\d+|ACH\d+|IM\d+|DILR|TTM|ACHNR|ECB|ECR|TTF|TTS|TGR|ACT|ATT|ATD|REAL|PASS|MATTER|START|YOUNG|DM|DR|DAU|CYER|AM|IP|EP|TT|DT|RM|IM|RS|TP|TC|AP|RU|PP|AD)\b/g;

// Currency abbreviation regex. Do not capture numbered terms like RU11/TS181.
const CURRENCY_RE = /(?<![a-zA-Z])(AM|IP|EP|TT|DT|RM|IM|RS|TP|TC|AP|RU|PP|AD)(?![a-zA-Z0-9])/g;

// Rune combo: 3-6 rune letters in sequence (ETRIP, RRRRD, YETTT, CCCET, etc.).
// Two-letter resources like IP/TT/DT/TP are handled as currencies instead.
const RUNE_COMBO_RE = /(?<![a-zA-Z<>])([CPITRDEY]{3,6})(?![a-zA-Z<>])/g;
const RUNE_COMBO_EXCLUDES = new Set([
  ...Object.keys(currencyDefs),
  ...Object.keys(guildTermDefs),
  'REAL',
  'PASS',
  'START',
  'YOUNG',
  'MATTER',
]);

// Rune spec: letter + braille + level — R⠴(134), D⠆(12)
const RUNE_SPEC_RE_HTML = /([PITRDEY])([⠁-⣿]+)?\((\d+)\)/g;

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
  // EU1/2 are perk (复兴) nodes, not eternity upgrades
  if (/^EU\d+$/.test(term)) return `复兴节点 ${term} — Perk Tree Node`;
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
export function highlightTerms(text: string, searchQuery?: string): string {
  let s = text;

  // Step 0: Normalize achievement format r1122 -> r11 r22
  s = s.replace(ACH_RE, (_, base, suffixes) => {
    const parts = suffixes.split('/').filter(Boolean);
    return 'r' + base + ' ' + parts.map((p: string) => 'r' + p).join(' ');
  });

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

  // Step 3: Rune specs (R⠴(134), D⠆(12)) → full tooltip spans
  s = s.replace(RUNE_SPEC_RE_HTML, (match, letter, braille, levelStr) => {
    if (match.includes('<')) return match;
    const brailleStr = braille || '';
    const level = parseInt(levelStr);
    const color = RUNE_COLORS[letter] || '#a855f7';
    const rune = getRune(letter);
    const label = rune ? `${rune.name}符文` : letter;
    return `<span class="rune-spec group">
      <span class="rune-spec-label" style="border-color:${color};color:${color}" title="${escapeAttr(label)} Lv.${level}">
        ${letter}${brailleStr}(${level})
      </span>
      <span class="rune-tooltip">${buildRuneTooltip(letter, brailleStr, level)}</span>
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
    const tip = guildTermDefs[match];
    if (tip) {
      return `<span class="game-term" data-tip="${escapeAttr(tip)}">${match}</span>`;
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
