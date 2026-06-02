const fs = require('fs');
const js = fs.readFileSync('.netlify-dl/index.js', 'utf8');

// Find the glossary array
const idx = js.indexOf('{term:"AM"');
if (idx < 0) {
  console.log('Glossary start not found');
  process.exit(1);
}

// Go backwards to find the opening [
let start = idx;
while (start > 0 && js[start] !== '[') start--;

// Go forward to find the closing ]
let depth = 0;
let inString = false;
let lastClose = idx;
for (let i = idx; i < js.length && i < idx + 50000; i++) {
  const ch = js[i];
  if (ch === '\\' && inString) { i++; continue; }
  if (ch === '"' && js[i-1] !== '\\') inString = !inString;
  if (inString) continue;
  if (ch === '[') depth++;
  if (ch === ']') { depth--; if (depth === 0) { lastClose = i; break; } }
}

console.log('Glossary array start:', start);
console.log('Glossary array end:', lastClose);

const glossaryJson = js.substring(start, lastClose + 1);
console.log('Length:', glossaryJson.length);

try {
  const parsed = JSON.parse(glossaryJson);
  console.log('Parsed! Terms count:', parsed.length);
  parsed.slice(0, 5).forEach(t => console.log(' ', t.term, '->', t.fullName || t.description));
  // Write to file
  fs.writeFileSync('.netlify-dl/glossary.json', JSON.stringify(parsed, null, 2));
  console.log('Written to .netlify-dl/glossary.json');
} catch(e) {
  console.log('Parse error:', e.message);
  console.log('First 300 chars:', glossaryJson.substring(0, 300));
  console.log('Last 300 chars:', glossaryJson.substring(glossaryJson.length - 300));
}