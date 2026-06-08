import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SupabaseStorageService } from '../src/integrations/supabase-storage.service';
import { AuthGuard } from '../src/common/guards/auth.guard';
import * as crypto from 'crypto';

jest.mock('@spacecomputer-io/orbitport-sdk-ts', () => {
  return {
    OrbitportSDK: jest.fn().mockImplementation(() => {
      return {
        kms: {
          encrypt: jest.fn().mockImplementation(async ({ plaintext }) => {
            return {
              data: { CiphertextBlob: Buffer.from(plaintext).toString('base64') },
              metadata: { request_id: 'e2e-request-id', timestamp: Date.now() },
            };
          }),
          decrypt: jest.fn().mockImplementation(async ({ ciphertextBlob }) => {
            return {
              data: { Plaintext: Buffer.from(ciphertextBlob, 'base64') },
              metadata: { request_id: 'e2e-request-id', timestamp: Date.now() },
            };
          }),
        },
        ctrng: {
          random: jest.fn().mockImplementation(async () => {
            return {
              data: { data: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2' },
              metadata: { request_id: 'e2e-request-id', timestamp: Date.now() },
            };
          }),
        },
      };
    }),
  };
});

describe('OrbitNote MVP End-to-End Tests', () => {
  let app: INestApplication<App>;

  // In-memory tables simulating database storage
  const notesTable: any[] = [];
  const filesTable: any[] = [];
  const attestationsTable: any[] = [];
  const auditLogsTable: any[] = [];
  
  // In-memory Supabase object storage
  const storageBucket = new Map<string, Buffer>();

  // Complete mock implementation of PrismaService
  const mockPrismaService = {
    note: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const record = {
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          ...data,
        };
        notesTable.push(record);
        return record;
      }),
      findMany: jest.fn().mockImplementation(async (query) => {
        const ownerId = query?.where?.ownerId;
        const isDeletedFilter = query?.where?.deletedAt;
        return notesTable.filter(n => 
          n.ownerId === ownerId && 
          (isDeletedFilter === null ? n.deletedAt === null : true)
        );
      }),
      findFirst: jest.fn().mockImplementation(async (query) => {
        const id = query?.where?.id;
        const ownerId = query?.where?.ownerId;
        const isDeletedFilter = query?.where?.deletedAt;
        const found = notesTable.find(n => 
          n.id === id && 
          n.ownerId === ownerId && 
          (isDeletedFilter === null ? n.deletedAt === null : true)
        );
        return found || null;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const index = notesTable.findIndex(n => n.id === where.id);
        if (index === -1) throw new Error('Record to update not found.');
        notesTable[index] = {
          ...notesTable[index],
          ...data,
          updatedAt: new Date(),
        };
        return notesTable[index];
      }),
    },
    file: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const record = {
          id: crypto.randomUUID(),
          createdAt: new Date(),
          deletedAt: null,
          ...data,
        };
        filesTable.push(record);
        return record;
      }),
      findMany: jest.fn().mockImplementation(async (query) => {
        const ownerId = query?.where?.ownerId;
        const isDeletedFilter = query?.where?.deletedAt;
        return filesTable.filter(f => 
          f.ownerId === ownerId && 
          (isDeletedFilter === null ? f.deletedAt === null : true)
        );
      }),
      findFirst: jest.fn().mockImplementation(async (query) => {
        const id = query?.where?.id;
        const ownerId = query?.where?.ownerId;
        const isDeletedFilter = query?.where?.deletedAt;
        const found = filesTable.find(f => 
          f.id === id && 
          f.ownerId === ownerId && 
          (isDeletedFilter === null ? f.deletedAt === null : true)
        );
        return found || null;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const index = filesTable.findIndex(f => f.id === where.id);
        if (index === -1) throw new Error('Record to update not found.');
        filesTable[index] = {
          ...filesTable[index],
          ...data,
        };
        return filesTable[index];
      }),
    },
    attestation: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const record = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          ...data,
        };
        attestationsTable.push(record);
        return record;
      }),
      findMany: jest.fn().mockImplementation(async (query) => {
        const orConditions = query?.where?.OR || [];
        const ownerIdCondition = orConditions.find((c: any) => c.note?.ownerId || c.file?.ownerId);
        const ownerId = ownerIdCondition?.note?.ownerId || ownerIdCondition?.file?.ownerId;
        
        // Filter attestations linked to non-deleted notes or files owned by this user
        return attestationsTable.filter(att => {
          const linkedNote = notesTable.find(n => n.attestationId === att.id && n.ownerId === ownerId && n.deletedAt === null);
          const linkedFile = filesTable.find(f => f.attestationId === att.id && f.ownerId === ownerId && f.deletedAt === null);
          return !!(linkedNote || linkedFile);
        });
      }),
      count: jest.fn().mockImplementation(async (query) => {
        const orConditions = query?.where?.OR || [];
        const ownerIdCondition = orConditions.find((c: any) => c.note?.ownerId || c.file?.ownerId);
        const ownerId = ownerIdCondition?.note?.ownerId || ownerIdCondition?.file?.ownerId;
        
        const matches = attestationsTable.filter(att => {
          const linkedNote = notesTable.find(n => n.attestationId === att.id && n.ownerId === ownerId && n.deletedAt === null);
          const linkedFile = filesTable.find(f => f.attestationId === att.id && f.ownerId === ownerId && f.deletedAt === null);
          return !!(linkedNote || linkedFile);
        });
        return matches.length;
      }),
      findUnique: jest.fn().mockImplementation(async (query) => {
        const id = query?.where?.id;
        const att = attestationsTable.find(a => a.id === id);
        if (!att) return null;
        
        return {
          ...att,
          note: notesTable.find(n => n.attestationId === att.id) || null,
          file: filesTable.find(f => f.attestationId === att.id) || null,
        };
      }),
    },
    auditLog: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const record = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          ...data,
        };
        auditLogsTable.push(record);
        return record;
      }),
      findMany: jest.fn().mockImplementation(async (query) => {
        const ownerId = query?.where?.ownerId;
        return auditLogsTable.filter(log => log.ownerId === ownerId);
      }),
      count: jest.fn().mockImplementation(async (query) => {
        const ownerId = query?.where?.ownerId;
        return auditLogsTable.filter(log => log.ownerId === ownerId).length;
      }),
    },
  };

  // Complete mock implementation of SupabaseStorageService
  const mockStorageService = {
    upload: jest.fn().mockImplementation(async (path: string, buffer: Buffer) => {
      storageBucket.set(path, buffer);
      return `encrypted-files/${path}`;
    }),
    download: jest.fn().mockImplementation(async (path: string) => {
      const buffer = storageBucket.get(path);
      if (!buffer) throw new Error('File not found in mock storage.');
      return buffer;
    }),
  };

  beforeAll(async () => {
    process.env.SPACECOMPUTER_MODE = 'live';
    process.env.ORBITPORT_CLIENT_ID = 'e2e-client-id';
    process.env.ORBITPORT_CLIENT_SECRET = 'e2e-client-secret';
    process.env.ORBITPORT_KMS_KEY_ID = 'e2e-kms-key-id';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(SupabaseStorageService)
      .useValue(mockStorageService)
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: '00000000-0000-0000-0000-000000000001', email: 'test@orbitnote.com' };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Verify Notes & Files complete cycle', async () => {
    // ----------------------------------------------------
    // 1. Create Note
    // ----------------------------------------------------
    const createNoteRes = await request(app.getHttpServer())
      .post('/api/notes')
      .send({ title: 'Top Secret E2E Note', content: 'hello orbitnote' })
      .expect(201);

    expect(createNoteRes.body.title).toBe('Top Secret E2E Note');
    expect(createNoteRes.body.id).toBeDefined();
    const noteId = createNoteRes.body.id;

    // Verify Ciphertext stored in database
    const dbNote = notesTable.find(n => n.id === noteId);
    expect(dbNote).toBeDefined();
    expect(dbNote.ciphertext).not.toBe('hello orbitnote');

    // ----------------------------------------------------
    // 2. Read Note (Verify decryption)
    // ----------------------------------------------------
    const readNoteRes = await request(app.getHttpServer())
      .get(`/api/notes/${noteId}`)
      .expect(200);

    expect(readNoteRes.body.content).toBe('hello orbitnote');

    // ----------------------------------------------------
    // 3. Update Note
    // ----------------------------------------------------
    await request(app.getHttpServer())
      .patch(`/api/notes/${noteId}`)
      .send({ content: 'updated secret data' })
      .expect(200);

    const readNoteUpdatedRes = await request(app.getHttpServer())
      .get(`/api/notes/${noteId}`)
      .expect(200);
    expect(readNoteUpdatedRes.body.content).toBe('updated secret data');

    // ----------------------------------------------------
    // 4. File Upload (Verify Local Encryption + Storage)
    // ----------------------------------------------------
    const fileContent = 'orbitnote e2e file content verification';
    const originalHash = crypto.createHash('sha256').update(fileContent).digest('hex');

    const uploadFileRes = await request(app.getHttpServer())
      .post('/api/files/upload')
      .attach('file', Buffer.from(fileContent), 'test_e2e.txt')
      .expect(201);

    expect(uploadFileRes.body.filename).toBe('test_e2e.txt');
    const fileId = uploadFileRes.body.id;

    // ----------------------------------------------------
    // 5. File Download & SHA256 Verification
    // ----------------------------------------------------
    const downloadFileRes = await request(app.getHttpServer())
      .get(`/api/files/${fileId}/download`)
      .buffer()
      .parse((res, callback) => {
        let data = Buffer.alloc(0);
        res.on('data', (chunk) => {
          data = Buffer.concat([data, chunk]);
        });
        res.on('end', () => {
          callback(null, data);
        });
      })
      .expect(200);

    const downloadedBuffer = downloadFileRes.body as unknown as Buffer;
    const downloadedContent = downloadedBuffer.toString('utf8');
    expect(downloadedContent).toBe(fileContent);

    const downloadedHash = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');
    expect(downloadedHash).toBe(originalHash);

    // ----------------------------------------------------
    // 6. Delete Note & Soft Delete Verification
    // ----------------------------------------------------
    await request(app.getHttpServer())
      .delete(`/api/notes/${noteId}`)
      .expect(200);

    // Verify it was soft-deleted in database
    const dbNoteAfterDelete = notesTable.find(n => n.id === noteId);
    expect(dbNoteAfterDelete.deletedAt).toBeInstanceOf(Date);

    // Verify read note fails
    await request(app.getHttpServer())
      .get(`/api/notes/${noteId}`)
      .expect(404);

    // Verify note is not listed
    const listNotesRes = await request(app.getHttpServer())
      .get('/api/notes')
      .expect(200);
    expect(listNotesRes.body.some((n: any) => n.id === noteId)).toBe(false);

    // ----------------------------------------------------
    // 7. Delete File & Soft Delete Verification
    // ----------------------------------------------------
    await request(app.getHttpServer())
      .delete(`/api/files/${fileId}`)
      .expect(200);

    const dbFileAfterDelete = filesTable.find(f => f.id === fileId);
    expect(dbFileAfterDelete.deletedAt).toBeInstanceOf(Date);

    // Verify download file fails
    await request(app.getHttpServer())
      .get(`/api/files/${fileId}/download`)
      .expect(404);

    // Verify file is not listed
    const listFilesRes = await request(app.getHttpServer())
      .get('/api/files')
      .expect(200);
    expect(listFilesRes.body.some((f: any) => f.id === fileId)).toBe(false);

    // ----------------------------------------------------
    // 8. Fetch & Validate Attestation Structure
    // ----------------------------------------------------
    // Create new note to get a fresh active attestation
    const activeNoteRes = await request(app.getHttpServer())
      .post('/api/notes')
      .send({ title: 'Active Note', content: 'secure info' })
      .expect(201);
    
    const activeNoteId = activeNoteRes.body.id;
    const attId = activeNoteRes.body.attestationId;
    expect(attId).toBeDefined();

    const attestationRes = await request(app.getHttpServer())
      .get(`/api/attestations/${attId}`)
      .expect(200);

    expect(attestationRes.body.id).toBe(attId);
    expect(attestationRes.body.provider).toBe('spacecomputer-kms');
    expect(attestationRes.body.measurement).toBeDefined();
    expect(attestationRes.body.metadataJson).toBeDefined();
    expect(attestationRes.body.metadataJson.status).toBe('VERIFIED');

    // ----------------------------------------------------
    // 9. Verify Audit Logs Creation
    // ----------------------------------------------------
    const auditLogsRes = await request(app.getHttpServer())
      .get('/api/audit-logs')
      .expect(200);

    // Should contain logs for creation, encryption, downloads, updates, views, deletes
    const actions = auditLogsRes.body.items.map((log: any) => log.action);
    expect(actions).toContain('create_note');
    expect(actions).toContain('encrypt_note');
    expect(actions).toContain('decrypt_note');
    expect(actions).toContain('update_note');
    expect(actions).toContain('delete_note');
    expect(actions).toContain('upload_file');
    expect(actions).toContain('download_file');
    expect(actions).toContain('delete_file');
    expect(actions).toContain('view_attestation');
  });
});
