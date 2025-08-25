import axios from 'axios';
import { encryptFile, decryptFile } from './crypto.js';

export default class Encodrive {
  constructor({ apiKey, encryptionKey }) {
    if (!apiKey || !encryptionKey) {
      throw new Error("apiKey and encryptionKey are required");
    }
    this.apiKey = apiKey;
    this.encryptionKey = encryptionKey;
    this.apiBase = "https://stksyq2ick.execute-api.ap-south-1.amazonaws.com/dev/api/file/upload-url"; 
  }

  async uploadFile(file) {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          const fileContent = reader.result;
          const encrypted = encryptFile(fileContent, this.encryptionKey);

          const response = await axios.post(
            `${this.apiBase}/upload`,
            { file: encrypted },
            { headers: { Authorization: `Bearer ${this.apiKey}` } }
          );

          resolve(response.data.url); // return file URL
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file); // assuming text file, can adjust for binary
    });
  }

  async downloadFile(fileUrl) {
    try {
      const response = await axios.get(fileUrl, {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      });

      const decrypted = decryptFile(response.data.file, this.encryptionKey);
      return decrypted;
    } catch (err) {
      throw err;
    }
  }
}
