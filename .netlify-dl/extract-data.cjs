const fs = require('fs');
const js = fs.readFileSync('.netlify-dl/index.js', 'utf8');

// Helper: extract a balanced bracket/brace expression
function extractBalanced(str, startPos, openChar, closeChar) {
  let depth = 0;
  let inString = false;
  for (let i = startPos; i < str.length && i < startPos + 200000; i++) {
    const ch = str[i];
    if (ch === '\\' && inString) { i++; continue; }
    if (ch === '"' && str[i-1] !== '\\') inString = !inString;
    if (inString) continue;
    if (ch === openChar) depth++;
    if (ch === closeChar) { depth--; if (depth === 0) { return { end: i, text: str.substring(startPos, i + 1) }; } }
  }
  return null;
}

function evalJs(raw) {
  if (!raw) return null;
  try {
    const fn = new Function('return ' + raw);
    return fn();
  } catch(e) {
    console.log('Eval error:', e.message.substring(0, 100));
    return null;
  }
}

// ====== 1. Glossary array ======
// Found as: const pr=[{term:"AM",...
const glossaryStart = js.indexOf('const pr=[{term:"AM"');
if (glossaryStart >= 0) {
  const arrStart = glossaryStart + 'const pr='.length;
  const result = extractBalanced(js, arrStart, '[', ']');
  if (result) {
    const glossary = evalJs(result.text);
    if (glossary) {
      console.log('Glossary: ' + glossary.length + ' terms');
      fs.writeFileSync('.netlify-dl/glossary.json', JSON.stringify(glossary, null, 2));
    }
  }
}

// ====== 2. Currency definitions ======
// Found in function _x as: s={AM:"...", IP:"...", ...}
const currencyStart = js.indexOf('AM:"反物质 (Antimatter)');
if (currencyStart >= 0) {
  let start = currencyStart;
  while (start > 0 && js[start] !== '{') start--;
  const result = extractBalanced(js, start, '{', '}');
  if (result) {
    const currencyDefs = evalJs(result.text);
    if (currencyDefs) {
      console.log('Currency defs: ' + Object.keys(currencyDefs).length + ' entries');
      fs.writeFileSync('.netlify-dl/currency-defs.json', JSON.stringify(currencyDefs, null, 2));
    }
  }
}

// ====== 3. Runes data ======
// Search for rune data structure - look for patterns like {name:"...", effect:...
const runeMarker = 'name:"时间符文"';
const runeIdx = js.indexOf(runeMarker);
console.log('Rune marker at:', runeIdx);
if (runeIdx >= 0) {
  // Find the start of the runes array
  let start = runeIdx;
  while (start > 0 && js[start] !== '[') start--;
  const result = extractBalanced(js, start, '[', ']');
  if (result) {
    console.log('Runes raw length:', result.text.length);
    console.log('Runes first 200:', result.text.substring(0, 200));
    const runes = evalJs(result.text);
    if (runes) {
      console.log('Runes: ' + runes.length + ' entries');
      fs.writeFileSync('.netlify-dl/runes.json', JSON.stringify(runes, null, 2));
    }
  }
}

// ====== 4. Achievements data ======
const achMarker = 'r11';
const achIdx = js.indexOf(achMarker);
console.log('Achievement marker at:', achIdx);
if (achIdx >= 0) {
  // Look for the achievements array
  let start = achIdx;
  while (start > 0 && js[start] !== '[') start--;
  // Check if it's actually an array of achievements
  const context = js.substring(start, start + 100);
  console.log('Ach context:', context);
  const result = extractBalanced(js, start, '[', ']');
  if (result) {
    console.log('Ach raw length:', result.text.length);
    console.log('Ach first 200:', result.text.substring(0, 200));
    const achievements = evalJs(result.text);
    if (achievements) {
      console.log('Achievements: ' + achievements.length + ' entries');
      fs.writeFileSync('.netlify-dl/achievements.json', JSON.stringify(achievements, null, 2));
    }
  }
}

// ====== 5. Term definitions (from RuneHint) ======
const termMarker = 'DILR';
const termIdx = js.indexOf(termMarker);
console.log('Term marker at:', termIdx);
if (termIdx >= 0) {
  let start = termIdx;
  while (start > 0 && js[start] !== '{') start--;
  const result = extractBalanced(js, start, '{', '}');
  if (result) {
    console.log('Term defs raw length:', result.text.length);
    console.log('Term defs first 200:', result.text.substring(0, 200));
    const termDefs = evalJs(result.text);
    if (termDefs) {
      console.log('Term defs: ' + Object.keys(termDefs).length + ' entries');
      fs.writeFileSync('.netlify-dl/term-defs.json', JSON.stringify(termDefs, null, 2));
    }
  }
}

console.log('\nDone extracting!');