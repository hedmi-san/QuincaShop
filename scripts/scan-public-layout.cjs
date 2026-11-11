const fs = require('fs');

function scanFile(filePath) {
  console.log(`\n================ SCANNING ${filePath} ================`);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  function scan(regex, label) {
    const matches = [];
    lines.forEach((line, idx) => {
      if (regex.test(line)) {
        matches.push({ lineNum: idx + 1, text: line.trim() });
      }
    });
    console.log(`=== ${label} (${matches.length} hits) ===`);
    matches.forEach(m => console.log(`L${m.lineNum}: ${m.text}`));
  }

  scan(/#[0-9a-fA-F]{3,8}\b/, 'Hex colors outside tokens');
  scan(/style=|:style=/, 'Inline styles');
  scan(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'Emoji');
  scan(/<(button|select|input)\b/, 'Bare controls');
  scan(/\b(PENDING|ACTIVE|SUSPENDED|REJECTED|DZD)\b/, 'Raw enums / DZD');
  scan(/[\uFFFD]|Ã[©¨]/, 'Mojibake');
  scan(/→|←/, 'Arrow on buttons/links');
}

scanFile('frontend/src/layouts/PublicLayout.vue');
scanFile('frontend/src/views/public/PublicCatalogView.vue');
