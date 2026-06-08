import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseStorageService implements OnModuleInit {
  private supabase: SupabaseClient | null = null;
  private bucketName = 'encrypted-files';

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (url && serviceRoleKey) {
      this.supabase = createClient(url, serviceRoleKey, {
        auth: {
          persistSession: false,
        },
      });
    } else {
      console.warn('Supabase credentials missing. Supabase Storage is inactive.');
    }
  }

  private getClient(): SupabaseClient {
    if (!this.supabase) {
      throw new Error('Supabase Client is not initialized.');
    }
    return this.supabase;
  }

  async upload(path: string, buffer: Buffer, mimeType: string): Promise<string> {
    const client = this.getClient();
    
    // Auto-create bucket if missing (ideal for local/MVP setup)
    const { data: buckets } = await client.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === this.bucketName);
    
    if (!bucketExists) {
      await client.storage.createBucket(this.bucketName, {
        public: false,
      });
    }

    const { error } = await client.storage
      .from(this.bucketName)
      .upload(path, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload file to Supabase storage: ${error.message}`);
    }

    return `${this.bucketName}/${path}`;
  }

  async download(path: string): Promise<Buffer> {
    const client = this.getClient();
    // Path might contain bucket name prefix, strip it if needed
    const relativePath = path.startsWith(`${this.bucketName}/`)
      ? path.replace(`${this.bucketName}/`, '')
      : path;

    const { data, error } = await client.storage
      .from(this.bucketName)
      .download(relativePath);

    if (error) {
      throw new Error(`Failed to download file from Supabase storage: ${error.message}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(path: string): Promise<void> {
    const client = this.getClient();
    const relativePath = path.startsWith(`${this.bucketName}/`)
      ? path.replace(`${this.bucketName}/`, '')
      : path;

    const { error } = await client.storage
      .from(this.bucketName)
      .remove([relativePath]);

    if (error) {
      throw new Error(`Failed to delete file from Supabase storage: ${error.message}`);
    }
  }
}
