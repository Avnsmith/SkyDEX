# SpaceComputer.md

# SpaceComputer Developer Knowledge Base

Version: June 2026

## Overview

SpaceComputer là hạ tầng tính toán phi tập trung tập trung vào:
- Orbitport
- SpaceTEE
- Cosmic Randomness
- KMS
- Confidential Compute
- AI Agents
- Secure Applications
- Verifiable Infrastructure

## Core Components

### Orbitport
Gateway để ứng dụng truy cập các dịch vụ SpaceComputer:
- Authentication
- API access
- SDK integration
- Service routing

### SpaceTEE
Trusted Execution Environment:
- Secure execution
- Confidential computing
- Verifiable workloads
- Attested execution

### Cosmic Randomness
Randomness có thể xác minh:
- NFT rarity
- Gaming
- Lottery
- Agent decisions
- Validator selection

### KMS
Key Management Service:
- Key generation
- Secure signing
- Encryption / Decryption
- Secure key storage

## Architecture

Application
→ Orbitport
→ SpaceComputer Runtime
→ SpaceTEE / Randomness / KMS

## Recommended Backend Stack

- NestJS
- TypeScript
- PostgreSQL
- Redis
- Orbitport SDK

Frontend → Backend → Orbitport

Không gọi Orbitport trực tiếp từ frontend.

## Security Principles

1. Least privilege
2. Key isolation
3. Verifiable execution
4. Attestation-first design
5. Backend-only credentials

## Application Templates

### OrbitNote
- Secure Notes
- Secure File Storage
- KMS Encryption
- SpaceTEE Attestation

### OrbitVault
- Encrypted Storage
- KMS
- SpaceTEE

### OrbitAgent
- AI Agent Wallet
- Secure Signing
- Autonomous Execution

### OrbitRNG NFT
- Randomness-powered NFT
- Provable rarity
- Explorer verification

### PayX
- Agent payments
- Autonomous settlement
- KMS signing

## Best Practices

Always use:
- audit logs
- provenance tracking
- attestation verification
- encrypted storage

Never use:
- frontend secrets
- exposed private keys
- unverified randomness

## Developer Rule

Treat SpaceComputer as Trust Infrastructure.

Build around:
- trust
- randomness
- attestation
- encryption
- provenance
- verifiable execution
