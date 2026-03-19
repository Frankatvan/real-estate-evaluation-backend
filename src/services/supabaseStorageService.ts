import { supabase } from '../config/supabase';
import logger from '../config/logger';

/**
 * Supabase Storage Service
 * Handles file upload and storage operations using Supabase Storage
 */

interface UploadResult {
  path: string;
  url: string;
  size: number;
  mimeType: string;
}

interface FileMetadata {
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
}

class SupabaseStorageService {
  private bucketName = 'project-files';

  /**
   * Initialize storage bucket
   */
  async initializeBucket(): Promise<boolean> {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);

      if (!bucketExists) {
        logger.info(`Creating storage bucket: ${this.bucketName}`);
        const { error } = await supabase.storage.createBucket(this.bucketName, {
          public: false,
          allowedMimeTypes: [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          ],
          fileSizeLimit: 10485760 // 10MB
        });

        if (error) {
          logger.error('Failed to create storage bucket', { error: error.message });
          return false;
        }

        logger.info('Storage bucket created successfully');
      }

      return true;
    } catch (error: any) {
      logger.error('Failed to initialize storage bucket', { error: error.message });
      return false;
    }
  }

  /**
   * Upload file to Supabase Storage
   */
  async uploadFile(
    userId: string,
    projectId: string,
    file: Express.Multer.File,
    category: 'imports' | 'exports' | 'documents' = 'imports'
  ): Promise<UploadResult> {
    try {
      // Generate unique file path
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.originalname}`;
      const filePath = `${userId}/${projectId}/${category}/${fileName}`;

      logger.info('Uploading file to Supabase Storage', {
        fileName,
        filePath,
        size: file.size,
        mimeType: file.mimetype
      });

      // Upload file
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        logger.error('File upload failed', { error: error.message, filePath });
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      logger.info('File uploaded successfully', {
        path: data.path,
        url: urlData.publicUrl
      });

      return {
        path: data.path,
        url: urlData.publicUrl,
        size: file.size,
        mimeType: file.mimetype
      };
    } catch (error: any) {
      logger.error('File upload error', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete file from Supabase Storage
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      logger.info('Deleting file from Supabase Storage', { filePath });

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        logger.error('File deletion failed', { error: error.message, filePath });
        return false;
      }

      logger.info('File deleted successfully', { filePath });
      return true;
    } catch (error: any) {
      logger.error('File deletion error', { error: error.message });
      return false;
    }
  }

  /**
   * Download file from Supabase Storage
   */
  async downloadFile(filePath: string): Promise<{ data: ArrayBuffer; metadata: FileMetadata }> {
    try {
      logger.info('Downloading file from Supabase Storage', { filePath });

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .download(filePath);

      if (error) {
        logger.error('File download failed', { error: error.message, filePath });
        throw new Error(`Download failed: ${error.message}`);
      }

      const metadata: FileMetadata = {
        name: filePath.split('/').pop() || 'unknown',
        size: data.byteLength,
        type: 'application/octet-stream',
        uploadedAt: new Date()
      };

      logger.info('File downloaded successfully', {
        filePath,
        size: data.byteLength
      });

      return { data, metadata };
    } catch (error: any) {
      logger.error('File download error', { error: error.message });
      throw error;
    }
  }

  /**
   * List files for a project
   */
  async listProjectFiles(userId: string, projectId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(`${userId}/${projectId}`, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        logger.error('Failed to list files', { error: error.message });
        throw new Error(`List files failed: ${error.message}`);
      }

      // Get all files recursively
      const allFiles: string[] = [];
      const processFolder = async (folder: string) => {
        const { data: folderData, error: folderError } = await supabase.storage
          .from(this.bucketName)
          .list(folder);

        if (folderError) return;

        for (const item of folderData || []) {
          if (item.name === '.emptyFolderPlaceholder') continue;

          const fullPath = `${folder}/${item.name}`;
          if (item.metadata?.mimetype) {
            // It's a file
            const { data: urlData } = supabase.storage
              .from(this.bucketName)
              .getPublicUrl(fullPath);
            allFiles.push(urlData.publicUrl);
          } else {
            // It's a folder, recurse
            await processFolder(fullPath);
          }
        }
      };

      await processFolder(`${userId}/${projectId}`);

      logger.info('Files listed successfully', {
        userId,
        projectId,
        count: allFiles.length
      });

      return allFiles;
    } catch (error: any) {
      logger.error('List files error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath: string): Promise<FileMetadata | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(filePath);

      if (error || !data || data.length === 0) {
        return null;
      }

      const file = data[0];
      return {
        name: file.name,
        size: file.metadata?.size || 0,
        type: file.metadata?.mimetype || 'application/octet-stream',
        uploadedAt: new Date(file.created_at)
      };
    } catch (error: any) {
      logger.error('Get file metadata error', { error: error.message });
      return null;
    }
  }
}

// Export singleton instance
export const supabaseStorageService = new SupabaseStorageService();

export default supabaseStorageService;