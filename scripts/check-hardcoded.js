import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const productRoots = ['server', 'shared', 'src'];
const forbidden = /\b(mock|demo|sample|fixture)\b/i;
const files = [];
function walk(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(js|jsx|css|html)$/.test(name)) files.push(path);
  }
}
for (const directory of productRoots) walk(join(root, directory));
const violations = [];
const longStrings = [];
for (const path of files) {
  const content = readFileSync(path, 'utf8');
  if (forbidden.test(content) || /from ['"].*tests\//i.test(content)) violations.push(relative(root, path));
  for (const match of content.matchAll(/['"`]([^'"`\n]{30,})['"`]/g)) {
    if (match[1].trim().split(/\s+/).length >= 5) longStrings.push(`${relative(root, path)}: ${match[1].trim()}`);
  }
}
if (violations.length) { console.error('Hardcoded-content violations:', violations.join(', ')); process.exit(1); }
console.log('Product-code scan passed. Manual review of long string literals:');
for (const value of longStrings) console.log(`- ${value}`);
