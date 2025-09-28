import { scrypt } from 'scrypt-js';
import nacl from 'tweetnacl';

/**
 * Derives a 32-byte key using scrypt (no WASM, browser-safe)
 */
async function deriveKey(password, salt) {
  const key = await scrypt(
    new TextEncoder().encode(password),
    salt,
    16384, // N = CPU/memory cost
    8,     // r = block size
    1,     // p = parallelization
    32     // key length in bytes
  );
  return new Uint8Array(key);
}

/**
 * Encrypts an ArrayBuffer using XSalsa20-Poly1305
 */
export async function encryptFile(arrayBuffer, password) {
  const salt = nacl.randomBytes(16); // 16-byte salt
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength); // 24-byte nonce
  const key = await deriveKey(password, salt);

  const message = new Uint8Array(arrayBuffer);
  const box = nacl.secretbox(message, nonce, key);

  const combined = new Uint8Array(salt.length + nonce.length + box.length);
  combined.set(salt, 0);
  combined.set(nonce, salt.length);
  combined.set(box, salt.length + nonce.length);

  return combined.buffer;
}

/**
 * Decrypts encrypted ArrayBuffer
 */
export async function decryptFile(encryptedBuffer, password) {
  const data = new Uint8Array(encryptedBuffer);

  const salt = data.slice(0, 16);
  const nonce = data.slice(16, 16 + nacl.secretbox.nonceLength);
  const box = data.slice(16 + nacl.secretbox.nonceLength);

  const key = await deriveKey(password, salt);
  const message = nacl.secretbox.open(box, nonce, key);

  if (!message) throw new Error('Decryption failed');

  return new Uint8Array(message).buffer;
}
