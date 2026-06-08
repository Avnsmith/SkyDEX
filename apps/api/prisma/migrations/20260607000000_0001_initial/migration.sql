-- CreateTable
CREATE TABLE "notes" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "encrypted_data_key" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'aes-256-gcm',
    "key_version" TEXT NOT NULL DEFAULT '1',
    "attestation_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "sha256_hash" TEXT NOT NULL,
    "encrypted_storage_path" TEXT NOT NULL,
    "encrypted_data_key" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'aes-256-gcm',
    "key_version" TEXT NOT NULL DEFAULT '1',
    "attestation_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attestations" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "operation_type" TEXT NOT NULL,
    "measurement" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata_json" JSONB NOT NULL,

    CONSTRAINT "attestations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notes_attestation_id_key" ON "notes"("attestation_id");

-- CreateIndex
CREATE INDEX "notes_owner_id_idx" ON "notes"("owner_id");

-- CreateIndex
CREATE INDEX "notes_deleted_at_idx" ON "notes"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "files_attestation_id_key" ON "files"("attestation_id");

-- CreateIndex
CREATE INDEX "files_owner_id_idx" ON "files"("owner_id");

-- CreateIndex
CREATE INDEX "files_deleted_at_idx" ON "files"("deleted_at");

-- CreateIndex
CREATE INDEX "audit_logs_owner_id_idx" ON "audit_logs"("owner_id");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_resource_id_idx" ON "audit_logs"("resource_id");

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_attestation_id_fkey" FOREIGN KEY ("attestation_id") REFERENCES "attestations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_attestation_id_fkey" FOREIGN KEY ("attestation_id") REFERENCES "attestations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
