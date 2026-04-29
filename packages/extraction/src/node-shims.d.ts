declare module 'node:fs/promises' { export function readFile(path: string): Promise<Uint8Array>; }
declare class Buffer { static from(data: any): { toString(enc?: string): string }; }
