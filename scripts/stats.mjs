import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const user = 'raullopesalves';
const includePrivate = process.env.INCLUDE_PRIVATE === 'true';
if (includePrivate && !process.env.GITHUB_TOKEN) throw new Error('Private language access requires a token');
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'profile-stats' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
async function api(path) {
  const response = await fetch(`https://api.github.com/${path}`, { headers });
  if (!response.ok) throw new Error(`GitHub statistics request failed: ${response.status}`);
  return response.json();
}
const profile = await api(`users/${user}`);
const repos = [];
for (let page = 1; ; page++) {
  const batch = await api(includePrivate ? `user/repos?affiliation=owner&visibility=all&per_page=100&page=${page}` : `users/${user}/repos?per_page=100&page=${page}`);
  repos.push(...batch);
  if (batch.length < 100) break;
}
const own = repos.filter(repo => !repo.fork && repo.owner.login.toLowerCase() === user.toLowerCase());
const totals = {};
for (const repo of own) {
  const languages = await api(`repos/${user}/${repo.name}/languages`);
  for (const [language, bytes] of Object.entries(languages)) totals[language] = (totals[language] || 0) + bytes;
}
const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
const totalBytes = ranked.reduce((sum, row) => sum + row[1], 0);
const shown = ranked.filter(([, bytes]) => bytes / totalBytes >= 0.02);
const otherBytes = ranked.filter(([, bytes]) => bytes / totalBytes < 0.02).reduce((sum, row) => sum + row[1], 0);
if (otherBytes) shown.push(['Other', otherBytes]);
const percentage = bytes => bytes / totalBytes * 100 < 0.1 ? '&lt;0.1' : (bytes / totalBytes * 100).toFixed(1);
const sum = ranked.reduce((sum, row) => sum + row[1], 0);
const escape = text => String(text).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
const languageColors = { TypeScript: '#3178c6', JavaScript: '#f7df1e', Python: '#56b6c2', Rust: '#dea584', 'C#': '#b175c2', CSS: '#a78bfa', HTML: '#e34f26', Java: '#4db6ac', Papyrus: '#e6a0c4', PowerShell: '#78a9e6', NSIS: '#adc56c', Other: '#89929b' };
const colors = shown.map(([language], i) => languageColors[language] || `hsl(${(i * 137.5) % 360}, 55%, 62%)`);
function shell(width, height, body, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(label)}"><style>.bg{fill:#ffffff}.box{fill:#fff;stroke:#d0d7de}.text{fill:#1f2328}.muted{fill:#59636e}@media(prefers-color-scheme:dark){.bg{fill:#0d1117}.box{fill:#0d1117;stroke:#30363d}.text{fill:#e6edf3}.muted{fill:#9198a1}}text{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}</style><rect class="bg" width="100%" height="100%"/>${body}</svg>\n`;
}
const metrics = [
  [profile.public_repos, 'public repositories'],
  [own.filter(repo => !repo.private).reduce((sum, repo) => sum + repo.stargazers_count, 0), 'stars'],
  [profile.followers, 'followers'],
  [new Date(profile.created_at).getUTCFullYear(), 'here since'],
];
const stats = metrics.map(([value, label], i) => {
  const x = 1 + i * 200;
  return `<rect class="box" x="${x}" y="1" width="188" height="106"/><text class="text" x="${x + 18}" y="49" font-size="29" font-weight="600">${value}</text><text class="muted" x="${x + 18}" y="79" font-size="12">${label}</text>`;
}).join('');
const iconNames = { TypeScript: 'typescript', JavaScript: 'javascript', Python: 'python', Rust: 'rust', 'C#': 'csharp', HTML: 'html5', CSS: 'css3', Java: 'java', PowerShell: 'powershell' };
const badges = [];
const nicheLanguages = new Set(['Papyrus', 'NSIS']);
const badgeLanguages = ranked.filter(([language]) => !nicheLanguages.has(language));
if (ranked.some(([language]) => nicheLanguages.has(language))) badgeLanguages.push(['Other', 0]);
let badgeX = 20;
let badgeY = 49;
for (const [i, [language]] of badgeLanguages.entries()) {
  const badgeColor = languageColors[language] || `hsl(${(i * 137.5) % 360}, 55%, 62%)`;
  const width = Math.max(72, language.length * 7 + 49);
  if (badgeX + width > 433) { badgeX = 20; badgeY += 40; }
  let icon = `<circle cx="${badgeX + 17}" cy="${badgeY + 15}" r="4" fill="${badgeColor}"/>`;
  if (iconNames[language]) {
    const source = await readFile(`assets/icons/${iconNames[language]}.svg`, 'utf8');
    const viewBox = source.match(/viewBox="([^"]+)"/)?.[1] || '0 0 128 128';
    const inner = source.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    icon = `<svg x="${badgeX + 10}" y="${badgeY + 7}" width="16" height="16" viewBox="${viewBox}" fill="${badgeColor}">${inner}</svg>`;
  }
  badges.push(`<rect x="${badgeX}" y="${badgeY}" width="${width}" height="30" rx="15" fill="${badgeColor}" fill-opacity="0.09" stroke="${badgeColor}" stroke-opacity="0.5"/>${icon}<text class="text" x="${badgeX + 34}" y="${badgeY + 20}" font-size="12">${escape(language)}</text>`);
  badgeX += width + 9;
}
const height = Math.max(208, badgeY + 60, 52 + shown.length * 26);
const centerY = height / 2 - 8;
const radius = 43;
const circumference = 2 * Math.PI * radius;
let offset = 0;
const arcs = shown.map(([, bytes], i) => {
  const length = sum ? bytes / sum * circumference : 0;
  const arc = `<circle cx="528" cy="${centerY}" r="${radius}" fill="none" stroke="${colors[i]}" stroke-width="19" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 528 ${centerY})"/>`;
  offset += length;
  return arc;
}).join('');
const legend = shown.map(([language, bytes], i) => {
  const y = 38 + i * 26;
  return `<circle cx="599" cy="${y - 4}" r="4" fill="${colors[i]}"/><text class="text" x="613" y="${y}" font-size="12">${escape(language)}</text><text class="muted" x="767" y="${y}" text-anchor="end" font-size="12">${percentage(bytes)}%</text>`;
}).join('');
const scopeLabel = includePrivate ? 'public + private repos' : 'public repos';
const languageSvg = `<rect class="box" x="1" y="1" width="449" height="${height - 2}"/><rect class="box" x="468" y="1" width="320" height="${height - 2}"/><text class="muted" x="20" y="29" font-size="11" font-weight="600" letter-spacing="0.7">LANGUAGES</text>${badges.join('')}${arcs}<text class="muted" x="528" y="${centerY + 5}" text-anchor="middle" font-size="12">${ranked.length} langs</text>${legend}`;
await mkdir('assets', { recursive: true });
await writeFile('assets/stats.svg', shell(790, 109, stats, metrics.map(row => row.join(' ')).join(', ')));
const graphic = shell(790, height, languageSvg, shown.map(([language, bytes]) => `${language}: ${percentage(bytes)}%`).join(', ') + `. ${scopeLabel}, excluding forks; code bytes, not proficiency.`);
const version = createHash('sha256').update(graphic).digest('hex').slice(0, 12);
await writeFile(`assets/languages-${version}.svg`, graphic);
const readme = await readFile('README.md', 'utf8');
await writeFile('README.md', readme.replace(/\.\/assets\/languages(?:-[a-f0-9]+)?(?:-square)?\.svg/g, `./assets/languages-${version}.svg`).replace('Languages used in public repositories', `Languages used in ${scopeLabel}`));
console.log(`Generated aggregate language cards (${ranked.length} languages).`);
