import { buildCloudPdfRef, parsePdfRef } from '../pdfAttachment';

describe('pdfAttachment utility tests', () => {
  describe('buildCloudPdfRef', () => {
    it('should build a cloud pdf ref without local filename correctly', () => {
      const storagePath = 'org/123/doc.pdf';
      const ref = buildCloudPdfRef(storagePath);
      expect(ref).toBe('pdfcloud:org%2F123%2Fdoc.pdf');
    });

    it('should build a cloud pdf ref with local filename correctly', () => {
      const storagePath = 'org/123/doc.pdf';
      const localFileName = 'my-doc.pdf';
      const ref = buildCloudPdfRef(storagePath, localFileName);
      expect(ref).toBe('pdfcloud:org%2F123%2Fdoc.pdf|my-doc.pdf');
    });
  });

  describe('parsePdfRef', () => {
    it('should parse local pdf reference correctly', () => {
      const raw = 'C:/Users/User/Documents/my-doc.pdf';
      const parsed = parsePdfRef(raw);
      expect(parsed).toEqual({
        raw,
        isCloud: false,
      });
    });

    it('should parse cloud pdf reference without separator correctly', () => {
      const raw = 'pdfcloud:org/123/doc.pdf';
      const parsed = parsePdfRef(raw);
      expect(parsed).toEqual({
        raw,
        isCloud: true,
        storagePath: 'org/123/doc.pdf',
        localFileName: 'doc.pdf',
      });
    });

    it('should parse cloud pdf reference with separator correctly', () => {
      const raw = 'pdfcloud:org%2F123%2Fdoc.pdf|my-doc.pdf';
      const parsed = parsePdfRef(raw);
      expect(parsed).toEqual({
        raw,
        isCloud: true,
        storagePath: 'org/123/doc.pdf',
        localFileName: 'my-doc.pdf',
      });
    });
  });
});
