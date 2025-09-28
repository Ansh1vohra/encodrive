import nacl from 'tweetnacl';
import argon2 from 'argon2-browser';

/**
 * Derives a 32-byte key from a password using Argon2id
 */
async function deriveKey(password, salt) {
  const result = await argon2.hash({
    pass: password,
    salt: salt,
    time: 1,
    mem: 16384,
    hashLen: 32,
    parallelism: 1,
    type: argon2.ArgonType.Argon2id
  });

  return result.hash; // Uint8Array (32 bytes)
}

/**
 * Encrypts an ArrayBuffer using XSalsa20-Poly1305 with a password-derived key
 */
export async function encryptFile(arrayBuffer, password) {
  const salt = nacl.randomBytes(16); // Unique per encryption
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength); // 24 bytes
  const key = await deriveKey(password, salt); // 32 bytes

  const message = new Uint8Array(arrayBuffer);
  const box = nacl.secretbox(message, nonce, key);

  // Combine: salt + nonce + ciphertext
  const combined = new Uint8Array(salt.length + nonce.length + box.length);
  combined.set(salt, 0);
  combined.set(nonce, salt.length);
  combined.set(box, salt.length + nonce.length);

  return combined.buffer;
}

/**
 * Decrypts a buffer encrypted by `encryptFile`
 */
export async function decryptFile(encryptedBuffer, password) {
  const data = new Uint8Array(encryptedBuffer);

  const salt = data.slice(0, 16);
  const nonce = data.slice(16, 16 + nacl.secretbox.nonceLength);
  const box = data.slice(16 + nacl.secretbox.nonceLength);

  const key = await deriveKey(password, salt);
  const message = nacl.secretbox.open(box, nonce, key);

  if (!message) {
    throw new Error('Decryption failed: wrong password or corrupted file.');
  }

  return new Uint8Array(message).buffer;
}
