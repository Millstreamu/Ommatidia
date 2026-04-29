declare module 'node:http' {
  export interface IncomingMessage {
    method?: string;
    url?: string;
    headers?: Record<string, string | string[] | undefined>;
    statusCode?: number;
    on(event: string, cb: (...args: any[]) => void): void;
    pipe(destination: any): any;
    setEncoding(encoding: string): void;
  }
  export interface ServerResponse {
    statusCode: number;
    setHeader(name: string, value: string | string[]): void;
    end(data?: string): void;
  }
  export interface Server {
    listen(port: number): void;
    close(): void;
    once(event: string, cb: () => void): void;
    address(): { port: number } | null;
  }
  export interface RequestOptions {
    protocol?: string;
    hostname?: string;
    port?: string;
    method?: string;
    path?: string;
    headers?: Record<string, string | string[] | undefined>;
    statusCode?: number;
  }
  export function createServer(handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>): Server;
  export function request(options: RequestOptions, cb: (res: IncomingMessage) => void): {
    on(event: string, cb: (...args: any[]) => void): void;
    end(data?: string): void;
  };
}
declare module 'node:fs/promises' { export function readFile(path: string, encoding: string): Promise<string>; }
declare module 'node:path' { export function resolve(...segments: string[]): string; }
declare const process: { argv: string[]; cwd(): string; env: Record<string, string | undefined> };
