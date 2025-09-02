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
    // 1. Request signed URL from your backend
    const { data } = await axios.post(
      this.uploadUrl,
      {
        apiKey: this.apiKey,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const { uploadURL, s3Url } = data;

    // 2. Read file into ArrayBuffer
    const fileContentBuffer = await file.arrayBuffer();

    // 3. Encrypt - This returns ArrayBuffer (binary)
    const encryptedBuffer = encryptFile(fileContentBuffer, this.encryptionKey);

    // 4. Upload encrypted binary data directly to S3
    await axios.put(uploadURL, encryptedBuffer, {
      headers: { "Content-Type": "application/octet-stream" }
    });

    // 5. Return final permanent URL
    return { downloadUrl: s3Url };
  }


  /**
   * Downloads and decrypts a file from a URL.
   * @param {string} fileUrl The URL to download the encrypted file from.
   * @returns {Promise<ArrayBuffer>} A promise that resolves with the decrypted file data as an ArrayBuffer.
   */
  async downloadFile(fileUrl) {
    try {
      // 1. Download encrypted file from S3 (as arraybuffer)
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer' // ← FIX: Get binary data, not text
      });

      // 2. Decrypt the binary data
      const decryptedBuffer = decryptFile(response.data, this.encryptionKey);

      // 3. Convert ArrayBuffer to Blob for easy download
      // You might need to know the original file type, but we'll use generic type
      return new Blob([decryptedBuffer], { type: 'application/octet-stream' });

    } catch (error) {
      console.error('Download error:', error);
      throw new Error(`Download failed: ${error.message}`);
    }
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