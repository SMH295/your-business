#!/usr/bin/env node
/**
 * Run ONCE to generate the Ed25519 keypair for Your Business license signing.
 * Store the PRIVATE KEY in a password manager. NEVER commit it.
 * Paste the PUBLIC KEY into src/main/license.js
 */
const nacl = require('tweetnacl')

const kp = nacl.sign.keyPair()
const pub = Buffer.from(kp.publicKey).toString('base64')
const priv = Buffer.from(kp.secretKey).toString('base64')

console.log('\n=== YOUR BUSINESS LICENSE KEYPAIR ===\n')
console.log('PUBLIC KEY (embed in src/main/license.js):')
console.log(pub)
console.log('\nPRIVATE KEY — GUARDAR EN PASSWORD MANAGER, NUNCA EN GIT:')
console.log(priv)
console.log('\n⚠️  Copiar la clave privada ahora. No se puede recuperar.')
console.log('='.repeat(42))
