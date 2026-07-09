const nacl = require('tweetnacl')

// Ed25519 public key — safe to embed (it's public)
const PUBLIC_KEY_B64 = 'salFzThZYuhzlElqLbiaLx8Eqhq0lNzuly1rV9SbJWg='
const PUBLIC_KEY = Buffer.from(PUBLIC_KEY_B64, 'base64')

const GRACE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function b64urlDecode(s) {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = (4 - (padded.length % 4)) % 4
  return Buffer.from(padded + '='.repeat(pad), 'base64')
}

/**
 * Verifies a YB1 license key against a given email.
 * @returns {{ valid: boolean, payload?: object, grace?: boolean, reason?: string }}
 */
function verifyLicenseKey(key, email) {
  try {
    if (typeof key !== 'string' || !key.startsWith('YB1-')) {
      return { valid: false, reason: 'invalid_format' }
    }
    const rest = key.slice(4)
    const dot = rest.lastIndexOf('.')
    if (dot === -1) return { valid: false, reason: 'invalid_format' }

    const payloadBytes = b64urlDecode(rest.slice(0, dot))
    const sigBytes     = b64urlDecode(rest.slice(dot + 1))

    if (!nacl.sign.detached.verify(payloadBytes, sigBytes, PUBLIC_KEY)) {
      return { valid: false, reason: 'invalid_signature' }
    }

    const payload = JSON.parse(payloadBytes.toString('utf8'))

    if (payload.email !== email) {
      return { valid: false, reason: 'email_mismatch' }
    }

    if (payload.expires_at) {
      const exp   = new Date(payload.expires_at).getTime()
      const now   = Date.now()
      const grace = exp + GRACE_MS
      if (now > grace) return { valid: false, reason: 'expired', payload }
      return { valid: true, payload, grace: now > exp }
    }

    return { valid: true, payload, grace: false }
  } catch (err) {
    return { valid: false, reason: 'parse_error' }
  }
}

module.exports = { verifyLicenseKey }
