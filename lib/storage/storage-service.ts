/**
 * Storage Service Abstraction Layer
 * 
 * This service provides a unified interface for file storage operations.
 * Currently uses local filesystem, but can be easily switched to AWS S3
 * by changing the implementation without affecting the rest of the application.
 */

export interface StorageConfig {
  type: 'local' | 's3';
  localPath?: string;
  s3Config?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export interface UploadResult {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export interface StorageService {
  upload(file: File | Buffer, fileName: string, folder: string): Promise<UploadResult>;
  download(filePath: string): Promise<Buffer>;
  delete(filePath: string): Promise<void>;
  getUrl(filePath: string): string;
}

/**
 * Local Filesystem Storage Implementation
 */
class LocalStorageService implements StorageService {
  private basePath: string;

  constructor(basePath: string = './uploads') {
    this.basePath = basePath;
  }

  async upload(file: File | Buffer, fileName: string, folder: string): Promise<UploadResult> {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      // Create directory if it doesn't exist
      const uploadDir = path.join(process.cwd(), 'public', this.basePath, folder);
      console.log('Creating upload directory:', uploadDir);
      await fs.mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${fileName}`;
    const filePath = path.join(uploadDir, uniqueFileName);
    const relativePath = `${this.basePath}/${folder}/${uniqueFileName}`;

    // Write file
    let buffer: Buffer;
    let mimeType: string;
    let fileSize: number;

    if (file instanceof Buffer) {
      buffer = file;
      mimeType = 'application/octet-stream';
      fileSize = buffer.length;
    } else {
      const arrayBuffer = await (file as File).arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      mimeType = (file as File).type;
      fileSize = (file as File).size;
    }

      console.log('Writing file to:', filePath);
      await fs.writeFile(filePath, buffer);
      console.log('File written successfully');

      return {
        fileName: uniqueFileName,
        filePath: relativePath,
        fileSize,
        mimeType,
      };
    } catch (error) {
      console.error('Error in upload:', error);
      throw error;
    }
  }

  async download(filePath: string): Promise<Buffer> {
    const fs = require('fs').promises;
    const path = require('path');
    
    const fullPath = path.join(process.cwd(), 'public', filePath);
    return await fs.readFile(fullPath);
  }

  async delete(filePath: string): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    
    const fullPath = path.join(process.cwd(), 'public', filePath);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      console.error('Error deleting file:', error);
      // Don't throw error if file doesn't exist
    }
  }

  getUrl(filePath: string): string {
    // Return public URL for local files
    return filePath;
  }
}

/**
 * AWS S3 Storage Implementation (Placeholder for future use)
 */
class S3StorageService implements StorageService {
  private bucket: string;
  private region: string;
  // private s3Client: any; // AWS S3 client will be initialized here

  constructor(config: StorageConfig['s3Config']) {
    if (!config) throw new Error('S3 config is required');
    this.bucket = config.bucket;
    this.region = config.region;
    
    // TODO: Initialize AWS S3 client when credentials are available
    // this.s3Client = new S3Client({
    //   region: config.region,
    //   credentials: {
    //     accessKeyId: config.accessKeyId,
    //     secretAccessKey: config.secretAccessKey,
    //   },
    // });
  }

  async upload(file: File | Buffer, fileName: string, folder: string): Promise<UploadResult> {
    throw new Error('S3 storage not yet implemented. Please configure AWS credentials.');
    // TODO: Implement S3 upload
  }

  async download(filePath: string): Promise<Buffer> {
    throw new Error('S3 storage not yet implemented. Please configure AWS credentials.');
    // TODO: Implement S3 download
  }

  async delete(filePath: string): Promise<void> {
    throw new Error('S3 storage not yet implemented. Please configure AWS credentials.');
    // TODO: Implement S3 delete
  }

  getUrl(filePath: string): string {
    // TODO: Return S3 URL or signed URL
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${filePath}`;
  }
}

/**
 * Storage Factory - Creates the appropriate storage service based on configuration
 */
export function createStorageService(config?: StorageConfig): StorageService {
  const storageType = config?.type || process.env.STORAGE_TYPE || 'local';

  if (storageType === 's3') {
    if (!config?.s3Config) {
      throw new Error('S3 configuration is required when using S3 storage');
    }
    return new S3StorageService(config.s3Config);
  }

  // Default to local storage
  return new LocalStorageService(config?.localPath);
}

// Export a default instance
export const storageService = createStorageService();


