import axios from 'axios';
// We assume crypto.js functions are designed to work with ArrayBuffers
import { encryptFile, decryptFile } from './crypto.js';

export default class Encodrive {
  constructor({ apiKey, encryptionKey, apiUrl }) {
    if (!apiKey || !encryptionKey) {
      throw new Error("apiKey and encryptionKey are required");
    }
    this.apiKey = apiKey;
    this.encryptionKey = encryptionKey;
    this.uploadUrl = apiUrl || "https://stksyq2ick.execute-api.ap-south-1.amazonaws.com/dev/api/file/upload-url";
  }

  /**
   * Encrypts and uploads any file (text, image, pdf, etc.).
   * @param {File} file The file object from an input field.
   * @returns {Promise<string>} A promise that resolves with the URL of the file.
   */
  async uploadFile(file) {
    // 1. Read file as an ArrayBuffer, which works for all file types.
    // .arrayBuffer() is a modern method that returns a promise.
    const fileContentBuffer = await file.arrayBuffer();

    // 2. Encrypt the buffer. Assumes encryptFile returns an ArrayBuffer.
    const encryptedBuffer = encryptFile(fileContentBuffer, this.encryptionKey);

    // 3. Convert encrypted binary data to a Base64 string for safe JSON transport.
    const encryptedBase64 = this._arrayBufferToBase64(encryptedBuffer);

    // 4. Send the Base64 string to your API.
    const response = await axios.post(
      this.uploadUrl,
      { file: encryptedBase64 }, // The payload contains the Base64 string
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );

    return response.data.url; // Return the file URL from the API response
  }

  /**
   * Downloads and decrypts a file from a URL.
   * @param {string} fileUrl The URL to download the encrypted file from.
   * @returns {Promise<ArrayBuffer>} A promise that resolves with the decrypted file data as an ArrayBuffer.
   */
  async downloadFile(fileUrl) {
    // 1. Download the Base64 encoded file content.
    // We expect the server to return the raw Base64 string as plain text.
    const response = await axios.get(fileUrl, { responseType: 'text' });
    const encryptedBase64 = response.data;

    // 2. Convert the Base64 string back into binary data (ArrayBuffer).
    const encryptedBuffer = this._base64ToArrayBuffer(encryptedBase64);

    // 3. Decrypt the buffer.
    const decryptedBuffer = decryptFile(encryptedBuffer, this.encryptionKey);

    // The raw, decrypted file data is returned.
    return decryptedBuffer;
  }

  // Helper method to convert an ArrayBuffer to a Base64 string.
  _arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Helper method to convert a Base64 string back to an ArrayBuffer.
  _base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }
}