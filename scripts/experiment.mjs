import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// The UTC date is the seed: the same day always has the same visitors.
const day = process.env.EXPERIMENT_DATE || new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Expected YYYY-MM-DD');
let seed = Number.parseInt(createHash('sha256').update(day).digest('hex').slice(0, 8), 16);
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
const colors = ['mint', 'blue', 'rose', 'gold', 'lilac'];
const visitors = Array.from({ length: 5 }, (_, index) => {
  const cells = [];
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 4; x++) {
      const filled = y === 0 ? x > 0 && random() > .55 : random() > .32;
      if (!filled) continue;
      cells.push(`<rect x="${x * 5}" y="${y * 5}" width="5" height="5"/>`);
      if (x !== 3) cells.push(`<rect x="${(6 - x) * 5}" y="${y * 5}" width="5" height="5"/>`);
    }
  }
  // Two eyes make even the stranger silhouettes read as tiny creatures.
  return `<g transform="translate(${177 + index * 100} 35)"><g class="visitor ${colors[index]}" style="animation-delay:-${index * .63}s">${cells.join('')}<rect class="eye" x="10" y="10" width="5" height="5"/><rect class="eye" x="20" y="10" width="5" height="5"/></g></g>`;
}).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="790" height="108" viewBox="0 0 790 108" role="img" aria-label="Five tiny pixel visitors, generated for ${day}. A different set appears each day."><style>.surface{fill:#fff;stroke:#d0d7de}.mint{fill:#287c63}.blue{fill:#367ab6}.rose{fill:#ae5278}.gold{fill:#947022}.lilac{fill:#805eb5}.eye{fill:#fff}.visitor{animation:idle 3.8s steps(2,end) infinite}@keyframes idle{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@media(prefers-color-scheme:dark){.surface{fill:#0d1117;stroke:#30363d}.mint{fill:#77d1b7}.blue{fill:#78b8fa}.rose{fill:#f18ca8}.gold{fill:#e7bc72}.lilac{fill:#b6a0ef}.eye{fill:#0d1117}}@media(prefers-reduced-motion:reduce){.visitor{animation:none}}</style><rect class="surface" x="1" y="1" width="788" height="106"/>${visitors}</svg>\n`;
const version = createHash('sha256').update(svg).digest('hex').slice(0, 12);
await mkdir('assets', { recursive: true });
await writeFile(`assets/experiment-${version}.svg`, svg);
const block = `<!-- pixel-experiment -->\n<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="./assets/experiment-${version}.svg">\n  <img src="./assets/experiment-${version}.svg" alt="Five tiny pixel visitors. A different set each day." width="100%">\n</picture>\n<!-- /pixel-experiment -->`;
const readme = await readFile('README.md', 'utf8');
await writeFile('README.md', readme.includes('<!-- pixel-experiment -->')
  ? readme.replace(/<!-- pixel-experiment -->[\s\S]*?<!-- \/pixel-experiment -->/, block)
  : `${readme.trim()}\n\n${block}\n`);
console.log(`Generated pixel visitors for ${day}.`);
