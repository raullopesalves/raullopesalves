import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const user = 'raullopesalves';
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'profile-stats' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
async function api(path) {
  const response = await fetch(`https://api.github.com/${path}`, { headers });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}
const profile = await api(`users/${user}`);
const repos = [];
for (let page = 1; ; page++) {
  const batch = await api(`users/${user}/repos?per_page=100&page=${page}`);
  repos.push(...batch);
  if (batch.length < 100) break;
}
const own = repos.filter(repo => !repo.fork);
const totals = {};
for (const repo of own) {
  const languages = await api(`repos/${user}/${repo.name}/languages`);
  for (const [language, bytes] of Object.entries(languages)) totals[language] = (totals[language] || 0) + bytes;
}
const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
const shown = ranked.slice(0, 5);
if (ranked.length > 5) shown.push(['Other', ranked.slice(5).reduce((sum, row) => sum + row[1], 0)]);
const sum = ranked.reduce((sum, row) => sum + row[1], 0);
const escape = text => String(text).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
const colors = ['#8b8bdf', '#58a6b8', '#caa65d', '#7fa88a', '#b78caa', '#89929b'];
function shell(width, height, body, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(label)}"><style>.bg{fill:#f6f8fa}.box{fill:#fff;stroke:#d0d7de}.text{fill:#1f2328}.muted{fill:#59636e}@media(prefers-color-scheme:dark){.bg{fill:#0d1117}.box{fill:#0d1117;stroke:#30363d}.text{fill:#e6edf3}.muted{fill:#9198a1}}text{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}</style><rect class="bg" width="100%" height="100%" rx="8"/>${body}</svg>\n`;
}
const metrics = [
  [profile.public_repos, 'public repositories'],
  [own.reduce((sum, repo) => sum + repo.stargazers_count, 0), 'stars'],
  [profile.followers, 'followers'],
  [new Date(profile.created_at).getUTCFullYear(), 'here since'],
];
const stats = metrics.map(([value, label], i) => {
  const x = 1 + i * 200;
  return `<rect class="box" x="${x}" y="1" width="188" height="106" rx="7"/><text class="text" x="${x + 18}" y="49" font-size="29" font-weight="600">${value}</text><text class="muted" x="${x + 18}" y="79" font-size="12">${label}</text>`;
}).join('');
const iconNames = { TypeScript: 'typescript', JavaScript: 'javascript', HTML: 'html5', CSS: 'css3', Java: 'java' };
const cards = [];
for (const [i, [language, bytes]] of shown.entries()) {
  const x = 2 + i % 2 * 232;
  const y = 2 + Math.floor(i / 2) * 78;
  let icon = '';
  if (iconNames[language]) {
    const source = await readFile(`assets/icons/${iconNames[language]}.svg`, 'utf8');
    const viewBox = source.match(/viewBox="([^"]+)"/)?.[1] || '0 0 128 128';
    const inner = source.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    icon = `<svg x="${x + 18}" y="${y + 19}" width="30" height="30" viewBox="${viewBox}">${inner}</svg>`;
  }
  cards.push(`<rect class="box" x="${x}" y="${y}" width="218" height="66" rx="9"/>${icon}<text class="text" x="${x + 62}" y="${y + 28}" font-size="14" font-weight="600">${escape(language)}</text><circle cx="${x + 66}" cy="${y + 46}" r="3" fill="${colors[i]}"/><text class="muted" x="${x + 77}" y="${y + 50}" font-size="12">${(bytes / sum * 100).toFixed(1)}%</text>`);
}
const radius = 79;
const circumference = 2 * Math.PI * radius;
let offset = 0;
const arcs = shown.map(([, bytes], i) => {
  const length = sum ? bytes / sum * circumference : 0;
  const arc = `<circle cx="624" cy="112" r="${radius}" fill="none" stroke="${colors[i]}" stroke-width="21" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 624 112)"/>`;
  offset += length;
  return arc;
}).join('');
const height = Math.max(248, Math.ceil(shown.length / 2) * 78 + 14);
const languageSvg = `${cards.join('')}${arcs}<text class="text" x="624" y="109" text-anchor="middle" font-size="26" font-weight="600">${ranked.length}</text><text class="muted" x="624" y="132" text-anchor="middle" font-size="12">languages</text><text class="muted" x="624" y="228" text-anchor="middle" font-size="11">share of public code bytes</text>`;
await mkdir('assets', { recursive: true });
await writeFile('assets/stats.svg', shell(790, 109, stats, metrics.map(row => row.join(' ')).join(', ')));
const graphic = shell(790, height, languageSvg, shown.map(([language, bytes]) => `${language}: ${(bytes / sum * 100).toFixed(1)}%`).join(', ') + '. Public, non-fork repositories; code bytes, not proficiency.');
const version = createHash('sha256').update(graphic).digest('hex').slice(0, 12);
await writeFile(`assets/languages-${version}.svg`, graphic);
const readme = await readFile('README.md', 'utf8');
await writeFile('README.md', readme.replace(/\.\/assets\/languages(?:-[a-f0-9]+)?\.svg/g, `./assets/languages-${version}.svg`));
console.log(`Generated cards from ${repos.length} public repositories and ${ranked.length} languages.`);
