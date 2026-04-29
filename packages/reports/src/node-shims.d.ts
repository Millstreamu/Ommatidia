declare module 'node:child_process' {
  export function spawnSync(command: string, args: string[], options?: { input?: string; maxBuffer?: number }): { status: number | null; stdout: Uint8Array };
}
declare class Buffer {
  static from(data: any): Buffer;
  length: number;
}
