import { BadRequestException } from '@nestjs/common'
import { PRIVATE_IP_RANGES } from '@agenthub/config'

/**
 * Guards against Server-Side Request Forgery (SSRF).
 *
 * Validates that a seller-supplied endpoint URL:
 *  1. Parses as a valid URL
 *  2. Uses HTTPS (never HTTP, ftp, file://, etc.)
 *  3. Does not resolve to a private/loopback/link-local IP range
 *  4. Does not target known cloud metadata services
 *
 * This is called both at API registration time AND at proxy invocation time
 * (belt-and-suspenders: the stored endpoint could theoretically be mutated
 * via a DB compromise, so we re-validate on every proxy call).
 */
export function validateSellerEndpoint(rawUrl: string): URL {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new BadRequestException(`Invalid URL: "${rawUrl}"`)
  }

  // Only HTTPS allowed
  if (parsed.protocol !== 'https:') {
    throw new BadRequestException(
      `Seller endpoint must use HTTPS, got "${parsed.protocol}"`,
    )
  }

  const hostname = parsed.hostname.toLowerCase()

  // Block cloud metadata services explicitly (belt-and-suspenders; also in PRIVATE_IP_RANGES)
  const blockedHostnames = [
    '169.254.169.254',       // AWS EC2 metadata
    'metadata.google.internal', // GCP metadata
    '169.254.170.2',         // ECS task metadata endpoint
    'fd00:ec2::254',         // AWS IPv6 metadata
  ]
  if (blockedHostnames.includes(hostname)) {
    throw new BadRequestException(
      'Seller endpoint cannot access cloud metadata services',
    )
  }

  // Check against all private IP/hostname patterns
  for (const pattern of PRIVATE_IP_RANGES) {
    if (pattern.test(hostname)) {
      throw new BadRequestException(
        `Seller endpoint resolves to a private/reserved address: "${hostname}"`,
      )
    }
  }

  // Disallow user-info in URL (e.g. http://user:pass@host)
  if (parsed.username || parsed.password) {
    throw new BadRequestException(
      'Seller endpoint must not contain credentials in the URL',
    )
  }

  return parsed
}
