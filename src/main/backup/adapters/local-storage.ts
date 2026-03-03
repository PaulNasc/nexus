// Adapter para armazenamento local em pasta configurável
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import crypto from 'crypto';
import archiver from 'archiver';
import * as cheerio from 'cheerio';
import { Task } from '../../../shared/database/memory-db';
import { Note } from '../../../shared/types/note';
import { BackupMetadata, BackupFile } from '../../../shared/types/backup';

export interface LocalStorageData {
  tasks: Task[];
  notes: Note[];
  categories: Array<{ id: number; name: string; color: string; icon?: string }>;
  settings: Record<string, unknown>;
  metadata: {
    version: string;
    lastUpdate: string;
    machineId: string;
  };
}

export class LocalStorageAdapter {
  private dataFolder: string;

  constructor(dataFolder: string) {
    this.dataFolder = dataFolder;
  }

  private resolveImportContentDir(rootDir: string): { contentDir: string; score: number } {
    const expected = ['tasks.json', 'notes.json', 'categories.json', 'settings.json', 'metadata.json'] as const;

    const scoreDir = (dir: string): number => {
      let score = 0;
      for (const f of expected) {
        try {
          if (fs.existsSync(path.join(dir, f))) score += 1;
        } catch {
          // ignore
        }
      }
      return score;
    };

    const pickBestForBase = (base: string): { dir: string; score: number } => {
      const directScore = scoreDir(base);
      const dataDir = path.join(base, 'data');
      const dataScore = scoreDir(dataDir);
      if (dataScore > directScore) return { dir: dataDir, score: dataScore };
      return { dir: base, score: directScore };
    };

    const rootPick = pickBestForBase(rootDir);
    if (rootPick.score > 0) return { contentDir: rootPick.dir, score: rootPick.score };

    let best: { dir: string; score: number } = { dir: rootPick.dir, score: rootPick.score };
    const visited = new Set<string>();
    const queue: Array<{ dir: string; depth: number }> = [{ dir: rootDir, depth: 0 }];
    const maxDepth = 4;

    while (queue.length > 0) {
      const item = queue.shift()!;
      const dir = item.dir;
      const depth = item.depth;
      if (visited.has(dir)) continue;
      visited.add(dir);

      const pick = pickBestForBase(dir);
      if (pick.score > best.score) {
        best = pick;
        if (best.score === expected.length) break;
      }

      if (depth >= maxDepth) continue;
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const e of entries) {
        if (!e.isDirectory()) continue;
        if (e.name === 'node_modules' || e.name === '.git') continue;
        if (e.name.startsWith('.')) continue;
        queue.push({ dir: path.join(dir, e.name), depth: depth + 1 });
      }
    }

    return { contentDir: best.dir, score: best.score };
  }

  private readTextFileSmart(filePath: string): string {
    const buf = fs.readFileSync(filePath);
    if (buf.length >= 2) {
      const b0 = buf[0];
      const b1 = buf[1];
      if (b0 === 0xff && b1 === 0xfe) {
        return buf.slice(2).toString('utf16le');
      }
      if (b0 === 0xfe && b1 === 0xff) {
        const swapped = Buffer.allocUnsafe(buf.length - 2);
        for (let i = 2; i + 1 < buf.length; i += 2) {
          swapped[i - 2] = buf[i + 1] as number;
          swapped[i - 1] = buf[i] as number;
        }
        return swapped.toString('utf16le');
      }
    }
    if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
      return buf.slice(3).toString('utf8');
    }
    return buf.toString('utf8');
  }

  private mimeFromExt(ext: string): string {
    const e = (ext || '').toLowerCase();
    if (e === '.png') return 'image/png';
    if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
    if (e === '.gif') return 'image/gif';
    if (e === '.webp') return 'image/webp';
    if (e === '.bmp') return 'image/bmp';
    if (e === '.svg') return 'image/svg+xml';
    return 'application/octet-stream';
  }

  private htmlToTextPreserveLines(html: string): string {
    const $ = cheerio.load(html || '', { xmlMode: false });
    $('script').remove();
    $('style').remove();
    $('noscript').remove();
    $('head').remove();

    $('br').replaceWith('\n');
    $('div').each((_, el) => {
      const node = $(el);
      node.prepend('\n');
      node.append('\n');
    });
    $('p').each((_, el) => {
      const node = $(el);
      node.prepend('\n');
      node.append('\n');
    });

    const root = $('en-note').first();
    const text = (root && root.length > 0 ? root.text() : $('body').text()) || $.root().text();
    return text.replace(/\n{3,}/g, '\n\n').trim();
  }

  private deriveHtmlTitle(html: string, filePath: string): string {
    try {
      const $ = cheerio.load(html || '', { xmlMode: false });
      const title = String($('title').first().text() || '').trim();
      if (title) return title;
    } catch {
      // ignore
    }
    const base = path.basename(filePath);
    return base.replace(/\.(html|htm)$/i, '');
  }

  private extractHtmlImagesAsDataUrls(
    html: string,
    htmlFilePath: string,
    referencedImagePaths?: Set<string>,
  ): string[] {
    try {
      const $ = cheerio.load(html || '', { xmlMode: false });
      const srcs = new Set<string>();
      $('img').each((_, el) => {
        const src = String($(el).attr('src') || '').trim();
        if (!src) return;
        srcs.add(src);
      });

      const baseDir = path.dirname(htmlFilePath);
      const out: string[] = [];
      for (const src of srcs) {
        if (/^data:/i.test(src)) {
          out.push(src);
          continue;
        }
        if (/^(https?:)?\/\//i.test(src)) {
          continue;
        }

        const decoded = (() => {
          try {
            return decodeURIComponent(src);
          } catch {
            return src;
          }
        })();

        const absPath = path.resolve(baseDir, decoded);
        if (!fs.existsSync(absPath)) continue;
        referencedImagePaths?.add(this.normalizeFileSystemPath(absPath));
        const buf = fs.readFileSync(absPath);
        const mime = this.mimeFromExt(path.extname(absPath));
        out.push(`data:${mime};base64,${buf.toString('base64')}`);
      }
      return out;
    } catch {
      return [];
    }
  }

  private findHtmlFiles(rootDir: string): string[] {
    const out: string[] = [];
    const visited = new Set<string>();
    const queue: Array<{ dir: string; depth: number }> = [{ dir: rootDir, depth: 0 }];
    const maxDepth = 6;

    while (queue.length > 0) {
      const item = queue.shift()!;
      const dir = item.dir;
      const depth = item.depth;
      if (visited.has(dir)) continue;
      visited.add(dir);

      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const e of entries) {
        if (e.isDirectory()) {
          if (depth >= maxDepth) continue;
          if (e.name === 'node_modules' || e.name === '.git') continue;
          if (e.name.startsWith('.')) continue;
          queue.push({ dir: path.join(dir, e.name), depth: depth + 1 });
          continue;
        }
        if (!e.isFile()) continue;
        const lower = e.name.toLowerCase();
        if (lower.endsWith('.html') || lower.endsWith('.htm')) {
          out.push(path.join(dir, e.name));
        }
      }
    }
    return out;
  }

  private buildNotesFromHtmlFiles(htmlFiles: string[]): Note[] {
    const now = new Date().toISOString();
    const baseId = Date.now() * 1000;
    return htmlFiles.map((filePath, idx) => {
      const html = this.readTextFileSmart(filePath);
      const title = this.deriveHtmlTitle(html, filePath);
      const content = this.htmlToTextPreserveLines(html);
      const attachedImages = this.extractHtmlImagesAsDataUrls(html, filePath);
      return {
        id: baseId + idx,
        title,
        content,
        format: 'text',
        attachedImages: attachedImages.length > 0 ? attachedImages : undefined,
        created_at: now,
        updated_at: now,
      };
    });
  }

  private isLikelyTextFile(filePath: string): boolean {
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) return false;
      const sampleSize = Math.min(stat.size, 4096);
      if (sampleSize <= 0) return false;

      const fd = fs.openSync(filePath, 'r');
      try {
        const buffer = Buffer.alloc(sampleSize);
        const bytesRead = fs.readSync(fd, buffer, 0, sampleSize, 0);
        if (bytesRead <= 0) return false;

        let suspiciousBinaryBytes = 0;
        for (let i = 0; i < bytesRead; i += 1) {
          const byte = buffer[i] ?? 0;
          if (byte === 0) return false;
          const isControl = byte < 9 || (byte > 13 && byte < 32);
          if (isControl) suspiciousBinaryBytes += 1;
        }

        return suspiciousBinaryBytes / bytesRead < 0.1;
      } finally {
        fs.closeSync(fd);
      }
    } catch {
      return false;
    }
  }

  /**
   * Escaneia recursivamente um diretório e classifica todos os arquivos por tipo.
   */
  private scanAllFiles(rootDir: string, options?: { previewOnly?: boolean }): {
    textFiles: string[];      // texto e código fonte
    imageFiles: string[];     // .png, .jpg, .jpeg, .jfif, .gif, .bmp, .webp
    videoFiles: string[];     // .mp4, .webm, .ogg, .mov, .avi, .mkv
    docFiles: string[];       // .doc, .docx, .rtf, .odt
    archiveFiles: string[];   // .rar, .zip (aninhados)
    htmlFiles: string[];      // .html, .htm
    otherFiles: string[];
  } {
    const textExts = new Set([
      '.txt', '.sql', '.md', '.markdown', '.log', '.cfg', '.ini', '.csv',
      '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
      '.py', '.java', '.c', '.cc', '.cpp', '.h', '.hpp',
      '.cs', '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.kts', '.scala',
      '.sh', '.bash', '.zsh', '.bat', '.ps1',
      '.css', '.scss', '.less', '.sass', '.styl',
      '.json', '.jsonc', '.yaml', '.yml', '.xml', '.toml', '.env',
      '.vue', '.svelte', '.graphql', '.gql', '.prisma',
    ]);
    const imageExts = new Set(['.png', '.jpg', '.jpeg', '.jfif', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.ico']);
    const videoExts = new Set(['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv']);
    const docExts = new Set(['.doc', '.docx', '.rtf', '.odt', '.xls', '.xlsx', '.ppt', '.pptx']);
    const archiveExts = new Set(['.rar', '.zip', '.7z', '.tar', '.gz']);
    const htmlExts = new Set(['.html', '.htm']);

    const previewOnly = options?.previewOnly === true;

    const result = {
      textFiles: [] as string[],
      imageFiles: [] as string[],
      videoFiles: [] as string[],
      docFiles: [] as string[],
      archiveFiles: [] as string[],
      htmlFiles: [] as string[],
      otherFiles: [] as string[],
    };

    const visited = new Set<string>();
    const queue: Array<{ dir: string; depth: number }> = [{ dir: rootDir, depth: 0 }];
    const maxDepth = previewOnly ? 10 : 16;

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (visited.has(item.dir)) continue;
      visited.add(item.dir);

      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(item.dir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const e of entries) {
        if (e.isDirectory()) {
          if (item.depth >= maxDepth) continue;
          if (e.name === 'node_modules' || e.name === '.git' || e.name.startsWith('.')) continue;
          queue.push({ dir: path.join(item.dir, e.name), depth: item.depth + 1 });
          continue;
        }
        if (!e.isFile()) continue;

        const fullPath = path.join(item.dir, e.name);
        const ext = path.extname(e.name).toLowerCase();

        if (textExts.has(ext)) result.textFiles.push(fullPath);
        else if (!ext && !previewOnly && this.isLikelyTextFile(fullPath)) result.textFiles.push(fullPath);
        else if (imageExts.has(ext)) result.imageFiles.push(fullPath);
        else if (videoExts.has(ext)) result.videoFiles.push(fullPath);
        else if (docExts.has(ext)) result.docFiles.push(fullPath);
        else if (archiveExts.has(ext)) result.archiveFiles.push(fullPath);
        else if (htmlExts.has(ext)) result.htmlFiles.push(fullPath);
        else result.otherFiles.push(fullPath);
      }
    }

    return result;
  }

  /**
   * Converte imagem em data URL base64 para anexar a notas.
   */
  private imageFileToDataUrl(imagePath: string): string | null {
    try {
      const buf = fs.readFileSync(imagePath);
      const ext = path.extname(imagePath).toLowerCase();
      let mime = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg' || ext === '.jfif') mime = 'image/jpeg';
      else if (ext === '.gif') mime = 'image/gif';
      else if (ext === '.webp') mime = 'image/webp';
      else if (ext === '.bmp') mime = 'image/bmp';
      else if (ext === '.svg') mime = 'image/svg+xml';
      else if (ext === '.tiff') mime = 'image/tiff';
      else if (ext === '.ico') mime = 'image/x-icon';
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  }

  /**
   * Normaliza nome de arquivo para comparação (remove extensão, lowercase, trim).
   */
  private normalizeFileName(filePath: string): string {
    const base = path.basename(filePath);
    const ext = path.extname(base);
    return base.slice(0, base.length - ext.length).toLowerCase().trim();
  }

  private normalizeAssociationKey(value: string): string {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[\s_\-.]+/g, ' ')
      .replace(/\s+/g, ' ');
  }

  private normalizeFileSystemPath(filePath: string): string {
    return path.resolve(filePath).replace(/\\/g, '/').toLowerCase();
  }

  private normalizeFolderAssociationKey(folderName: string): string {
    const normalized = this.normalizeAssociationKey(folderName);
    const stripped = normalized
      .replace(/\b(files?|images?|imgs?|assets?|anexos?|attachments?|pictures?|pics?|screenshots?)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return stripped || normalized;
  }

  private associationBaseKey(filePath: string): string {
    const normalized = this.normalizeAssociationKey(this.normalizeFileName(filePath));
    const stripped = normalized.replace(/(?:\s*(?:\(|\[)?(?:img|image|foto|photo|scan|pagina|page)?\s*\d+(?:\)|\])?)$/i, '').trim();
    return stripped || normalized;
  }

  private ensureVideosDir(): string {
    const videosDir = path.join(app.getPath('userData'), 'nexus-videos');
    if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
    return videosDir;
  }

  private findVideosDir(rootDir: string): string | null {
    const candidates = [
      path.join(rootDir, 'nexus-videos'),
      path.join(rootDir, 'data', 'nexus-videos'),
    ];
    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
          return candidate;
        }
      } catch {
        // ignore
      }
    }
    return null;
  }

  private copyVideosFromDir(sourceDir: string): number {
    if (!fs.existsSync(sourceDir)) return 0;
    const targetDir = this.ensureVideosDir();
    let copied = 0;
    const entries = fs.readdirSync(sourceDir);
    for (const entry of entries) {
      const src = path.join(sourceDir, entry);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(src);
      } catch {
        continue;
      }
      if (!stat.isFile()) continue;
      const dest = path.join(targetDir, entry);
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        copied += 1;
      }
    }
    return copied;
  }

  private uniqueVideoFileName(originalName: string): string {
    const base = path.basename(originalName, path.extname(originalName));
    const ext = path.extname(originalName) || '.mp4';
    const safeBase = base.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'video';
    let candidate = `${safeBase}${ext}`;
    const videosDir = this.ensureVideosDir();
    let idx = 1;
    while (fs.existsSync(path.join(videosDir, candidate))) {
      candidate = `${safeBase}-${idx}${ext}`;
      idx += 1;
    }
    return candidate;
  }

  /**
   * Constrói notas a partir de arquivos mistos (txt, sql, imagens, etc).
   * Lógica:
   * 1. Cada arquivo de texto (.txt, .sql, .md) vira uma nota.
   * 2. Cada imagem tenta ser associada a uma nota com nome similar.
   * 3. Imagens sem nota correspondente viram notas próprias com a imagem anexada.
   * 4. Cada vídeo vira uma nota própria com vídeo anexado.
   * 5. .doc/.docx, .rar aninhados são listados como warnings.
   */
  buildNotesFromMixedFiles(
    scan: ReturnType<LocalStorageAdapter['scanAllFiles']>,
    options?: { previewOnly?: boolean },
  ): {
    notes: Note[];
    warnings: string[];
    skippedFiles: string[];
  } {
    const previewOnly = options?.previewOnly === true;
    const now = new Date().toISOString();
    const baseId = Date.now() * 1000;
    const notes: Note[] = [];
    const warnings: string[] = [];
    const skippedFiles: string[] = [];
    let noteIdx = 0;

    // Mapas de associação imagem->nota
    const notesByName = new Map<string, number>();
    const notesByBaseName = new Map<string, number>();
    const htmlImagePathToNoteIndex = new Map<string, number>();
    const noteAttachedImageSources = new Map<number, Set<string>>();

    const appendImageToNote = (noteIndex: number, imgPath: string): boolean => {
      if (previewOnly) return true;
      const note = notes[noteIndex];
      if (!note) return false;

      const sourceKey = this.normalizeFileSystemPath(imgPath);
      let usedSources = noteAttachedImageSources.get(noteIndex);
      if (!usedSources) {
        usedSources = new Set<string>();
        noteAttachedImageSources.set(noteIndex, usedSources);
      }
      if (usedSources.has(sourceKey)) return true;

      const dataUrl = this.imageFileToDataUrl(imgPath);
      if (!dataUrl) return false;
      if (!note.attachedImages) note.attachedImages = [];
      note.attachedImages.push(dataUrl);
      usedSources.add(sourceKey);
      return true;
    };

    // 1. Processar HTML primeiro (já tem lógica existente)
    for (const htmlPath of scan.htmlFiles) {
      try {
        const html = previewOnly ? '' : this.readTextFileSmart(htmlPath);
        const title = previewOnly
          ? path.basename(htmlPath, path.extname(htmlPath))
          : this.deriveHtmlTitle(html, htmlPath);
        const content = previewOnly
          ? `[Pré-visualização] HTML: ${path.basename(htmlPath)}`
          : this.htmlToTextPreserveLines(html);
        const referencedImagePaths = new Set<string>();
        const attachedImages = previewOnly
          ? []
          : this.extractHtmlImagesAsDataUrls(html, htmlPath, referencedImagePaths);
        const note: Note = {
          id: baseId + noteIdx++,
          title,
          content,
          format: 'text',
          attachedImages: attachedImages.length > 0 ? attachedImages : undefined,
          created_at: now,
          updated_at: now,
        };
        const idx = notes.length;
        notes.push(note);
        notesByName.set(this.normalizeAssociationKey(this.normalizeFileName(htmlPath)), idx);
        notesByBaseName.set(this.associationBaseKey(htmlPath), idx);
        if (!previewOnly && referencedImagePaths.size > 0) {
          noteAttachedImageSources.set(idx, new Set<string>(referencedImagePaths));
          for (const imgPathKey of referencedImagePaths) {
            htmlImagePathToNoteIndex.set(imgPathKey, idx);
          }
        }
      } catch {
        warnings.push(`Erro ao processar HTML: ${path.basename(htmlPath)}`);
      }
    }

    const codeLanguageByExt = new Map<string, string>([
      ['.js', 'javascript'], ['.jsx', 'jsx'], ['.ts', 'typescript'], ['.tsx', 'tsx'], ['.mjs', 'javascript'], ['.cjs', 'javascript'],
      ['.py', 'python'], ['.java', 'java'], ['.c', 'c'], ['.cc', 'cpp'], ['.cpp', 'cpp'], ['.h', 'c'], ['.hpp', 'cpp'],
      ['.cs', 'csharp'], ['.go', 'go'], ['.rs', 'rust'], ['.php', 'php'], ['.rb', 'ruby'], ['.swift', 'swift'], ['.kt', 'kotlin'], ['.kts', 'kotlin'], ['.scala', 'scala'],
      ['.sh', 'bash'], ['.bash', 'bash'], ['.zsh', 'zsh'], ['.bat', 'bat'], ['.ps1', 'powershell'],
      ['.css', 'css'], ['.scss', 'scss'], ['.less', 'less'], ['.sass', 'sass'], ['.styl', 'stylus'],
      ['.json', 'json'], ['.jsonc', 'jsonc'], ['.yaml', 'yaml'], ['.yml', 'yaml'], ['.xml', 'xml'], ['.toml', 'toml'], ['.env', 'dotenv'],
      ['.vue', 'vue'], ['.svelte', 'svelte'], ['.graphql', 'graphql'], ['.gql', 'graphql'], ['.prisma', 'prisma'],
    ]);

    // 2. Processar arquivos de texto/código
    for (const txtPath of scan.textFiles) {
      try {
        const baseName = path.basename(txtPath);
        const title = baseName.slice(0, baseName.length - path.extname(baseName).length);
        const ext = path.extname(txtPath).toLowerCase();
        const language = codeLanguageByExt.get(ext);
        const isMarkdown = ext === '.md' || ext === '.markdown';
        const isCode = Boolean(language);
        const rawContent = previewOnly
          ? `[Pré-visualização] Arquivo: ${baseName}`
          : this.readTextFileSmart(txtPath);
        const content = isCode
          ? `\`\`\`${language}\n${rawContent}\n\`\`\``
          : rawContent;
        const note: Note = {
          id: baseId + noteIdx++,
          title,
          content,
          format: isMarkdown || isCode ? 'markdown' : 'text',
          tags: isCode ? ['codigo-importado'] : [],
          created_at: now,
          updated_at: now,
        };
        const idx = notes.length;
        notes.push(note);
        notesByName.set(this.normalizeAssociationKey(this.normalizeFileName(txtPath)), idx);
        notesByBaseName.set(this.associationBaseKey(txtPath), idx);
      } catch {
        warnings.push(`Erro ao ler arquivo: ${path.basename(txtPath)}`);
      }
    }

    // 3. Processar imagens — tentar associar a nota com nome similar
    const unmatchedImages: string[] = [];
    for (const imgPath of scan.imageFiles) {
      const imgName = this.normalizeAssociationKey(this.normalizeFileName(imgPath));
      const imgBase = this.associationBaseKey(imgPath);
      const imgPathKey = this.normalizeFileSystemPath(imgPath);
      const parentFolderName = path.basename(path.dirname(imgPath));
      const parentFolderKey = this.normalizeAssociationKey(parentFolderName);
      const parentFolderBase = this.normalizeFolderAssociationKey(parentFolderName);
      let matched = false;

      // Prioridade 0: imagem já referenciada pelo HTML da nota
      if (htmlImagePathToNoteIndex.has(imgPathKey)) {
        matched = true;
      }

      // Prioridade 1: pasta da imagem com mesmo nome da nota
      if (parentFolderKey && notesByName.has(parentFolderKey)) {
        const noteIndex = notesByName.get(parentFolderKey)!;
        if (appendImageToNote(noteIndex, imgPath)) {
          matched = true;
        }
      }

      // Prioridade 1.1: pasta da imagem sem sufixos comuns (_files, images, etc)
      if (!matched && parentFolderBase && notesByName.has(parentFolderBase)) {
        const noteIndex = notesByName.get(parentFolderBase)!;
        if (appendImageToNote(noteIndex, imgPath)) {
          matched = true;
        }
      }

      // Prioridade 1.2: mesma lógica usando chave base da nota
      if (!matched && parentFolderBase && notesByBaseName.has(parentFolderBase)) {
        const noteIndex = notesByBaseName.get(parentFolderBase)!;
        if (appendImageToNote(noteIndex, imgPath)) {
          matched = true;
        }
      }

      // Prioridade 2: busca exata por nome
      if (!matched && notesByName.has(imgName)) {
        const noteIndex = notesByName.get(imgName)!;
        if (appendImageToNote(noteIndex, imgPath)) {
          matched = true;
        }
      }

      // Prioridade 3: nome base sem sufixos numéricos (ex.: "nota 1", "nota (2)")
      if (!matched && notesByBaseName.has(imgBase)) {
        const noteIndex = notesByBaseName.get(imgBase)!;
        if (appendImageToNote(noteIndex, imgPath)) {
          matched = true;
        }
      }

      if (!matched) {
        unmatchedImages.push(imgPath);
      }
    }

    // 4. Imagens sem correspondência viram notas próprias para não contaminar outras notas
    for (const imgPath of unmatchedImages) {
      const dataUrl = previewOnly ? null : this.imageFileToDataUrl(imgPath);
      if (!previewOnly && !dataUrl) continue;
      const baseName = path.basename(imgPath);
      const title = baseName.slice(0, baseName.length - path.extname(baseName).length);
      const normalizedTitle = this.normalizeAssociationKey(title);
      const looksGenericImageName = /^(?:image|img|screenshot|captura|foto|photo|scan|pic|picture)(?:\s*[\(\[]?\d+[\)\]]?)?$/i.test(normalizedTitle);
      if (looksGenericImageName && notes.length > 0) {
        skippedFiles.push(baseName);
        warnings.push(`Imagem sem contexto ignorada para evitar nota solta: ${baseName}`);
        continue;
      }
      const note: Note = {
        id: baseId + noteIdx++,
        title,
        content: `Imagem importada: ${baseName}`,
        format: 'text',
        attachedImages: previewOnly ? undefined : [dataUrl!],
        tags: ['imagem-importada'],
        created_at: now,
        updated_at: now,
      };
      notes.push(note);
    }

    // 5. Processar vídeos — cada vídeo vira uma nota
    for (const vidPath of scan.videoFiles) {
      try {
        const videoFileName = previewOnly
          ? path.basename(vidPath)
          : this.uniqueVideoFileName(path.basename(vidPath));
        if (!previewOnly) {
          const videosDir = this.ensureVideosDir();
          const destPath = path.join(videosDir, videoFileName);
          fs.copyFileSync(vidPath, destPath);
        }

        const titleBase = path.basename(vidPath, path.extname(vidPath));
        const note: Note = {
          id: baseId + noteIdx++,
          title: titleBase,
          content: `[Vídeo anexado: ${videoFileName}]`,
          format: 'text',
          tags: ['video'],
          attachedVideos: [videoFileName],
          created_at: now,
          updated_at: now,
        };
        notes.push(note);
      } catch {
        skippedFiles.push(path.basename(vidPath));
        warnings.push(`Erro ao importar vídeo: ${path.basename(vidPath)}`);
      }
    }

    // 6. Listar arquivos não importáveis como warnings
    for (const docPath of scan.docFiles) {
      skippedFiles.push(path.basename(docPath));
      warnings.push(`Documento Office ignorado (converta para .txt): ${path.basename(docPath)}`);
    }
    for (const arcPath of scan.archiveFiles) {
      skippedFiles.push(path.basename(arcPath));
      warnings.push(`Arquivo compactado aninhado ignorado: ${path.basename(arcPath)}`);
    }
    for (const otherPath of scan.otherFiles) {
      const ext = path.extname(otherPath).toLowerCase();
      if (ext === '.json' || ext === '.enex') continue; // já tratados em outro fluxo
      skippedFiles.push(path.basename(otherPath));
    }

    if (skippedFiles.length > 0 && notes.length > 0) {
      warnings.unshift(`${skippedFiles.length} arquivo(s) não puderam ser importados como notas`);
    }

    return { notes, warnings, skippedFiles };
  }

  /**
   * Inicializa a estrutura de pastas
   */
  async initialize(): Promise<void> {
    const folders = [
      this.dataFolder,
      path.join(this.dataFolder, 'data'),
      path.join(this.dataFolder, 'backups'),
    ];

    for (const folder of folders) {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
    }
  }

  /**
   * Salva dados em arquivos JSON separados
   */
  async saveData(data: LocalStorageData): Promise<void> {
    const dataDir = path.join(this.dataFolder, 'data');

    const files = {
      'tasks.json': data.tasks,
      'notes.json': data.notes,
      'categories.json': data.categories,
      'settings.json': data.settings,
      'metadata.json': data.metadata,
    };

    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(dataDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    }
  }

  /**
   * Lê dados dos arquivos JSON
   */
  async loadData(): Promise<LocalStorageData | null> {
    const dataDir = path.join(this.dataFolder, 'data');

    try {
      const tasks = this.readJsonFile<Task[]>(path.join(dataDir, 'tasks.json')) || [];
      const notes = this.readJsonFile<Note[]>(path.join(dataDir, 'notes.json')) || [];
      const categories = this.readJsonFile<Array<{ id: number; name: string; color: string; icon?: string }>>(
        path.join(dataDir, 'categories.json')
      ) || [];
      const settings = this.readJsonFile<Record<string, unknown>>(path.join(dataDir, 'settings.json')) || {};
      const metadata = this.readJsonFile<{ version: string; lastUpdate: string; machineId: string }>(
        path.join(dataDir, 'metadata.json')
      ) || {
        version: '1.0.0',
        lastUpdate: new Date().toISOString(),
        machineId: '',
      };

      return { tasks, notes, categories, settings, metadata };
    } catch (error) {
      console.error('Error loading data from local storage:', error);
      return null;
    }
  }

  /**
   * Cria um backup completo em formato ZIP
   */
  async createBackup(type: 'full' | 'incremental' = 'full'): Promise<BackupFile> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = crypto.randomUUID();
    const backupFilename = `nexus-backup-${type}-${timestamp}.zip`;
    const backupPath = path.join(this.dataFolder, 'backups', backupFilename);

    // Criar ZIP
    await this.createZipArchive(backupPath);

    // Calcular checksum
    const checksum = await this.calculateChecksum(backupPath);
    const stats = fs.statSync(backupPath);

    // Contar itens
    const data = await this.loadData();
    const itemCounts = {
      tasks: data?.tasks.length || 0,
      notes: data?.notes.length || 0,
      categories: data?.categories.length || 0,
    };

    const metadata: BackupMetadata = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      type,
      checksum,
      size: stats.size,
      dataPath: this.dataFolder,
      itemCounts,
    };

    const backupFile: BackupFile = {
      id: backupId,
      metadata,
      filePath: backupPath,
      createdAt: new Date().toISOString(),
    };

    // Salvar metadata do backup
    const metadataPath = backupPath.replace('.zip', '.meta.json');
    fs.writeFileSync(metadataPath, JSON.stringify(backupFile, null, 2), 'utf8');

    return backupFile;
  }

  /**
   * Lista todos os backups disponíveis
   */
  async listBackups(): Promise<BackupFile[]> {
    const backupsDir = path.join(this.dataFolder, 'backups');
    if (!fs.existsSync(backupsDir)) {
      return [];
    }

    const files = fs.readdirSync(backupsDir);
    const metaFiles = files.filter(f => f.endsWith('.meta.json'));

    const backups: BackupFile[] = [];
    for (const metaFile of metaFiles) {
      try {
        const content = fs.readFileSync(path.join(backupsDir, metaFile), 'utf8');
        const backup = JSON.parse(content) as BackupFile;
        
        // Verificar se o arquivo ZIP ainda existe
        if (fs.existsSync(backup.filePath)) {
          backups.push(backup);
        }
      } catch (error) {
        console.error(`Error reading backup metadata ${metaFile}:`, error);
      }
    }

    // Ordenar por data (mais recente primeiro)
    return backups.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Deleta um backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    const backups = await this.listBackups();
    const backup = backups.find(b => b.id === backupId);

    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    // Deletar ZIP
    if (fs.existsSync(backup.filePath)) {
      fs.unlinkSync(backup.filePath);
    }

    // Deletar metadata
    const metadataPath = backup.filePath.replace('.zip', '.meta.json');
    if (fs.existsSync(metadataPath)) {
      fs.unlinkSync(metadataPath);
    }
  }

  /**
   * Restaura dados de um backup
   */
  async restoreBackup(backupId: string): Promise<LocalStorageData> {
    const backups = await this.listBackups();
    const backup = backups.find(b => b.id === backupId);

    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    // Extrair ZIP para pasta temporária
    const tempDir = path.join(this.dataFolder, 'temp-restore');
    await this.extractArchive(backup.filePath, tempDir);

    // Ler dados
    const tasks = this.readJsonFile<Task[]>(path.join(tempDir, 'tasks.json')) || [];
    const notes = this.readJsonFile<Note[]>(path.join(tempDir, 'notes.json')) || [];
    const categories = this.readJsonFile<Array<{ id: number; name: string; color: string; icon?: string }>>(
      path.join(tempDir, 'categories.json')
    ) || [];
    const settings = this.readJsonFile<Record<string, unknown>>(path.join(tempDir, 'settings.json')) || {};
    const metadata = this.readJsonFile<{ version: string; lastUpdate: string; machineId: string }>(
      path.join(tempDir, 'metadata.json')
    ) || { version: '1.0.0', lastUpdate: new Date().toISOString(), machineId: '' };

    // Limpar pasta temporária
    this.deleteFolderRecursive(tempDir);

    return { tasks, notes, categories, settings, metadata };
  }

  async readDataFromZip(zipPath: string, options?: { previewOnly?: boolean }): Promise<LocalStorageData> {
    if (!zipPath || typeof zipPath !== 'string') {
      throw new Error('Invalid zipPath');
    }
    if (!fs.existsSync(zipPath)) {
      throw new Error('ZIP file not found');
    }

    const tempDir = path.join(this.dataFolder, `temp-import-${Date.now()}`);
    await this.extractArchive(zipPath, tempDir);

    const resolved = this.resolveImportContentDir(tempDir);
    const contentDir = resolved.contentDir;

    if (resolved.score > 0) {
      const tasks = this.readJsonFile<Task[]>(path.join(contentDir, 'tasks.json')) || [];
      const notes = this.readJsonFile<Note[]>(path.join(contentDir, 'notes.json')) || [];
      const categories = this.readJsonFile<Array<{ id: number; name: string; color: string; icon?: string }>>(
        path.join(contentDir, 'categories.json')
      ) || [];
      const settings = this.readJsonFile<Record<string, unknown>>(path.join(contentDir, 'settings.json')) || {};
      const metadata = this.readJsonFile<{ version: string; lastUpdate: string; machineId: string }>(
        path.join(contentDir, 'metadata.json')
      ) || { version: '1.0.0', lastUpdate: new Date().toISOString(), machineId: '' };
      if (!options?.previewOnly) {
        const videosDir = this.findVideosDir(tempDir);
        if (videosDir) this.copyVideosFromDir(videosDir);
      }
      this.deleteFolderRecursive(tempDir);
      return { tasks, notes, categories, settings, metadata };
    }

    // Fallback: detecção inteligente de arquivos mistos (txt, sql, imagens, html, etc.)
    const scan = this.scanAllFiles(tempDir, { previewOnly: options?.previewOnly });
    const totalFiles = scan.textFiles.length + scan.imageFiles.length + scan.htmlFiles.length;

    if (totalFiles > 0 || scan.videoFiles.length > 0 || scan.docFiles.length > 0) {
      const mixed = this.buildNotesFromMixedFiles(scan, { previewOnly: options?.previewOnly });
      const metadata = { version: '1.0.0', lastUpdate: new Date().toISOString(), machineId: '' };
      if (!options?.previewOnly) {
        const videosDir = this.findVideosDir(tempDir);
        if (videosDir) this.copyVideosFromDir(videosDir);
      }
      this.deleteFolderRecursive(tempDir);
      return {
        tasks: [],
        notes: mixed.notes,
        categories: [],
        settings: { _importWarnings: mixed.warnings, _skippedFiles: mixed.skippedFiles },
        metadata,
      };
    }

    let top: string[] = [];
    try {
      top = fs.readdirSync(tempDir).slice(0, 50);
    } catch {
      // ignore
    }
    this.deleteFolderRecursive(tempDir);
    throw new Error(
      `Nenhum arquivo de dados encontrado no import. Esperado: tasks.json/notes.json/... ou HTML. Itens no topo: ${top.join(', ')}`
    );
  }

  async readDataFromFolder(folderPath: string, options?: { previewOnly?: boolean }): Promise<LocalStorageData> {
    if (!folderPath || typeof folderPath !== 'string') {
      throw new Error('Invalid folderPath');
    }
    if (!fs.existsSync(folderPath)) {
      throw new Error('Folder not found');
    }
    const stat = fs.statSync(folderPath);
    if (!stat.isDirectory()) {
      throw new Error('Path is not a folder');
    }

    const resolved = this.resolveImportContentDir(folderPath);
    const contentDir = resolved.contentDir;
    if (resolved.score > 0) {
      const tasks = this.readJsonFile<Task[]>(path.join(contentDir, 'tasks.json')) || [];
      const notes = this.readJsonFile<Note[]>(path.join(contentDir, 'notes.json')) || [];
      const categories = this.readJsonFile<Array<{ id: number; name: string; color: string; icon?: string }>>(
        path.join(contentDir, 'categories.json')
      ) || [];
      const settings = this.readJsonFile<Record<string, unknown>>(path.join(contentDir, 'settings.json')) || {};
      const metadata = this.readJsonFile<{ version: string; lastUpdate: string; machineId: string }>(
        path.join(contentDir, 'metadata.json')
      ) || { version: '1.0.0', lastUpdate: new Date().toISOString(), machineId: '' };
      if (!options?.previewOnly) {
        const videosDir = this.findVideosDir(folderPath);
        if (videosDir) this.copyVideosFromDir(videosDir);
      }
      return { tasks, notes, categories, settings, metadata };
    }

    // Fallback: detecção inteligente de arquivos mistos
    const scan = this.scanAllFiles(folderPath, { previewOnly: options?.previewOnly });
    const totalFiles = scan.textFiles.length + scan.imageFiles.length + scan.htmlFiles.length;

    if (totalFiles > 0 || scan.videoFiles.length > 0 || scan.docFiles.length > 0) {
      const mixed = this.buildNotesFromMixedFiles(scan, { previewOnly: options?.previewOnly });
      const metadata = { version: '1.0.0', lastUpdate: new Date().toISOString(), machineId: '' };
      if (!options?.previewOnly) {
        const videosDir = this.findVideosDir(folderPath);
        if (videosDir) this.copyVideosFromDir(videosDir);
      }
      return {
        tasks: [],
        notes: mixed.notes,
        categories: [],
        settings: { _importWarnings: mixed.warnings, _skippedFiles: mixed.skippedFiles },
        metadata,
      };
    }

    let top: string[] = [];
    try {
      top = fs.readdirSync(folderPath).slice(0, 50);
    } catch {
      // ignore
    }
    throw new Error(
      `Nenhum arquivo de dados encontrado na pasta. Esperado: tasks.json/notes.json/... ou HTML. Itens no topo: ${top.join(', ')}`
    );
  }

  async createZipToPath(outputPath: string): Promise<void> {
    if (!outputPath || typeof outputPath !== 'string') {
      throw new Error('Invalid outputPath');
    }
    await this.createZipArchive(outputPath);
  }

  /**
   * Migra dados de uma pasta para outra
   */
  async migrateData(fromPath: string, toPath: string): Promise<void> {
    // Copiar todos os arquivos da pasta antiga para a nova
    const sourceDirs = [
      path.join(fromPath, 'data'),
      path.join(fromPath, 'backups'),
    ];

    for (const sourceDir of sourceDirs) {
      if (fs.existsSync(sourceDir)) {
        const targetDir = sourceDir.replace(fromPath, toPath);
        this.copyFolderRecursive(sourceDir, targetDir);
      }
    }
  }

  // Métodos auxiliares privados

  private readJsonFile<T>(filePath: string): T | null {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content) as T;
    } catch (error) {
      console.error(`Error reading JSON file ${filePath}:`, error);
      return null;
    }
  }

  private async createZipArchive(outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', (err: Error) => reject(err));

      archive.pipe(output);

      // Adicionar arquivos da pasta data
      const dataDir = path.join(this.dataFolder, 'data');
      if (fs.existsSync(dataDir)) {
        archive.directory(dataDir, false);
      }

      const videosDir = path.join(app.getPath('userData'), 'nexus-videos');
      if (fs.existsSync(videosDir)) {
        archive.directory(videosDir, 'nexus-videos');
      }

      archive.finalize();
    });
  }

  private async extractZipArchive(zipPath: string, targetDir: string): Promise<void> {
    const extract = require('extract-zip');
    await extract(zipPath, { dir: targetDir });
  }

  private toArrayBuffer(buf: Buffer): ArrayBuffer {
    return Uint8Array.from(buf).buffer;
  }

  private bufferFromExtraction(extraction: unknown): Buffer {
    if (!extraction) return Buffer.from([]);
    if (Buffer.isBuffer(extraction)) return extraction;
    if (extraction instanceof Uint8Array) return Buffer.from(extraction);
    if (extraction instanceof ArrayBuffer) return Buffer.from(new Uint8Array(extraction));
    if (Array.isArray(extraction)) return Buffer.from(extraction);
    return Buffer.from([]);
  }

  private resolveUnrarWasmPath(): string {
    const candidates: string[] = [
      path.resolve(__dirname, 'unrar.wasm'),
      path.resolve(__dirname, '..', 'unrar.wasm'),
      path.resolve(__dirname, '..', '..', 'unrar.wasm'),
      path.resolve(process.resourcesPath, 'unrar.wasm'),
      path.resolve(process.resourcesPath, 'app.asar.unpacked', 'unrar.wasm'),
      path.resolve(process.resourcesPath, 'app.asar.unpacked', 'dist', 'main', 'unrar.wasm'),
      path.resolve(process.cwd(), 'dist', 'main', 'unrar.wasm'),
      path.resolve(process.cwd(), 'node_modules', 'node-unrar-js', 'dist', 'js', 'unrar.wasm'),
      path.resolve(process.cwd(), 'node_modules', 'node-unrar-js', 'esm', 'js', 'unrar.wasm'),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return candidates[0];
  }

  private async extractRarArchive(rarPath: string, targetDir: string): Promise<void> {
    const base = path.resolve(targetDir);
    fs.mkdirSync(base, { recursive: true });

    const wasmPath = this.resolveUnrarWasmPath();
    if (!fs.existsSync(wasmPath)) {
      throw new Error('unrar.wasm não encontrado');
    }

    const wasmBinary = this.toArrayBuffer(fs.readFileSync(wasmPath));
    const data = this.toArrayBuffer(fs.readFileSync(rarPath));

    const unrar = require('node-unrar-js') as {
      createExtractorFromData: (opts: { data: ArrayBuffer; wasmBinary?: ArrayBuffer; password?: string }) => Promise<{
        getFileList: () => {
          arcHeader?: { flags?: { headerEncrypted?: boolean; authInfo?: boolean } };
          fileHeaders?: Array<{ name?: string; flags?: { directory?: boolean; encrypted?: boolean } }>;
        };
        extract: (opts: Record<string, never>) => {
          files?: Array<{ fileHeader?: { name?: string; flags?: { directory?: boolean; encrypted?: boolean } }; extraction?: unknown }>;
        };
      }>;
    };

    const extractor = await unrar.createExtractorFromData({ data, wasmBinary });
    const list = extractor.getFileList();
    const fileHeaders = Array.from(list.fileHeaders || []);
    const archiveFlags = list.arcHeader?.flags;
    const anyEncrypted = Boolean(archiveFlags?.headerEncrypted)
      || Boolean(archiveFlags?.authInfo)
      || fileHeaders.some((h) => Boolean(h?.flags?.encrypted));
    if (anyEncrypted) {
      throw new Error('RAR com senha não suportado neste MVP');
    }

    const extracted = extractor.extract({});
    const files = Array.from(extracted.files || []);
    if (files.length === 0) {
      throw new Error('RAR não contém arquivos extraíveis (ou falha na extração)');
    }

    for (const f of files) {
      const nameRaw = String(f.fileHeader?.name || '').replace(/\\/g, '/');
      if (!nameRaw) continue;

      const isDir = Boolean(f.fileHeader?.flags?.directory);
      const safeParts = nameRaw.split('/').filter((p) => p && p !== '.' && p !== '..');
      const relPath = safeParts.join(path.sep);
      if (!relPath) continue;

      const outPath = path.resolve(base, relPath);
      if (!outPath.startsWith(base + path.sep) && outPath !== base) continue;

      if (isDir) {
        fs.mkdirSync(outPath, { recursive: true });
        continue;
      }

      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, this.bufferFromExtraction(f.extraction));
    }
  }

  private async extractArchive(archivePath: string, targetDir: string): Promise<void> {
    const ext = path.extname(archivePath).toLowerCase();
    if (ext === '.rar') {
      await this.extractRarArchive(archivePath, targetDir);
      return;
    }
    await this.extractZipArchive(archivePath, targetDir);
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }

  private copyFolderRecursive(source: string, target: string): void {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    const files = fs.readdirSync(source);
    for (const file of files) {
      const sourcePath = path.join(source, file);
      const targetPath = path.join(target, file);

      if (fs.lstatSync(sourcePath).isDirectory()) {
        this.copyFolderRecursive(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }

  private deleteFolderRecursive(folderPath: string): void {
    if (fs.existsSync(folderPath)) {
      fs.readdirSync(folderPath).forEach((file) => {
        const curPath = path.join(folderPath, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          this.deleteFolderRecursive(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(folderPath);
    }
  }
}
