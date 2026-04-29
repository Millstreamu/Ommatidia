import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const envExample = path.join(root, '.env.example');
const envFile = path.join(root, '.env');

if (!existsSync(envFile)) {
  copyFileSync(envExample, envFile);
  console.log('Created .env from .env.example');
} else {
  console.log('Found existing .env; leaving it unchanged');
}

const uploadDir = path.join(root, 'storage', 'uploads');
mkdirSync(uploadDir, { recursive: true });
console.log(`Ensured local upload directory exists at ${uploadDir}`);

console.log('\nSetup complete. Next steps:');
console.log('1) (Optional) Set OPENAI_API_KEY in .env or environment');
console.log('2) Run: npm run start (or make start)');
console.log('3) API default URL: http://localhost:3001');
console.log('4) Web default URL: http://localhost:3000');
