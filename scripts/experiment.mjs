import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Pixel glyph shapes follow the Standard Galactic Alphabet bitmap layout.
// Kept as paths so GitHub needs no font and exposes no plaintext SVG text.
const day = process.env.EXPERIMENT_DATE || new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Expected YYYY-MM-DD');
const epochDay = Date.parse(day + 'T00:00:00Z') / 86400000;
if (!Number.isInteger(epochDay)) throw new Error('Invalid date');
const messages = [
  'curious huh?',
  'you really translated this?',
  'was it worth it?',
  'all that effort for this',
  'yes this is the whole message',
  'you could have gone outside',
  'there is no prize',
  'look at you reading symbols',
  'congratulations i guess',
  'this looked smarter untranslated',
  'great use of your time',
  'the secret is there is no secret',
  'you expected lore?',
  'please pretend this was profound',
  'another day another pointless message',
  'imagine putting this on a resume',
  'you checked again?',
  'this counts as content apparently',
  'i had nothing better to write',
  'you had nothing better to do?',
  'the font did most of the work',
  'deeply unnecessary well done',
  'you can stop translating now',
  'no hidden job offer sorry',
  'this is the easter egg budget',
  'some mysteries should stay mysteries',
  'not everything needs decoding',
  'surely there was an easier hobby',
  'the translation was the entire activity',
  'same nonsense different alphabet',
  'see you tomorrow apparently',
];
const message = messages[((epochDay % messages.length) + messages.length) % messages.length];
const { glyphs } = JSON.parse(await readFile('assets/sga-glyphs.json', 'utf8'));
const tracking = 75;
const width = [...message].reduce((sum, letter) => sum + (glyphs[letter]?.advance || 400) + tracking, -tracking);
const scale = Math.min(.065, 690 / width);
let cursor = 0;
const paths = [...message].map(letter => {
  const glyph = glyphs[letter] || { path: "M100 700h300v-100h-200v-100h-100v200ZM100 300h100v-100h-100Z", advance: 400 };
  const path = glyph.path ? '<path transform="translate(' + cursor + ' 0)" d="' + glyph.path + '"/>' : '';
  cursor += glyph.advance + tracking;
  return path;
}).join('');
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="790" height="86" viewBox="0 0 790 86" role="img" aria-label="A daily message in Standard Galactic Alphabet."><style>.surface{fill:#fff;stroke:#d0d7de}.glyph{fill:#456c66}@media(prefers-color-scheme:dark){.surface{fill:#0d1117;stroke:#30363d}.glyph{fill:#8ac9b6}}</style><rect class="surface" x="1" y="1" width="788" height="84"/><g class="glyph" shape-rendering="crispEdges" transform="translate(' + ((790 - width * scale) / 2) + ' ' + (43 + 450 * scale) + ') scale(' + scale + ' ' + (-scale) + ')">' + paths + '</g></svg>\n';
const version = createHash('sha256').update(svg).digest('hex').slice(0, 12);
await mkdir('assets', { recursive: true });
await writeFile('assets/experiment-' + version + '.svg', svg);
const block = '<!-- pixel-experiment -->\n<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="./assets/experiment-' + version + '.svg">\n  <img src="./assets/experiment-' + version + '.svg" alt="A daily message in Standard Galactic Alphabet." width="100%">\n</picture>\n<!-- /pixel-experiment -->';
const readme = await readFile('README.md', 'utf8');
await writeFile('README.md', readme.includes('<!-- pixel-experiment -->')
  ? readme.replace(/<!-- pixel-experiment -->[\s\S]*?<!-- \/pixel-experiment -->/, block)
  : readme.trim() + '\n\n' + block + '\n');
console.log('Generated daily glyph message for ' + day + '.');
