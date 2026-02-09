import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';
import type { CloudRemoteFile } from '../../shared/types/cloud-sync';
import type { ICloudProvider, AppFolders, UploadParams } from './cloud-provider';
import { EncryptedJsonStore } from './token-store';

export interface WebDAVAuth {
  url: string;
  username: string;
  password: string;
  connected: boolean;
  folders?: { rootPath: string; livePath: string; backupsPath: string };
}

export class WebDAVProvider implements ICloudProvider {
  private store: EncryptedJsonStore<WebDAVAuth>;
  private connected = false;
  private baseUrl = '';
  private authHeader = '';

  constructor(store: EncryptedJsonStore<WebDAVAuth>) {
    this.store = store;
  }

  private readAuth(): WebDAVAuth | null {
    return this.store.read();
  }

  private writeAuth(auth: WebDAVAuth): void {
    this.store.write(auth);
  }

  private ensureTrailingSlash(url: string): string {
    return url.endsWith('/') ? url : url + '/';
  }

  private buildUrl(basePath: string, ...segments: string[]): string {
    let result = this.ensureTrailingSlash(basePath);
    for (const seg of segments) {
      result = this.ensureTrailingSlash(result) + encodeURIComponent(seg);
    }
    return result;
  }

  private request(
    method: string,
    url: string,
    opts?: { body?: Buffer | string; headers?: Record<string, string>; depth?: string }
  ): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const isHttps = parsed.protocol === 'https:';
      const transport = isHttps ? https : http;

      const reqHeaders: Record<string, string> = {
        Authorization: this.authHeader,
        ...(opts?.headers || {}),
      };

      if (opts?.depth !== undefined) {
        reqHeaders['Depth'] = opts.depth;
      }

      const reqOpts: http.RequestOptions = {
        method,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        headers: reqHeaders,
      };

      const req = transport.request(reqOpts, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy(new Error('Request timeout'));
      });

      if (opts?.body) {
        req.write(opts.body);
      }
      req.end();
    });
  }

  async connect(): Promise<void> {
    const auth = this.readAuth();
    if (!auth?.url || !auth?.username || !auth?.password) {
      throw new Error('Credenciais WebDAV não configuradas. Configure URL, usuário e senha.');
    }

    this.baseUrl = this.ensureTrailingSlash(auth.url);
    this.authHeader = 'Basic ' + Buffer.from(`${auth.username}:${auth.password}`).toString('base64');

    // Test connection with PROPFIND on the base URL
    const res = await this.request('PROPFIND', this.baseUrl, { depth: '0' });

    if (res.status === 401 || res.status === 403) {
      throw new Error('Autenticação falhou. Verifique usuário e senha.');
    }
    if (res.status >= 400) {
      throw new Error(`Erro ao conectar ao servidor WebDAV: HTTP ${res.status}`);
    }

    this.connected = true;
    this.writeAuth({ ...auth, connected: true });
  }

  disconnect(): void {
    this.connected = false;
    const auth = this.readAuth();
    if (auth) {
      this.writeAuth({ ...auth, connected: false });
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async testConnection(url: string, username: string, password: string): Promise<boolean> {
    const testUrl = this.ensureTrailingSlash(url);
    const testAuth = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

    const oldBaseUrl = this.baseUrl;
    const oldAuth = this.authHeader;

    this.baseUrl = testUrl;
    this.authHeader = testAuth;

    try {
      const res = await this.request('PROPFIND', testUrl, { depth: '0' });
      return res.status >= 200 && res.status < 400;
    } catch {
      return false;
    } finally {
      this.baseUrl = oldBaseUrl;
      this.authHeader = oldAuth;
    }
  }

  private async ensureCollection(url: string): Promise<void> {
    // Check if exists
    const check = await this.request('PROPFIND', url, { depth: '0' });
    if (check.status >= 200 && check.status < 300) {
      return; // Already exists
    }

    // Create with MKCOL
    const res = await this.request('MKCOL', url);
    if (res.status !== 201 && res.status !== 405) {
      // 405 = already exists on some servers
      if (res.status >= 400) {
        throw new Error(`Falha ao criar diretório ${url}: HTTP ${res.status}`);
      }
    }
  }

  async ensureAppStructure(): Promise<AppFolders> {
    const auth = this.readAuth();
    if (auth?.folders) {
      return auth.folders;
    }

    const rootPath = this.buildUrl(this.baseUrl, 'Nexus');
    const livePath = this.buildUrl(rootPath, 'live');
    const backupsPath = this.buildUrl(rootPath, 'backups');

    await this.ensureCollection(rootPath + '/');
    await this.ensureCollection(livePath + '/');
    await this.ensureCollection(backupsPath + '/');

    const folders = { rootPath, livePath, backupsPath };

    if (auth) {
      this.writeAuth({ ...auth, folders });
    }

    return folders;
  }

  async listFiles(parentPath: string): Promise<CloudRemoteFile[]> {
    const url = this.ensureTrailingSlash(parentPath);
    const res = await this.request('PROPFIND', url, {
      depth: '1',
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      body: `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname/>
    <d:getcontentlength/>
    <d:getcontenttype/>
    <d:getlastmodified/>
  </d:prop>
</d:propfind>`,
    });

    if (res.status < 200 || res.status >= 400) {
      throw new Error(`Falha ao listar arquivos: HTTP ${res.status}`);
    }

    return this.parseMultiStatus(res.body.toString('utf8'), url);
  }

  private parseMultiStatus(xml: string, parentUrl: string): CloudRemoteFile[] {
    const files: CloudRemoteFile[] = [];
    // Simple XML parsing for DAV:response elements
    const responseRegex = /<d:response[^>]*>([\s\S]*?)<\/d:response>/gi;
    let match: RegExpExecArray | null;

    while ((match = responseRegex.exec(xml)) !== null) {
      const block = match[1];

      // Extract href
      const hrefMatch = /<d:href[^>]*>([\s\S]*?)<\/d:href>/i.exec(block);
      const href = hrefMatch ? decodeURIComponent(hrefMatch[1].trim()) : '';

      // Skip the parent directory itself
      const normalizedParent = new URL(parentUrl).pathname.replace(/\/+$/, '');
      const normalizedHref = href.replace(/\/+$/, '');
      if (normalizedHref === normalizedParent || normalizedHref === '') {
        continue;
      }

      // Extract display name
      const nameMatch = /<d:displayname[^>]*>([\s\S]*?)<\/d:displayname>/i.exec(block);
      const name = nameMatch ? nameMatch[1].trim() : path.basename(normalizedHref);

      // Extract content length
      const sizeMatch = /<d:getcontentlength[^>]*>([\s\S]*?)<\/d:getcontentlength>/i.exec(block);
      const size = sizeMatch ? parseInt(sizeMatch[1].trim(), 10) : undefined;

      // Extract content type
      const typeMatch = /<d:getcontenttype[^>]*>([\s\S]*?)<\/d:getcontenttype>/i.exec(block);
      const mimeType = typeMatch ? typeMatch[1].trim() : undefined;

      // Extract last modified
      const modMatch = /<d:getlastmodified[^>]*>([\s\S]*?)<\/d:getlastmodified>/i.exec(block);
      const modifiedTime = modMatch ? new Date(modMatch[1].trim()).toISOString() : undefined;

      // Skip collections (directories)
      const isCollection = /<d:collection\s*\/>/i.test(block) || /<d:collection>/i.test(block);
      if (isCollection) continue;

      if (name) {
        files.push({
          id: href, // WebDAV uses href as identifier
          name,
          mimeType,
          modifiedTime,
          size: Number.isFinite(size) ? size : undefined,
        });
      }
    }

    return files;
  }

  async uploadFile(params: UploadParams): Promise<string> {
    const targetUrl = this.buildUrl(params.parentPath, params.name);
    const fileContent = fs.readFileSync(params.filePath);

    const res = await this.request('PUT', targetUrl, {
      body: fileContent,
      headers: {
        'Content-Type': params.mimeType || 'application/octet-stream',
        'Content-Length': String(fileContent.length),
      },
    });

    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Falha ao enviar arquivo ${params.name}: HTTP ${res.status}`);
    }

    return targetUrl;
  }

  async downloadFile(remotePath: string, outputPath: string): Promise<void> {
    const res = await this.request('GET', remotePath);

    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Falha ao baixar arquivo: HTTP ${res.status}`);
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, res.body);
  }

  async findFileByName(parentPath: string, name: string): Promise<CloudRemoteFile | null> {
    const files = await this.listFiles(parentPath);
    return files.find((f) => f.name === name) || null;
  }
}
