import { hashBuffer, verifyHash, hashString } from '@traza/crypto';

describe('Cryptographic Functions', () => {
  describe('hashBuffer', () => {
    it('should generate consistent SHA-256 hash', () => {
      const buffer = Buffer.from('test document content');
      const hash1 = hashBuffer(buffer);
      const hash2 = hashBuffer(buffer);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different hashes for different inputs', () => {
      const buf1 = Buffer.from('document A');
      const buf2 = Buffer.from('document B');

      expect(hashBuffer(buf1)).not.toBe(hashBuffer(buf2));
    });

    it('should handle empty buffer', () => {
      const hash = hashBuffer(Buffer.alloc(0));
      expect(hash).toHaveLength(64);
    });

    it('should handle large buffer', () => {
      const large = Buffer.alloc(1024 * 1024, 'x'); // 1MB
      const hash = hashBuffer(large);
      expect(hash).toHaveLength(64);
    });
  });

  describe('verifyHash', () => {
    it('should return true for matching hash', () => {
      const buffer = Buffer.from('test document');
      const hash = hashBuffer(buffer);

      expect(verifyHash(buffer, hash)).toBe(true);
    });

    it('should return false for non-matching hash', () => {
      const buffer = Buffer.from('test document');
      const wrongHash = 'a'.repeat(64);

      expect(verifyHash(buffer, wrongHash)).toBe(false);
    });

    it('should return false if content is modified', () => {
      const original = Buffer.from('original content');
      const hash = hashBuffer(original);
      const modified = Buffer.from('modified content');

      expect(verifyHash(modified, hash)).toBe(false);
    });
  });

  describe('hashString', () => {
    it('should hash a string consistently', () => {
      const hash1 = hashString('hello');
      const hash2 = hashString('hello');

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should produce different hashes for different strings', () => {
      expect(hashString('hello')).not.toBe(hashString('world'));
    });
  });
});
