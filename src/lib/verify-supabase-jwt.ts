// Verify access token Supabase (HS256, legacy JWT secret) ngay tại edge bằng Web Crypto — không gọi mạng.
// Project hiện chưa dùng asymmetric signing keys (JWKS rỗng) nên phải dùng shared secret.

const encoder = new TextEncoder()
let cachedKey: { secret: string; key: Promise<CryptoKey> } | null = null

function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function getKey(secret: string): Promise<CryptoKey> {
  if (!cachedKey || cachedKey.secret !== secret) {
    const key = crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
      'verify'
    ])
    cachedKey = { secret, key }
  }
  return cachedKey.key
}

/** Trả về thời điểm hết hạn (ms) nếu token hợp lệ và chưa hết hạn, ngược lại null. */
export async function verifySupabaseJwt(token: string, secret: string): Promise<number | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [headerB64, payloadB64, signatureB64] = parts

  try {
    const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(headerB64))) as { alg?: string }
    if (header.alg !== 'HS256') return null

    const valid = await crypto.subtle.verify(
      'HMAC',
      await getKey(secret),
      base64UrlToBytes(signatureB64),
      encoder.encode(`${headerB64}.${payloadB64}`)
    )
    if (!valid) return null

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadB64))) as {
      exp?: number
      sub?: string
      role?: string
    }
    if (!payload.sub || payload.role !== 'authenticated' || typeof payload.exp !== 'number') return null

    const expMs = payload.exp * 1000
    return expMs > Date.now() ? expMs : null
  } catch {
    return null
  }
}
