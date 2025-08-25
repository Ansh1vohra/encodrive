import CryptoJS from 'crypto-js';

export function encryptFile(fileContent, key) {
  return CryptoJS.AES.encrypt(fileContent, key).toString();
}

export function decryptFile(ciphertext, key) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}
