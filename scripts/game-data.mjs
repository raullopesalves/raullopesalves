import { writeFile } from 'node:fs/promises';
const response = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({query:'query { user(login:"raullopesalves") { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } } } }'}),
});
const result = await response.json();
const calendar = result.data?.user?.contributionsCollection?.contributionCalendar;
if(!response.ok || result.errors || !calendar?.weeks?.length) throw new Error('Contribution calendar could not be refreshed');
await writeFile('docs/contributions.json', JSON.stringify(calendar));
console.log('Refreshed game bricks from contribution counts.');
