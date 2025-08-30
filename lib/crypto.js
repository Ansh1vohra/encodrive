import CryptoJS from 'crypto-js';

/**
 * Encrypts an ArrayBuffer.
 * @param {ArrayBuffer} arrayBuffer The raw file data.
 * @param {string} key The encryption key.
 * @returns {string} A Base64 string representing the encrypted data.
 */
export function encryptFile(arrayBuffer, key) {
  // 1. Convert ArrayBuffer to a WordArray, crypto-js's native data format.
  const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);

  // 2. Encrypt the WordArray.
  const encrypted = CryptoJS.AES.encrypt(wordArray, key);

  // 3. Return the encrypted data as a Base64 string.
  return encrypted.toString();
}

/**
 * Decrypts a Base64 ciphertext string.
 * @param {string} ciphertext The Base64 encrypted string.
 * @param {string} key The encryption key.
 * @returns {ArrayBuffer} The decrypted raw file data.
 */
export function decryptFile(ciphertext, key) {
  // 1. Decrypt the Base64 string. This returns a WordArray.
  const decrypted = CryptoJS.AES.decrypt(ciphertext, key);

  // 2. Convert the decrypted WordArray back to an ArrayBuffer.
  const arrayBuffer = wordArrayToArrayBuffer(decrypted);

  return arrayBuffer;
}

/**
 * Helper function to convert a WordArray to an ArrayBuffer.
 */
function wordArrayToArrayBuffer(wordArray) {
  const { words, sigBytes } = wordArray;
  const buffer = new ArrayBuffer(sigBytes);
  const view = new Uint8Array(buffer);

  for (let i = 0; i < sigBytes; i++) {
    // Get the byte from the WordArray
    const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    view[i] = byte;
  }

  return buffer;
}