import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const artifactPath = path.resolve(__dirname, '../artifacts/contracts/ArecaAuction.sol/ArecaAuction.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

const abi = artifact.abi;

const targets = [
  path.resolve(__dirname, '../../backend/src/abi/ArecaAuction.json'),
  path.resolve(__dirname, '../../frontend/src/abi/ArecaAuction.json'),
];

for (const t of targets) {
  fs.mkdirSync(path.dirname(t), { recursive: true });
  fs.writeFileSync(t, JSON.stringify({ abi }, null, 2));
  console.log('wrote', t);
}