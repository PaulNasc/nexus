export interface ParsedPdfRef {
  raw: string;
  storagePath?: string;
  localFileName?: string;
  isCloud: boolean;
}

const CLOUD_PREFIX = 'pdfcloud:';

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export function buildCloudPdfRef(storagePath: string, localFileName?: string): string {
  const encodedPath = encodeURIComponent(storagePath);
  if (!localFileName) return `${CLOUD_PREFIX}${encodedPath}`;
  return `${CLOUD_PREFIX}${encodedPath}|${encodeURIComponent(localFileName)}`;
}

export function parsePdfRef(rawValue: string): ParsedPdfRef {
  const raw = String(rawValue || '').trim();
  if (!raw.startsWith(CLOUD_PREFIX)) {
    return { raw, isCloud: false };
  }

  const body = raw.slice(CLOUD_PREFIX.length);
  const sep = body.indexOf('|');
  if (sep === -1) {
    const storagePath = safeDecode(body);
    const localFileName = storagePath.split('/').pop() || undefined;
    return { raw, isCloud: true, storagePath, localFileName };
  }

  const storagePath = safeDecode(body.slice(0, sep));
  const localFileName = safeDecode(body.slice(sep + 1)) || storagePath.split('/').pop() || undefined;
  return { raw, isCloud: true, storagePath, localFileName };
}
