import { buildCloudVideoRef, parseVideoRef, base64ToUint8Array } from '../videoAttachment';

describe('videoAttachment utility tests', () => {
  describe('buildCloudVideoRef', () => {
    it('should build a cloud video ref correctly', () => {
      const storagePath = 'org/123/video.mp4';
      const localFileName = 'video.mp4';
      const ref = buildCloudVideoRef(storagePath, localFileName);
      expect(ref).toBe('cloud:org%2F123%2Fvideo.mp4|video.mp4');
    });
  });

  describe('parseVideoRef', () => {
    it('should parse local video reference correctly', () => {
      const raw = 'C:/Users/User/Videos/my-video.mp4';
      const parsed = parseVideoRef(raw);
      expect(parsed).toEqual({
        raw,
        localFileName: raw,
      });
    });

    it('should parse cloud video reference without separator correctly', () => {
      const raw = 'cloud:org/123/video.mp4';
      const parsed = parseVideoRef(raw);
      expect(parsed).toEqual({
        raw,
        storagePath: 'org/123/video.mp4',
        localFileName: 'video.mp4',
      });
    });

    it('should parse cloud video reference with separator correctly', () => {
      const raw = 'cloud:org%2F123%2Fvideo.mp4|my-video.mp4';
      const parsed = parseVideoRef(raw);
      expect(parsed).toEqual({
        raw,
        storagePath: 'org/123/video.mp4',
        localFileName: 'my-video.mp4',
      });
    });
  });

  describe('base64ToUint8Array', () => {
    it('should convert base64 to Uint8Array correctly', () => {
      const base64 = 'SGVsbG8gV29ybGQ='; // "Hello World"
      const array = base64ToUint8Array(base64);
      expect(array).toBeInstanceOf(Uint8Array);
      expect(array.length).toBe(11);
      expect(String.fromCharCode(...Array.from(array))).toBe('Hello World');
    });
  });
});
