import axios from 'axios';
import { encryptFile, decryptFile } from './crypto.js';

export default class Encodrive {
  constructor({ apiKey, encryptionKey, apiUrl }) {
    if (!apiKey || !encryptionKey) {
      throw new Error("apiKey and encryptionKey are required");
    }
    this.apiKey = apiKey;
    this.encryptionKey = encryptionKey;
    
    // Set base API URL (remove specific endpoints)
    const baseUrl = apiUrl || "https://stksyq2ick.execute-api.ap-south-1.amazonaws.com/dev/api";
    this.apiBaseUrl = baseUrl.replace('/upload-url', '').replace('/metadata', '');
  }

  /**
   * Encrypts and uploads any file (text, image, pdf, etc.).
   * @param {File} file The file object from an input field.
   * @returns {Promise<{downloadUrl: string, fileName: string, fileType: string}>} File info with URL and metadata.
   */
  async uploadFile(file) {
    // 1. Request signed URL from your backend
    const { data } = await axios.post(
      `${this.apiBaseUrl}/file/upload-url`,
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

    // 5. Return file info including metadata
    return { 
      downloadUrl: s3Url,
      fileName: file.name,
      fileType: file.type
    };
  }

  /**
   * Gets file metadata from the backend.
   * @param {string} fileUrl The S3 URL of the file.
   * @returns {Promise<{fileId: string, fileName: string, fileType: string, fileSize: number, uploadedAt: string}>} File metadata.
   */
  async getFileMetadata(fileUrl) {
    try {
      const { data } = await axios.post(
        `${this.apiBaseUrl}/file/metadata`,
        {
          apiKey: this.apiKey,
          fileUrl: fileUrl
        },
        { headers: { "Content-Type": "application/json" } }
      );

      return data;
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error(`Failed to get file metadata: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Downloads and decrypts a file with automatic metadata detection.
   * @param {string} fileUrl The URL to download the encrypted file from.
   * @returns {Promise<Blob>} A promise that resolves with the decrypted file as a Blob with correct type.
   */
  async downloadFile(fileUrl) {
    try {
      // 1. Get file metadata to determine the original file type
      const metadata = await this.getFileMetadata(fileUrl);
      
      // 2. Download encrypted file from S3
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer'
      });

      // 3. Decrypt the binary data
      const decryptedBuffer = decryptFile(response.data, this.encryptionKey);

      // 4. Use the original file type from metadata
      return new Blob([decryptedBuffer], { type: metadata.fileType });

    } catch (error) {
      console.error('Download error:', error);
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  /**
   * Downloads and automatically saves a file to the user's device.
   * @param {string} fileUrl The URL to download the encrypted file from.
   * @param {string} fileName Optional custom file name (uses original name from metadata if not provided).
   * @returns {Promise<void>}
   */
  async downloadAndSaveFile(fileUrl, fileName = null) {
    try {
      // 1. Get file metadata for original file name and type
      const metadata = await this.getFileMetadata(fileUrl);
      
      // 2. Download the file with correct type
      const blob = await this.downloadFile(fileUrl);
      
      // 3. Use provided fileName or fallback to original name from metadata
      const downloadName = fileName || metadata.fileName;

      // 4. Create download link and trigger click
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      
      // 5. Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

    } catch (error) {
      console.error('Download and save error:', error);
      throw error;
    }
  }

  /**
   * Downloads a file and returns it as a Blob with metadata.
   * @param {string} fileUrl The URL to download the encrypted file from.
   * @returns {Promise<{blob: Blob, metadata: object}>} File data with metadata.
   */
  async downloadFileWithMetadata(fileUrl) {
    try {
      // 1. Get file metadata
      const metadata = await this.getFileMetadata(fileUrl);
      
      // 2. Download the file
      const blob = await this.downloadFile(fileUrl);
      
      return {
        blob: blob,
        metadata: metadata
      };

    } catch (error) {
      console.error('Download with metadata error:', error);
      throw error;
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