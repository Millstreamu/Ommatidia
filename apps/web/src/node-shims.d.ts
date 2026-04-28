declare module 'node:http' {
  export interface IncomingMessage { method?: string; url?: string; on(event: string, cb: (...args: any[]) => void): void; }
  export interface ServerResponse { statusCode: number; setHeader(name: string, value: string): void; end(data?: string): void; }
  export interface Server { listen(port: number): void; close(): void; once(event: string, cb: () => void): void; address(): { port: number } | null; }
  export function createServer(handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>): Server;
}
declare module 'node:fs/promises' { export function readFile(path: string, encoding: string): Promise<string>; }
declare module 'node:path' { export function resolve(...segments: string[]): string; }
declare const process: { argv: string[]; cwd(): string };
