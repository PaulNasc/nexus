import { resolveImageUrl } from '../image';

describe('image utility tests', () => {
  describe('resolveImageUrl', () => {
    it('should return empty string if input is empty', () => {
      expect(resolveImageUrl('')).toBe('');
    });

    it('should return original URL if it does not contain via.placeholder.com', () => {
      const url = 'https://example.com/assets/banner.png';
      expect(resolveImageUrl(url)).toBe(url);
    });

    it('should intercept via.placeholder.com URLs and return base64 inline SVG with correct dimensions', () => {
      const url = 'https://via.placeholder.com/600x200';
      const result = resolveImageUrl(url);
      expect(result).toContain('data:image/svg+xml');
      expect(result).toContain('width%3D%22600%22');
      expect(result).toContain('height%3D%22200%22');
      expect(result).toContain('viewBox%3D%220%200%20600%20200%22');
      expect(result).toContain('Imagem%20Indispon%C3%ADvel');
    });

    it('should extract other dimensions correctly', () => {
      const url = 'https://via.placeholder.com/150x50';
      const result = resolveImageUrl(url);
      expect(result).toContain('data:image/svg+xml');
      expect(result).toContain('width%3D%22150%22');
      expect(result).toContain('height%3D%2250%22');
      expect(result).toContain('viewBox%3D%220%200%20150%2050%22');
    });
  });
});
