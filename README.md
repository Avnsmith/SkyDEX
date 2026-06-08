# OrbitNote — Secure Note & File Storage Vault

OrbitNote is a production-grade, secure note and file storage application enclaved in SpaceComputer infrastructure. Plaintext note and file content is encrypted locally on-the-fly and never written to Supabase PostgreSQL or Storage. Cryptographic TEE attestation records verify that all key-wrapping operations occur in attested hardware enclaves.

---

## Technical Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, lucide-react
- **Backend**: NestJS, Prisma ORM, Supabase JS Client
- **Authentication**: Supabase Auth (Email/Password, Magic Link)
- **Database & Storage**: Supabase PostgreSQL + Supabase Storage
- **Infrastructure Provider**: SpaceComputer (KMS + SpaceTEE + Cosmic Randomness)
- **Deployment**: Railway (Backend), Vercel (Frontend)

---

## Monorepo Layout

```
├── package.json                    # Monorepo root config
├── pnpm-workspace.yaml             # pnpm workspaces setup
├── turbo.json                      # Turborepo task pipeline
│
├── apps/
│   ├── web/                        # Next.js 15 client browser app
│   └── api/                        # NestJS API backend server
│
└── packages/
    ├── spacecomputer/              # Isolated SpaceComputer SDK + Providers
    └── shared/                     # Common schemas, types, and constants
```

---

## Cryptographic Design

OrbitNote enforces **Envelope Encryption** for notes and files using AES-256-GCM. 

1. **Key Generation**: A unique 32-byte Data Key is generated locally for each resource using the entropy provider (`generateSecureBytes`).
2. **Local Encryption**: Payload is encrypted locally using `aes-256-gcm` + data key + unique 12-byte IV.
3. **Key Wrapping**: The data key is sent to SpaceComputer KMS (`wrapKey`) to be wrapped, returning the `encryptedDataKey` and a TEE `attestationEnvelope`.
4. **Decryption**: To view or download, the wrapped key is unwrapped via SpaceComputer KMS (`unwrapKey`), and the ciphertext is decrypted locally. Supabase never has access to plaintext data or keys.
5. **Integrity Validation**: Decrypted file contents are verified against a pre-computed SHA-256 hash.

---

## Configuration & Environment Variables

Copy the `.env.example` file in the root to `.env` (for backend) and set the variables:

```ini
# Application Port
PORT=3001
CORS_ORIGIN=http://localhost:3000

# SpaceComputer Mode ("mock" runs locally using AES-256 wrapping without credentials, "live" connects to TEE)
SPACECOMPUTER_MODE=mock

# Live Credentials (ignored if mode is "mock")
ORBITPORT_API_KEY=your-api-key-here
ORBITPORT_ENDPOINT=https://api.orbitport.io

# Database Connection (Direct connection string from Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:your-db-password@db.your-supabase-project.supabase.co:5432/postgres?schema=public"

# Supabase Admin
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

On the frontend client (`apps/web/.env.local`):

```ini
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

---

## Database Migration & Local Launch

### Step 1: Install Dependencies
Run from the monorepo root:
```bash
pnpm install
pnpm approve-builds --all
```

### Step 2: Push Prisma Schema to Supabase DB
Run from `apps/api`:
```bash
# Push database models and setup indices
npx prisma db push
```

### Step 3: Run Backend Development Server
Run from `apps/api`:
```bash
pnpm run start:dev
```

### Step 4: Run Frontend Development Server
Run from `apps/web`:
```bash
pnpm run dev
```
Open `http://localhost:3000` to register your account and test notes creation/file uploads.

---

## Production Deployment

### Backend Deployment (Railway)

1. Initialize Railway project:
   ```bash
   railway init --name orbitnote-api
   ```
2. Set Environment Variables:
   Set `PORT`, `CORS_ORIGIN`, `SPACECOMPUTER_MODE`, `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in the Railway service variables dashboard.
3. Deploy Service:
   Set the start command in Railway's service settings:
   - Build command: `pnpm --filter api build`
   - Start command: `pnpm --filter api start:prod`
4. Expose Domain:
   Generate a public domain in Railway settings for frontend to access.

### Client Deployment (Vercel)

1. Push the monorepo to GitHub.
2. Create a new project in Vercel and point it to the repository.
3. Configure the Root Directory setting to `apps/web`.
4. Configure Build Command as `next build` and Output Directory as `.next`.
5. Set Environment Variables:
   - `NEXT_PUBLIC_API_URL` (Points to Railway backend URL)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Deploy!
