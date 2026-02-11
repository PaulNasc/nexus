import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';

export class EncryptedJsonStore<T = unknown> {
  private readonly filePath: string;

  constructor(fileName: string) {
    const userData = app.getPath('userData');
    const legacyBase = path.join(userData, 'Nexus', 'cloud');
    const baseDir = path.join(userData, 'Nexus', 'cloud');
    try {
      if (fs.existsSync(legacyBase) && !fs.existsSync(baseDir)) {
        fs.mkdirSync(path.dirname(baseDir), { recursive: true });
        fs.renameSync(legacyBase, baseDir);
      }
    } catch {
      // ignore migration failures
    }
    fs.mkdirSync(baseDir, { recursive: true });
    this.filePath = path.join(baseDir, fileName);
  }

  read(): T | null {
    try {
      if (!fs.existsSync(this.filePath)) return null;
      const raw = fs.readFileSync(this.filePath);
      if (safeStorage.isEncryptionAvailable()) {
        const decrypted = safeStorage.decryptString(raw);
        return JSON.parse(decrypted) as T;
      }
      return JSON.parse(raw.toString('utf8')) as T;
    } catch {
      return null;
    }
  }

  write(value: T): void {
    const plaintext = JSON.stringify(value);
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(plaintext);
      fs.writeFileSync(this.filePath, encrypted);
      return;
    }
    fs.writeFileSync(this.filePath, plaintext, 'utf8');
  }

  clear(): void {
    try {
      if (fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath);
    } catch {
      // ignore
    }
  }
}
