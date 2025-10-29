import { Storage } from '@google-cloud/storage';
import * as path from 'path';

const storage = new Storage({
  keyFilename: process.env.SERVICE_ACCOUNT_PATH || './config/service-account.json',
  projectId: process.env.GCP_PROJECT_ID,
});

const bucketName = process.env.STORAGE_BUCKET || `${process.env.GCP_PROJECT_ID}-documents`;
const bucket = storage.bucket(bucketName);

export class StorageService {
  /**
   * Upload file to Cloud Storage
   */
  static async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    userId: string,
    folder: 'uploads' | 'extracted' | 'reports' = 'uploads'
  ): Promise<string> {
    const filePath = `users/${userId}/${folder}/${fileName}`;
    const file = bucket.file(filePath);

    await file.save(fileBuffer, {
      metadata: {
        contentType: 'application/pdf',
      },
    });

    return filePath;
  }

  /**
   * Get signed URL for file download
   */
  static async getSignedUrl(filePath: string, expiresInMinutes: number = 60): Promise<string> {
    const file = bucket.file(filePath);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });
    return url;
  }

  /**
   * Download file from Cloud Storage
   */
  static async downloadFile(filePath: string): Promise<Buffer> {
    const file = bucket.file(filePath);
    const [buffer] = await file.download();
    return buffer;
  }

  /**
   * Delete file from Cloud Storage
   */
  static async deleteFile(filePath: string): Promise<void> {
    const file = bucket.file(filePath);
    await file.delete();
  }

  /**
   * Check if file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    return exists;
  }
}

