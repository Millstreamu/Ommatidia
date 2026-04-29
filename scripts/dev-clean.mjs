import { rmSync } from 'node:fs';

const paths = [
  'apps/api/dist',
  'apps/web/dist',
  'packages/shared/dist',
  'packages/calculations/dist',
  'packages/extraction/dist',
  'packages/reports/dist',
  'packages/zod/dist',
  'tsconfig.tsbuildinfo'
];

for (const target of paths) {
  rmSync(target, { recursive: true, force: true });
}

console.log('Removed build outputs. Preserved .env and storage/uploads.');
