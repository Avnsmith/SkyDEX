# AgentHub — Security Policy & Threat Modeling Audit

This document details the security threat model, cryptographic audit controls, and architectural defenses deployed across the AgentHub monorepo to secure stablecoin API nanopayments on the Arc Network.

---

## 1. Threat Modeling & Architectural Defenses

| Threat Vector | Severity | Mitigation Strategy | Implementation File |
| :--- | :--- | :--- | :--- |
| **Server-Side Request Forgery (SSRF)** | **CRITICAL** | Resolves hostnames *before* socket connection and blocks all loopbacks, private subnets, link-local IPs, and metadata targets. | [`secure-fetch.service.ts`](file:///Users/vinh/Documents/AgentHUB/apps/api/src/common/secure-fetch.service.ts) |
| **DNS Rebinding Attack** | **CRITICAL** | Pins resolved IPs and disables fast DNS switches inside custom HTTP/HTTPS agent sockets lookup routines. | [`secure-fetch.service.ts`](file:///Users/vinh/Documents/AgentHUB/apps/api/src/common/secure-fetch.service.ts) |
| **Micropayment Replay Attacks** | **HIGH** | Caches unique combination of `wallet + nonce` in a Redis expiration cache mapped to the `validBefore` deadline. | [`risk-engine.service.ts`](file:///Users/vinh/Documents/AgentHUB/apps/api/src/modules/abuse/risk-engine.service.ts) |
| **Voucher Expiration Bypasses** | **HIGH** | Enforces signature validation checking epoch thresholds against current block timestamps. | [`risk-engine.service.ts`](file:///Users/vinh/Documents/AgentHUB/apps/api/src/modules/abuse/risk-engine.service.ts) |
| **Resource Exhaustion DoS** | **MEDIUM** | Strict 5MB download limit caps on stream reader chunks and request connection limits. | [`secure-fetch.service.ts`](file:///Users/vinh/Documents/AgentHUB/apps/api/src/common/secure-fetch.service.ts) |
| **Spam Validation DOS** | **MEDIUM** | Tracks failed validation attempts per wallet and automatically executes 1-hour Lockouts if threshold breached. | [`risk-engine.service.ts`](file:///Users/vinh/Documents/AgentHUB/apps/api/src/modules/abuse/risk-engine.service.ts) |
| **BigInt Arithmetic Overflows** | **LOW** | Enforces 100% precision bigint math for all USDC coin units (6 decimals), eliminating JS Float rounding errors. | [`usdc.utils.ts`](file:///Users/vinh/Documents/AgentHUB/apps/api/src/common/usdc.utils.ts) |

---

## 2. Hardened SSRF & DNS Rebinding Protections

Our sandboxed outbound fetching pipeline `SecureFetchService` implements **pre-flight DNS pinning**:
1. Checks that the target protocol strictly uses HTTPS.
2. Resolves domain to destination IPs prior to dispatch.
3. Checks every resolved IP address against our comprehensive subnet blocklist:
   - Loopback Addresses (`127.0.0.0/8`, `::1`)
   - RFC 1918 Private Ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
   - Link-Local Blocks (`169.254.0.0/16`)
   - Carrier-Grade NAT (`100.64.0.0/10`)
   - Unspecified IP binds (`0.0.0.0`, `::`)
   - IPv6 Local Network segments
4. Socket connection is established using the validated IP only, preventing an attacker from switching the hostname mapping to a private address during flight.

---

## 3. Cryptographic Nonce & Signature Replay Defense

Voucher authorization validation checks `x402-Payment-Request` payloads:
* Each request passes a `nonce` and a `validBefore` epoch deadline.
* The backend verifies the signature on-chain to guarantee authenticity.
* The risk engine enforces a global Redis lock for the pair `wallet + nonce`.
* The lock is kept alive until the signature's `validBefore` epoch expires + 5 minutes safety margin, effectively rendering signature reuse completely impossible.

---

## 4. Production Deployment Checklist

Before deploying AgentHub in public environments:
1. **Rotate Keys**: Generate strong cryptographically secure secrets for `JWT_SECRET` (minimum 32 bytes) and keep private keys stored strictly inside secure env files.
2. **Disable Sandbox Defaults**: Ensure `NODE_ENV` is set to `production` to activate strict DB query levels and optimize build trees.
3. **Audit Upstream SSL**: Ensure the backend's Nginx reverse proxy forces SSL/TLS `HSTS` headers and disables TLS 1.0/1.1 protocols.
4. **Isolate Database**: Place Postgres and Redis caches in private security subnets, only exposing the Nginx reverse proxy endpoint.
