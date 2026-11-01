import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const envExample = readFileSync(join(root, '.env.example'), 'utf8');
const names = [...envExample.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]).filter((name) => name !== 'NODE_ENV');
const files = [];
function walk(directory) { for (const name of readdirSync(directory)) { const path = join(directory, name); if (statSync(path).isDirectory()) walk(path); else files.push(path); } }
walk(join(root, 'dist'));
const bundle = files.map((path) => readFileSync(path, 'utf8')).join('\n');
for (const name of names) if (new RegExp(`(?<![A-Z0-9_])${name}(?![A-Z0-9_])`).test(bundle)) { console.error(`Server environment name leaked into dist: ${name}`); process.exit(1); }
for (const name of names) if (process.env[name] && process.env[name].length > 3 && bundle.includes(process.env[name])) { console.error(`Environment value leaked into dist: ${name}`); process.exit(1); }
console.log('Bundle environment scan passed.');
