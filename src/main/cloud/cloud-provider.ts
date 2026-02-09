import type { CloudRemoteFile } from '../../shared/types/cloud-sync';

export interface AppFolders {
  rootPath: string;
  livePath: string;
  backupsPath: string;
}

export interface UploadParams {
  parentPath: string;
  name: string;
  mimeType: string;
  filePath: string;
  stableKey: string;
}

export interface ICloudProvider {
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  ensureAppStructure(): Promise<AppFolders>;
  listFiles(parentPath: string): Promise<CloudRemoteFile[]>;
  uploadFile(params: UploadParams): Promise<string>;
  downloadFile(remotePath: string, outputPath: string): Promise<void>;
  findFileByName(parentPath: string, name: string): Promise<CloudRemoteFile | null>;
}
