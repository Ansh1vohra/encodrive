import CryptoJS from 'crypto-js';

/**
 * Encrypts an ArrayBuffer and returns ArrayBuffer.
 * @param {ArrayBuffer} arrayBuffer
 * @param {string} key
 */
export function encryptFile(arrayBuffer, key) {
  const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);

  // Generate random IV
  const iv = CryptoJS.lib.WordArray.random(16);

  // Derive key (PBKDF2 optional, for now just use passphrase)
  const encrypted = CryptoJS.AES.encrypt(wordArray, CryptoJS.enc.Utf8.parse(key), {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  // Combine IV + ciphertext
  const combined = iv.concat(encrypted.ciphertext);

  // Convert to ArrayBuffer for upload
  return cryptoJsWordArrayToArrayBuffer(combined);
}

/**
 * Decrypts encrypted ArrayBuffer.
 * @param {ArrayBuffer} encryptedBuffer
 * @param {string} key
 */
export function decryptFile(encryptedBuffer, key) {
  // Convert to WordArray
  const combined = arrayBufferToCryptoJsWordArray(encryptedBuffer);

  // Extract IV (first 16 bytes = 128 bits)
  const iv = CryptoJS.lib.WordArray.create(
    combined.words.slice(0, 4), // first 4 words = 16 bytes
    16
  );

  // Extract ciphertext (rest)
  const ciphertext = CryptoJS.lib.WordArray.create(
    combined.words.slice(4),
    combined.sigBytes - 16
  );

  // Decrypt
  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: ciphertext },
    CryptoJS.enc.Utf8.parse(key),
    { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
  );

  return wordArrayToArrayBuffer(decrypted);
}

/**
 * Convert CryptoJS WordArray → ArrayBuffer
 */
function cryptoJsWordArrayToArrayBuffer(wordArray) {
  const { words, sigBytes } = wordArray;
  const buffer = new ArrayBuffer(sigBytes);
  const view = new Uint8Array(buffer);

  for (let i = 0; i < sigBytes; i++) {
    view[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }

  return buffer;
}

/**
 * Convert ArrayBuffer → CryptoJS WordArray
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
 * Convert WordArray → ArrayBuffer
 */
function wordArrayToArrayBuffer(wordArray) {
  const { words, sigBytes } = wordArray;
  const buffer = new ArrayBuffer(sigBytes);
  const view = new Uint8Array(buffer);

  for (let i = 0; i < sigBytes; i++) {
    view[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return buffer;
}
