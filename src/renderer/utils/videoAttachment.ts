export interface ParsedVideoRef {
  raw: string;
  localFileName: string;
  storagePath?: string;
}

const CLOUD_PREFIX = 'cloud:';

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export function buildCloudVideoRef(storagePath: string, localFileName: string): string {
  return `${CLOUD_PREFIX}${encodeURIComponent(storagePath)}|${encodeURIComponent(localFileName)}`;
}

export function parseVideoRef(rawValue: string): ParsedVideoRef {
  const raw = String(rawValue || '').trim();
  if (!raw.startsWith(CLOUD_PREFIX)) {
    return { raw, localFileName: raw };
  }

  const body = raw.slice(CLOUD_PREFIX.length);
  const sep = body.indexOf('|');
  if (sep === -1) {
    const decoded = safeDecode(body);
    const leaf = decoded.split('/').pop() || decoded;
    return { raw, storagePath: decoded, localFileName: leaf };
  }

  const encodedPath = body.slice(0, sep);
  const encodedName = body.slice(sep + 1);
  const storagePath = safeDecode(encodedPath);
  const localFileName = safeDecode(encodedName) || storagePath.split('/').pop() || storagePath;
  return { raw, storagePath, localFileName };
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const clean = (base64 || '').replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
