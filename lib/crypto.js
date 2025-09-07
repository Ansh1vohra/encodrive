import CryptoJS from 'crypto-js';
export function encryptFile(arrayBuffer, key) {
  const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);

  // Always use 256-bit key
  const parsedKey = CryptoJS.SHA256(key);

  const iv = CryptoJS.lib.WordArray.random(16);

  const encrypted = CryptoJS.AES.encrypt(wordArray, parsedKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  // Combine IV + ciphertext
  const ivBytes = wordArrayToArrayBuffer(iv);
  const cipherBytes = wordArrayToArrayBuffer(encrypted.ciphertext);

  const combined = new Uint8Array(ivBytes.byteLength + cipherBytes.byteLength);
  combined.set(new Uint8Array(ivBytes), 0);
  combined.set(new Uint8Array(cipherBytes), ivBytes.byteLength);

  return combined.buffer; // ArrayBuffer
}

export function decryptFile(encryptedBuffer, key) {
  const parsedKey = CryptoJS.SHA256(key);

  const ivBytes = new Uint8Array(encryptedBuffer.slice(0, 16));
  const cipherBytes = new Uint8Array(encryptedBuffer.slice(16));

  const iv = CryptoJS.lib.WordArray.create(ivBytes);
  const ciphertext = CryptoJS.lib.WordArray.create(cipherBytes);

  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext },
    parsedKey,
    {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  );

  return wordArrayToArrayBuffer(decrypted);
}
