import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

let readme = await readFile('README.md', 'utf8');
for (const theme of ['light', 'dark']) {
  const svg = await readFile(`assets/snake-${theme}.svg`, 'utf8');
  if (!svg.includes('<svg') || !svg.includes('@keyframes')) throw new Error('Snake animation missing');
  const version = createHash('sha256').update(svg).digest('hex').slice(0, 12);
  await writeFile(`assets/snake-${theme}-${version}.svg`, svg);
  readme = readme.replace(new RegExp(`\\./assets/snake-${theme}(?:-[a-f0-9]+)?\\.svg`, 'g'), `./assets/snake-${theme}-${version}.svg`);
}
await writeFile('README.md', readme);
