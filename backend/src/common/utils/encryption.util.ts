import * as CryptoJS from 'crypto-js';

export class EncryptionUtil {
  static encrypt(text: string, key: string): string {
    const encrypted = CryptoJS.AES.encrypt(text, key).toString();
    return encrypted;
  }

  static decrypt(encrypted: string, key: string): string {
    const bytes = CryptoJS.AES.decrypt(encrypted, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
