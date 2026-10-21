import { mkdir, writeFile } from 'node:fs/promises';

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
let offset = 0;
const bar = shown.map(([language, bytes], i) => {
  const width = sum ? bytes / sum * 746 : 0;
  const rect = `<rect x="${26 + offset}" y="60" width="${width}" height="12" fill="${colors[i]}"/>`;
  offset += width;
  return rect;
}).join('');
const legend = shown.map(([language, bytes], i) => {
  const x = 26 + (i % 3) * 250;
  const y = 105 + Math.floor(i / 3) * 28;
  return `<circle cx="${x + 4}" cy="${y - 4}" r="4" fill="${colors[i]}"/><text class="text" x="${x + 17}" y="${y}" font-size="12">${escape(language)} <tspan class="muted">${(bytes / sum * 100).toFixed(1)}%</tspan></text>`;
}).join('');
const height = 147 + Math.max(0, Math.ceil(shown.length / 3) - 1) * 28;
const languageSvg = `<rect class="box" x="1" y="1" width="786" height="${height - 2}" rx="7"/><text class="text" x="26" y="34" font-size="15" font-weight="600">languages</text>${bar}${legend}<text class="muted" x="26" y="${height - 17}" font-size="11">public, non-fork repositories · share of code bytes</text>`;
await mkdir('assets', { recursive: true });
await writeFile('assets/stats.svg', shell(790, 109, stats, metrics.map(row => row.join(' ')).join(', ')));
await writeFile('assets/languages.svg', shell(790, height, languageSvg, 'Language distribution across public non-fork repositories'));
console.log(`Generated cards from ${repos.length} public repositories and ${ranked.length} languages.`);
