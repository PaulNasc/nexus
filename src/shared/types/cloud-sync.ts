export type CloudProvider = 'webdav';

export type CloudAuthStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type CloudSyncStage =
  | 'idle'
  | 'connecting'
  | 'checking'
  | 'uploading_live_state'
  | 'uploading_backups'
  | 'downloading'
  | 'complete'
  | 'error';

export interface CloudRemoteFile {
  id: string;
  name: string;
  mimeType?: string;
  modifiedTime?: string;
  size?: number;
  md5Checksum?: string;
}

export interface CloudSyncStatus {
  provider: CloudProvider;
  authStatus: CloudAuthStatus;
  stage: CloudSyncStage;
  lastSyncAt?: string;
  error?: string;
  remoteHasNewerLiveState?: boolean;
  remoteHasNewerBackup?: boolean;
}

export interface CloudSyncResult {
  success: boolean;
  stage: CloudSyncStage;
  uploaded: {
    liveState: boolean;
    backupFiles: number;
  };
  remoteHasNewerLiveState: boolean;
  remoteHasNewerBackup: boolean;
  warnings: string[];
  errors: string[];
}
