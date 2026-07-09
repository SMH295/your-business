#!/usr/bin/env node
/**
 * Usage:
 *   YB_PRIVATE_KEY="<base64>" node scripts/generate-license.js \
 *     --email cliente@correo.com \
 *     --tier pro|negocios|empresarial \
 *     --plan monthly|annual|lifetime \
 *     [--expires 2026-09-01]   (omit for lifetime)
 *
 * For Santiago (founder), run with --tier empresarial --plan lifetime
 */
const nacl = require('tweetnacl')

function b64urlEncode(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

const args = process.argv.slice(2)
function arg(name) {
  const i = args.indexOf('--' + name)
  return i !== -1 ? args[i + 1] : null
}

const email   = arg('email')
const tier    = arg('tier')
const plan    = arg('plan')
const expires = arg('expires') // optional ISO date string, null for lifetime

if (!email || !tier || !plan) {
  console.error('Usage: node scripts/generate-license.js --email X --tier X --plan X [--expires YYYY-MM-DD]')
  process.exit(1)
}
if (!['pro', 'negocios', 'empresarial'].includes(tier)) {
  console.error('tier must be: pro | negocios | empresarial')
  process.exit(1)
}
if (!['monthly', 'annual', 'lifetime'].includes(plan)) {
  console.error('plan must be: monthly | annual | lifetime')
  process.exit(1)
}

const privKeyB64 = process.env.YB_PRIVATE_KEY
if (!privKeyB64) {
  console.error('Set env var YB_PRIVATE_KEY to the base64 private key from generate-keys.js')
  process.exit(1)
}

const privKey = Buffer.from(privKeyB64, 'base64')
if (privKey.length !== 64) {
  console.error('Private key must be 64 bytes (512-bit Ed25519 secret key)')
  process.exit(1)
}

const payload = {
  email,
  tier,
  plan,
  issued_at:    new Date().toISOString(),
  expires_at:   expires ? new Date(expires).toISOString() : null,
  device_limit: 1
}

const payloadJson = JSON.stringify(payload)
const payloadBytes = new TextEncoder().encode(payloadJson)
const sig = nacl.sign.detached(payloadBytes, privKey)

const key = `YB1-${b64urlEncode(payloadBytes)}.${b64urlEncode(sig)}`

console.log('\n=== YOUR BUSINESS LICENSE KEY ===\n')
console.log('Email:  ', email)
console.log('Tier:   ', tier)
console.log('Plan:   ', plan)
console.log('Expires:', expires || 'never (lifetime)')
console.log('\nLicense Key:')
console.log(key)
console.log('\n' + '='.repeat(42))
