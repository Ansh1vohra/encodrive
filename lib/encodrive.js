import axios from 'axios';
import { encryptFile, decryptFile } from './crypto.js';

export default class Encodrive {
  constructor({ apiKey, encryptionKey, apiUrl }) {
    if (!apiKey || !encryptionKey) throw new Error("apiKey and encryptionKey required");
    this.apiKey = apiKey;
    this.encryptionKey = encryptionKey;
    this.apiBaseUrl = (apiUrl || "https://stksyq2ick.execute-api.ap-south-1.amazonaws.com/dev/api")
      .replace('/upload-url', '')
      .replace('/metadata', '');
  }

  // Upload file (encrypted)
  async uploadFile(file) {
    const { data } = await axios.post(`${this.apiBaseUrl}/file/upload-url`, {
      apiKey: this.apiKey,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });

    const { uploadURL, s3Url } = data;
    const buffer = await file.arrayBuffer();
    const encrypted = encryptFile(buffer, this.encryptionKey);

    await axios.put(uploadURL, encrypted, { headers: { "Content-Type": "application/octet-stream" } });

    return { downloadUrl: s3Url, fileName: file.name, fileType: file.type };
  }

  // Get metadata
  async getFileMetadata(fileUrl) {
    const { data } = await axios.post(`${this.apiBaseUrl}/file/metadata`, {
      apiKey: this.apiKey,
      fileUrl
    });
    return data;
  }

  // Download + decrypt (returns blob + name)
  async downloadFile(fileUrl) {
    const meta = await this.getFileMetadata(fileUrl);
    const res = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const decrypted = decryptFile(res.data, this.encryptionKey);
    const blob = new Blob([decrypted], { type: meta.fileType });
    return { blob, fileName: meta.fileName, metadata: meta };
  }

  // Download and auto-save
  async downloadAndSaveFile(fileUrl, customName = null) {
    const { blob, fileName } = await this.downloadFile(fileUrl);
    const name = customName || fileName;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
