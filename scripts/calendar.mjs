import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

let readme = await readFile('README.md', 'utf8');

for (const [theme, source, background] of [
  ['dark', 'profile-night-green.svg', '#0d1117'],
  ['light', 'profile-green.svg', '#ffffff'],
]) {
  const svg = await readFile(`profile-3d-contrib/${source}`, 'utf8');
  const start = svg.indexOf('<g>');
  if (start < 0) throw new Error('Calendar group missing');
  let depth = 0;
  let end;
  for (const match of svg.slice(start).matchAll(/<g(?:\s[^>]*)?>|<\/g>/g)) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) {
      end = start + match.index + match[0].length;
      break;
    }
  }
  if (!end) throw new Error('Incomplete calendar SVG');
  const style = svg.match(/<style>[\s\S]*?<\/style>/)?.[0];
  if (!style) throw new Error('Calendar styles missing');
  const output = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="440" viewBox="0 240 1280 440" role="img" aria-label="3D contribution calendar">${style}<rect x="0" y="240" width="1280" height="440" fill="${background}"/><g transform="rotate(-20 640 425)">${svg.slice(start, end)}</g></svg>`;
  await writeFile(`assets/contributions-${theme}.svg`, output);
  const version = createHash('sha256').update(output).digest('hex').slice(0, 12);
  readme = readme.replace(new RegExp(`\\./assets/contributions-${theme}\\.svg(?:\\?v=[a-f0-9]+)?`, 'g'), `./assets/contributions-${theme}.svg?v=${version}`);
}
await writeFile('README.md', readme);
