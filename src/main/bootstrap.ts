(() => {
  const g = globalThis as unknown as { File?: unknown; Blob?: unknown };
  if (typeof g.File !== 'undefined') return;
  if (typeof g.Blob === 'undefined') return;

  class FilePolyfill extends (g.Blob as any) {
    public readonly name: string;
    public readonly lastModified: number;
    public readonly webkitRelativePath: string;

    constructor(fileBits: any[] = [], fileName: any = 'file', options?: any) {
      super(fileBits, options);
      this.name = String(fileName);
      this.lastModified = typeof options?.lastModified === 'number' ? options.lastModified : Date.now();
      this.webkitRelativePath = '';
    }
  }

  (globalThis as any).File = FilePolyfill;
})();

import './index';
