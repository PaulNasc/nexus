import * as path from 'path';
import * as fs from 'fs';
import { createHash, randomUUID } from 'crypto';
import { XMLParser } from 'fast-xml-parser';
import * as cheerio from 'cheerio';
import type { Note, NoteAttachment } from '../../shared/types/note';

type EnexParseResult = {
  notes: Note[];
};

const asRecord = (v: unknown): Record<string, unknown> => {
  if (v && typeof v === 'object') return v as Record<string, unknown>;
  return {};
};

const toArray = (v: unknown): unknown[] => {
  if (Array.isArray(v)) return v;
  if (v === null || v === undefined) return [];
  return [v];
};

const getString = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

const getAppDataRoot = (): string => {
  const userDataPath = process.env.APPDATA || process.env.HOME || process.cwd();
  const legacy = path.join(userDataPath, 'Krigzis', 'data');
  const target = path.join(userDataPath, 'Nexus', 'data');
  if (fs.existsSync(target)) return target;
  if (fs.existsSync(legacy)) return legacy;
  return target;
};

const ensureDir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const sanitizeFileExt = (ext: string): string => {
  const cleaned = (ext || '').trim().toLowerCase().replace(/[^a-z0-9.]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('.')) return cleaned;
  return `.${cleaned}`;
};

const extFromMime = (mime: string): string => {
  const m = (mime || '').toLowerCase();
  if (m === 'image/jpeg') return '.jpg';
  if (m === 'image/jpg') return '.jpg';
  if (m === 'image/png') return '.png';
  if (m === 'image/gif') return '.gif';
  if (m === 'image/webp') return '.webp';
  if (m === 'image/svg+xml') return '.svg';
  if (m === 'application/pdf') return '.pdf';
  if (m === 'text/plain') return '.txt';
  if (m === 'text/markdown') return '.md';
  return '';
};

const sha256Hex = (buf: Buffer): string => createHash('sha256').update(buf).digest('hex');
const md5Hex = (buf: Buffer): string => createHash('md5').update(buf).digest('hex');

const toFileUrl = (absolutePath: string): string => {
  const resolved = path.resolve(absolutePath);
  const withSlashes = resolved.replace(/\\/g, '/');
  if (/^[a-zA-Z]:\//.test(withSlashes)) {
    return encodeURI(`file:///${withSlashes}`);
  }
  return encodeURI(`file://${withSlashes}`);
};

const decodeBase64Strict = (base64: string): Buffer => {
  const normalized = (base64 || '').trim().replace(/\s+/g, '');
  if (!normalized) throw new Error('Anexo sem dados (base64 vazio)');
  const buf = Buffer.from(normalized, 'base64');
  if (!buf || buf.length === 0) throw new Error('Falha ao decodificar anexo (base64 inválido)');
  return buf;
};

const htmlToTextPreserveLines = (html: string): string => {
  const $ = cheerio.load(html || '', { xmlMode: false });
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
  const text = $.root().text();
  return text.replace(/\n{3,}/g, '\n\n').trim();
};

const enmlToMarkdownWithImages = (enml: string, mediaHashToUrl: Map<string, { url: string; name: string }>): string => {
  const $ = cheerio.load(enml || '', { xmlMode: true });

  $('en-media').each((_, el) => {
    const hash = String($(el).attr('hash') || '').trim();
    if (!hash) {
      throw new Error('en-media sem hash');
    }
    const ref = mediaHashToUrl.get(hash);
    if (!ref) {
      throw new Error(`Imagem referenciada não encontrada (hash ${hash})`);
    }
    $(el).replaceWith(`![${ref.name}](${ref.url})`);
  });

  const rendered = $.root().html() || '';
  return htmlToTextPreserveLines(rendered);
};

export const parseEnexToNotes = (xmlText: string): EnexParseResult => {
  const xml = typeof xmlText === 'string' ? xmlText : '';
  if (xml.trim().length === 0) {
    throw new Error('ENEX vazio');
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
    trimValues: false,
  });

  const doc = parser.parse(xml) as unknown;
  const exportRoot = asRecord(asRecord(doc).en_export);
  const rawNotes = exportRoot.note;
  const notesArr = toArray(rawNotes);

  if (notesArr.length === 0) {
    throw new Error('ENEX sem notas');
  }

  const now = new Date().toISOString();
  const dataRoot = getAppDataRoot();
  const imagesDir = path.join(dataRoot, 'attachments', 'images');
  const filesDir = path.join(dataRoot, 'attachments', 'files');
  ensureDir(imagesDir);
  ensureDir(filesDir);

  const idBase = Date.now() * 1000;
  let idOffset = 0;
  const outNotes: Note[] = [];

  for (const n of notesArr) {
    const noteRec = asRecord(n);
    const noteId = idBase + idOffset;
    const title = getString(noteRec.title).trim() || 'Sem título';
    const contentRaw = getString(noteRec.content).trim();

    const resourcesRaw = noteRec.resource;
    const resources = toArray(resourcesRaw);

    const attachments: NoteAttachment[] = [];
    const mediaHashToUrl = new Map<string, { url: string; name: string }>();

    for (const r of resources) {
      const resRec = asRecord(r);
      const mimeType = getString(resRec.mime).trim();
      const dataNode = resRec.data;
      const dataRec = asRecord(dataNode);
      const base64 = typeof dataNode === 'string' ? dataNode : getString(dataRec['#text'] ?? dataRec['@_'] ?? '');
      const buf = decodeBase64Strict(base64);

      const md5 = typeof dataNode === 'object' && dataNode ? getString(dataRec['@_hash'] ?? '') : '';
      const resourceMd5 = md5 || md5Hex(buf);

      const attrs = asRecord(
        resRec['resource-attributes'] ?? resRec.resource_attributes ?? resRec.resourceAttributes ?? resRec.resource_attributes
      );
      const originalName = getString(attrs.file_name ?? attrs['file-name'] ?? attrs.filename ?? '').trim();

      const extFromName = sanitizeFileExt(path.extname(originalName));
      const ext = extFromName || extFromMime(mimeType);
      const sha = sha256Hex(buf);
      const fileName = `${sha}${ext}`;

      const isImage = mimeType.toLowerCase().startsWith('image/');
      const targetDir = isImage ? imagesDir : filesDir;
      const absPath = path.join(targetDir, fileName);

      if (!fs.existsSync(absPath)) {
        fs.writeFileSync(absPath, buf);
      }

      const url = toFileUrl(absPath);
      const attName = originalName || fileName;

      attachments.push({
        id: randomUUID(),
        noteId,
        type: isImage ? 'image' : 'file',
        url,
        name: attName,
        size: buf.length,
        mimeType,
        created_at: now,
      });

      if (isImage) {
        mediaHashToUrl.set(resourceMd5, { url, name: attName });
      }
    }

    const bodyMd = enmlToMarkdownWithImages(contentRaw, mediaHashToUrl);
    const finalMd = `# ${title}\n\n${bodyMd}`.trim();

    outNotes.push({
      id: noteId,
      title,
      content: finalMd,
      format: 'markdown',
      attachments: attachments.length > 0 ? attachments : undefined,
      created_at: now,
      updated_at: now,
    });

    idOffset += 1;
  }

  return { notes: outNotes };
};
