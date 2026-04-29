import { rmSync, mkdirSync } from 'node:fs';

rmSync('storage/uploads', { recursive: true, force: true });
mkdirSync('storage/uploads', { recursive: true });

console.log('Reset local development upload data at storage/uploads.');
console.log('Warning: local uploaded files were deleted. .env was preserved.');
