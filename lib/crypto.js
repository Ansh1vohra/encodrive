import CryptoJS from 'crypto-js';

/**
 * Encrypts an ArrayBuffer and returns ArrayBuffer.
 * @param {ArrayBuffer} arrayBuffer The raw file data.
 * @param {string} key The encryption key.
 * @returns {ArrayBuffer} Encrypted binary data.
 */
export function encryptFile(arrayBuffer, key) {
  const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
  const encrypted = CryptoJS.AES.encrypt(wordArray, key);
  
  // Convert from CryptoJS format to ArrayBuffer
  return cryptoJsWordArrayToArrayBuffer(encrypted.ciphertext);
}

/**
 * Decrypts binary encrypted data.
 * @param {ArrayBuffer} encryptedBuffer The encrypted binary data.
 * @param {string} key The encryption key.
 * @returns {ArrayBuffer} The decrypted raw file data.
 */
export function decryptFile(encryptedBuffer, key) {
  // Convert ArrayBuffer to CryptoJS WordArray
  const ciphertext = arrayBufferToCryptoJsWordArray(encryptedBuffer);
  
  // Create a CryptoJS cipherParams object
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: ciphertext
  });
  
  const decrypted = CryptoJS.AES.decrypt(cipherParams, key);
  return wordArrayToArrayBuffer(decrypted);
}

/**
 * Convert CryptoJS WordArray to ArrayBuffer.
 */
function cryptoJsWordArrayToArrayBuffer(wordArray) {
  const { words, sigBytes } = wordArray;
  const buffer = new ArrayBuffer(sigBytes);
  const view = new Uint8Array(buffer);

  for (let i = 0; i < sigBytes; i++) {
    const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    view[i] = byte;
  }

  return buffer;
}

/**
 * Convert ArrayBuffer to CryptoJS WordArray.
 */
function arrayBufferToCryptoJsWordArray(arrayBuffer) {
  const view = new Uint8Array(arrayBuffer);
  const words = [];
  
  for (let i = 0; i < view.length; i += 4) {
    let word = 0;
    for (let j = 0; j < 4 && i + j < view.length; j++) {
      word |= view[i + j] << (24 - j * 8);
    }
    words.push(word);
  }
  
  return CryptoJS.lib.WordArray.create(words, view.length);
}

/**
 * Convert WordArray to ArrayBuffer (for decrypted data).
 */
function wordArrayToArrayBuffer(wordArray) {
  const { words, sigBytes } = wordArray;
  const buffer = new ArrayBuffer(sigBytes);
  const view = new Uint8Array(buffer);

  for (let i = 0; i < sigBytes; i++) {
    const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    view[i] = byte;
  }

  return buffer;
}