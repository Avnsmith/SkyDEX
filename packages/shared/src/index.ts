export interface NoteDto {
  id: string;
  title: string;
  ciphertextHex: string;
  encryptedDataKey: string;
  iv: string;
  authTag: string;
  algorithm: string;
  keyVersion: string;
  attestationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FileDto {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  sha256Hash: string;
  encryptedStoragePath: string;
  encryptedDataKey: string;
  iv: string;
  authTag: string;
  algorithm: string;
  keyVersion: string;
  attestationId: string | null;
  createdAt: string;
}

export interface AttestationDto {
  id: string;
  operationType: string;
  measurement: string;
  timestamp: string;
  metadataJson: any;
}

export interface AuditLogDto {
  id: string;
  ownerId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: string;
}

export interface DashboardStatsDto {
  notesCount: number;
  filesCount: number;
  recentLogs: AuditLogDto[];
}

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB

export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'text/plain',
  'image/png',
  'image/jpeg'
];

export const AUDIT_ACTIONS = {
  CREATE_NOTE: 'create_note',
  UPDATE_NOTE: 'update_note',
  DELETE_NOTE: 'delete_note',
  ENCRYPT_NOTE: 'encrypt_note',
  DECRYPT_NOTE: 'decrypt_note',
  UPLOAD_FILE: 'upload_file',
  DOWNLOAD_FILE: 'download_file',
  DELETE_FILE: 'delete_file',
  VIEW_ATTESTATION: 'view_attestation',
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];
