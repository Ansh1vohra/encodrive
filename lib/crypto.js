import CryptoJS from 'crypto-js';

/**
 * Encrypts an ArrayBuffer and returns ArrayBuffer.
 * @param {ArrayBuffer} arrayBuffer
 * @param {string} key
 */
export function encryptFile(arrayBuffer, key) {
  const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);

  // Generate random IV (16 bytes = 128 bits)
  const iv = CryptoJS.lib.WordArray.random(16);

  // Parse the key (handle both string and WordArray)
  const parsedKey = typeof key === 'string' ? 
    CryptoJS.enc.Utf8.parse(key) : 
    key;

  // Encrypt with AES-CBC
  const encrypted = CryptoJS.AES.encrypt(wordArray, parsedKey, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  // Combine IV + ciphertext (IV is already part of encrypted object)
  // encrypted.toString() includes IV, but we want raw bytes
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

  // Extract IV (first 16 bytes = 128 bits = 4 words)
  const iv = CryptoJS.lib.WordArray.create(
    combined.words.slice(0, 4), // first 4 words = 16 bytes
    16
  );

  // Extract ciphertext (rest of the bytes)
  const ciphertextWords = combined.words.slice(4);
  const ciphertext = CryptoJS.lib.WordArray.create(
    ciphertextWords,
    combined.sigBytes - 16
  );

  // Parse the key
  const parsedKey = typeof key === 'string' ? 
    CryptoJS.enc.Utf8.parse(key) : 
    key;

  // Decrypt
  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: ciphertext },
    parsedKey,
    { 
      iv: iv, 
      mode: CryptoJS.mode.CBC, 
      padding: CryptoJS.pad.Pkcs7 
    }
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
  let currentWord = 0;
  
  for (let i = 0; i < view.length; i++) {
    // Build word from 4 bytes
    currentWord |= view[i] << (24 - (i % 4) * 8);
    
    // Every 4 bytes, push the word and reset
    if ((i + 1) % 4 === 0 || i === view.length - 1) {
      words.push(currentWord);
      currentWord = 0;
    }
  }
  
  return CryptoJS.lib.WordArray.create(words, view.length);
}

/**
 * Convert WordArray → ArrayBuffer (for decrypted data)
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