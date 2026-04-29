declare module 'node:http' {
  export interface IncomingMessage { method?: string; url?: string; headers: Record<string, string | string[] | undefined>; on(event: string, cb: (...args: any[]) => void): void; destroy(): void; pipe(dest: any): any; }
  export interface ServerResponse { statusCode: number; setHeader(name: string, value: string): void; end(data?: string): void; }
  export interface Server { listen(port: number): void; close(): void; once(event: string, cb: () => void): void; address(): { port: number } | null; }
  export function createServer(handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>): Server;
}
declare module 'node:crypto' { export function randomUUID(): string; }
declare module 'node:fs/promises' { export function access(path: string): Promise<void>; export function mkdir(path: string, opts?: any): Promise<void>; export function writeFile(path: string, data: any): Promise<void>; export function unlink(path: string): Promise<void>; }
declare module 'node:fs' { export function createReadStream(path: string): { pipe(dest: any): any }; }
declare module 'node:path' { export function resolve(...parts: string[]): string; export function join(...parts: string[]): string; export function basename(p: string): string; }
declare const process: { argv: string[]; cwd(): string; env: Record<string, string | undefined> };
declare class Buffer { static concat(chunks: Buffer[]): Buffer; static from(data: any): Buffer; length: number; }
