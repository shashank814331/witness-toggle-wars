declare const process: {
  readonly env: Record<string, string | undefined>;
  readonly argv: readonly string[];
  cwd(): string;
  exit(code?: number): never;
};

declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { readonly recursive?: boolean }): void;
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readFileSync(path: string): Uint8Array;
  export function writeFileSync(path: string, data: string, encoding: 'utf8'): void;
}

declare module 'node:path' {
  export function join(...paths: readonly string[]): string;
  export function resolve(...paths: readonly string[]): string;
  export function dirname(p: string): string;
  export function extname(p: string): string;
}

declare module 'node:http' {
  export interface IncomingMessage {
    readonly url?: string;
  }
  export interface ServerResponse {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(chunk?: string | Uint8Array): void;
  }
  export interface Server {
    listen(port: number, host: string, cb: () => void): void;
    address(): { readonly port: number } | string | null;
    close(cb: () => void): void;
  }
  export function createServer(
    listener: (req: IncomingMessage, res: ServerResponse) => void,
  ): Server;
}
