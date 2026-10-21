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
const languageColors = { TypeScript: '#3178c6', JavaScript: '#f7df1e', CSS: '#a78bfa', HTML: '#e34f26', Java: '#4db6ac', Other: '#89929b' };
const colors = shown.map(([language]) => languageColors[language] || '#89929b');
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
const badges = [];
let badgeX = 20;
let badgeY = 49;
for (const [i, [language]] of shown.entries()) {
  const width = Math.max(72, language.length * 7 + 49);
  if (badgeX + width > 314) { badgeX = 20; badgeY += 40; }
  let icon = `<circle cx="${badgeX + 17}" cy="${badgeY + 15}" r="4" fill="${colors[i]}"/>`;
  if (iconNames[language]) {
    const source = await readFile(`assets/icons/${iconNames[language]}.svg`, 'utf8');
    const viewBox = source.match(/viewBox="([^"]+)"/)?.[1] || '0 0 128 128';
    const inner = source.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    icon = `<svg x="${badgeX + 10}" y="${badgeY + 7}" width="16" height="16" viewBox="${viewBox}">${inner}</svg>`;
  }
  badges.push(`<rect x="${badgeX}" y="${badgeY}" width="${width}" height="30" rx="15" fill="${colors[i]}" fill-opacity="0.09" stroke="${colors[i]}" stroke-opacity="0.5"/>${icon}<text class="text" x="${badgeX + 34}" y="${badgeY + 20}" font-size="12">${escape(language)}</text>`);
  badgeX += width + 9;
}
const height = Math.max(208, badgeY + 60, 52 + shown.length * 26);
const centerY = 92;
const radius = 53;
const circumference = 2 * Math.PI * radius;
let offset = 0;
const arcs = shown.map(([, bytes], i) => {
  const length = sum ? bytes / sum * circumference : 0;
  const arc = `<circle cx="431" cy="${centerY}" r="${radius}" fill="none" stroke="${colors[i]}" stroke-width="19" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 431 ${centerY})"/>`;
  offset += length;
  return arc;
}).join('');
const legend = shown.map(([language, bytes], i) => {
  const y = 38 + i * 26;
  return `<circle cx="523" cy="${y - 4}" r="4" fill="${colors[i]}"/><text class="text" x="537" y="${y}" font-size="12">${escape(language)}</text><text class="muted" x="767" y="${y}" text-anchor="end" font-size="12">${(bytes / sum * 100).toFixed(1)}%</text>`;
}).join('');
const languageSvg = `<rect class="box" x="1" y="1" width="329" height="${height - 2}" rx="8"/><rect class="box" x="348" y="1" width="440" height="${height - 2}" rx="8"/><text class="muted" x="20" y="29" font-size="11" font-weight="600" letter-spacing="0.7">LANGUAGES</text>${badges.join('')}${arcs}<text class="muted" x="431" y="97" text-anchor="middle" font-size="12">${ranked.length} langs</text>${legend}<text class="muted" x="368" y="${height - 20}" font-size="11">public repos · share of code bytes</text>`;
await mkdir('assets', { recursive: true });
await writeFile('assets/stats.svg', shell(790, 109, stats, metrics.map(row => row.join(' ')).join(', ')));
const graphic = shell(790, height, languageSvg, shown.map(([language, bytes]) => `${language}: ${(bytes / sum * 100).toFixed(1)}%`).join(', ') + '. Public, non-fork repositories; code bytes, not proficiency.');
const version = createHash('sha256').update(graphic).digest('hex').slice(0, 12);
await writeFile(`assets/languages-${version}.svg`, graphic);
const readme = await readFile('README.md', 'utf8');
await writeFile('README.md', readme.replace(/\.\/assets\/languages(?:-[a-f0-9]+)?\.svg/g, `./assets/languages-${version}.svg`));
console.log(`Generated cards from ${repos.length} public repositories and ${ranked.length} languages.`);
