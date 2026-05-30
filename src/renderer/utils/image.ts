/**
 * Resolves an image URL, replacing broken/blocked via.placeholder.com URLs
 * with a self-contained inline SVG data URL to prevent console connection errors.
 */
export const resolveImageUrl = (url: string): string => {
  if (!url) return '';
  
  if (url.includes('via.placeholder.com')) {
    const match = url.match(/\/(\d+)x(\d+)/);
    const width = match ? parseInt(match[1], 10) : 600;
    const height = match ? parseInt(match[2], 10) : 200;
    const text = 'Imagem Indisponível';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#27272a" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#71717a" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="500">${text}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
  return url;
};
