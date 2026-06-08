import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import * as http from 'http'
import * as https from 'https'
import * as net from 'net'
import * as dns from 'dns'

export function isPrivateIp(ip: string): boolean {
  if (!net.isIP(ip)) return true

  // IPv4 private / loopback / link-local / CGNAT checks
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number)
    if (parts[0] === 127) return true // Loopback
    if (parts[0] === 10) return true // Private Class A
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true // Private Class B
    if (parts[0] === 192 && parts[1] === 168) return true // Private Class C
    if (parts[0] === 169 && parts[1] === 254) return true // Link-Local (AWS metadata etc)
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true // CGNAT
    if (ip === '0.0.0.0') return true
  }

  // IPv6 local / link-local / ULA checks
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase().trim()
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true // Loopback
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true // Unspecified
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true // Unique Local Address
    if (normalized.startsWith('fe80')) return true // Link-Local
  }

  return false
}

@Injectable()
export class SecureFetchService {
  private readonly logger = new Logger(SecureFetchService.name)
  private readonly maxResponseSize = 5 * 1024 * 1024 // 5 MB limits
  private readonly defaultTimeout = 10_000 // 10 seconds

  // Custom HTTP/HTTPS agents that hook the socket lookup pipeline to prevent DNS rebinding
  private readonly secureHttpAgent = new http.Agent({
    keepAlive: false,
    lookup: (hostname, options, callback) => this.secureLookup(hostname, options, callback),
  })

  private readonly secureHttpsAgent = new https.Agent({
    keepAlive: false,
    lookup: (hostname, options, callback) => this.secureLookup(hostname, options, callback),
  })

  /**
   * Performs an isolated, secure DNS resolution and validates the resolved IP.
   */
  private secureLookup(
    hostname: string,
    options: dns.LookupOptions,
    callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
  ) {
    dns.lookup(hostname, options, (err, address, family) => {
      if (err) {
        return callback(err, '', 0)
      }

      const ipAddress = address as string;

      if (isPrivateIp(ipAddress)) {
        this.logger.warn(`SSRF/DNS Rebinding block triggered on: ${hostname} -> ${ipAddress}`)
        return callback(new Error('SSRF Blocked: Destination points to an unauthorized address'), '', 0)
      }

      callback(null, ipAddress, family)
    })
  }

  /**
   * Outbound proxy secure fetch implementation with redirect protection and body constraints.
   */
  async fetch(url: string, options: RequestInit = {}): Promise<{ data: any; status: number; headers: Headers }> {
    return this.secureFetchWithRedirects(url, options, 0)
  }

  private async secureFetchWithRedirects(
    url: string,
    options: RequestInit,
    redirectCount: number,
  ): Promise<{ data: any; status: number; headers: Headers }> {
    if (redirectCount > 2) {
      throw new BadRequestException('Too many redirects')
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      throw new BadRequestException('Malformed destination URL')
    }

    // 1. Enforce HTTPS only (Protocol allowlist)
    if (parsedUrl.protocol !== 'https:') {
      throw new BadRequestException('Protocol blocked: Upstream calls must use HTTPS')
    }

    // 2. Perform pre-flight DNS rebinding checks on destination hostname
    try {
      const addresses = await new Promise<string[]>((resolve, reject) => {
        dns.resolve(parsedUrl.hostname, (err, addresses) => {
          if (err) reject(err)
          else resolve(addresses)
        })
      })
      
      for (const address of addresses) {
        if (isPrivateIp(address)) {
          throw new Error('Private IP range')
        }
      }
    } catch (err) {
      throw new BadRequestException('SSRF/DNS Guard: Destination host could not be securely verified')
    }

    // 3. Header Sanitization (Strips cloud infrastructure metadata headers)
    const sanitizedHeaders: Record<string, string> = {}
    if (options.headers) {
      const inputHeaders = options.headers as Record<string, string>
      for (const [key, value] of Object.entries(inputHeaders)) {
        const lowerKey = key.toLowerCase()
        if (
          !lowerKey.startsWith('x-forwarded') &&
          !lowerKey.startsWith('x-appengine') &&
          !lowerKey.startsWith('metadata') &&
          lowerKey !== 'authorization' &&
          lowerKey !== 'cookie'
        ) {
          sanitizedHeaders[key] = value
        }
      }
    }

    // Default proxy headers
    sanitizedHeaders['User-Agent'] = 'AgentHub-Secure-Proxy/2.0'
    sanitizedHeaders['X-AgentHub-Proxy'] = '1'

    const timeout = options.signal ? undefined : this.defaultTimeout
    const controller = new AbortController()
    const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : null

    try {
      // Dynamic agent injection depending on protocol (redundant safety since HTTPS is enforced)
      const agent = parsedUrl.protocol === 'https:' ? this.secureHttpsAgent : this.secureHttpAgent

      const response = await globalThis.fetch(url, {
        ...options,
        headers: sanitizedHeaders,
        signal: controller.signal,
        redirect: 'manual', // Manually check and secure redirects
        // @ts-ignore Node-fetch support for agents
        agent,
      })

      if (timeoutId) clearTimeout(timeoutId)

      // 4. Handle Secure Redirects
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) {
          throw new BadRequestException('Redirect missing target header')
        }
        const resolvedRedirectUrl = new URL(location, url).toString()
        return this.secureFetchWithRedirects(resolvedRedirectUrl, options, redirectCount + 1)
      }

      // 5. Enforce Max Response Size Constraints (prevent Zip Bombs & memory exhaustion)
      const contentLengthHeader = response.headers.get('content-length')
      if (contentLengthHeader) {
        const size = parseInt(contentLengthHeader, 10)
        if (size > this.maxResponseSize) {
          throw new BadRequestException('Payload too large: Destination response exceeds maximum limit (5MB)')
        }
      }

      // Read response stream safely chunk-by-chunk
      const reader = response.body?.getReader()
      if (!reader) {
        return { data: null, status: response.status, headers: response.headers }
      }

      let receivedLength = 0
      const chunks: Uint8Array[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        if (value) {
          receivedLength += value.length
          if (receivedLength > this.maxResponseSize) {
            await reader.cancel()
            throw new BadRequestException('Payload too large: Destination response data stream exceeds maximum limit (5MB)')
          }
          chunks.push(value)
        }
      }

      const rawBuffer = new Uint8Array(receivedLength)
      let position = 0
      for (const chunk of chunks) {
        rawBuffer.set(chunk, position)
        position += chunk.length
      }

      const decodedText = new TextDecoder('utf-8').decode(rawBuffer)
      let data: any = decodedText
      const contentType = response.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        try {
          data = JSON.parse(decodedText)
        } catch {
          // Keep as string if parsing fails
        }
      }

      return { data, status: response.status, headers: response.headers }
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        throw new BadRequestException('Destination gateway connection timed out')
      }
      throw err
    }
  }
}
