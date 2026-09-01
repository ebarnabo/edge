declare module "unzipper" {
  import type { Buffer } from "node:buffer";

  interface ZipEntry {
    path: string;
    type: "File" | "Directory";
    buffer(): Promise<Buffer>;
  }

  interface ZipArchive {
    files: ZipEntry[];
  }

  export const Open: {
    buffer(buffer: Buffer): Promise<ZipArchive>;
    url(request: unknown, url: string): Promise<ZipArchive>;
    file(path: string): Promise<ZipArchive>;
  };
}
