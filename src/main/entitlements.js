const { verifyLicenseKey } = require('./license')

const FOUNDER_EMAIL = 'santiagomh295@gmail.com'

// ── Tier definitions ───────────────────────────────────────────────────────────
const TIERS = {
  gratis:       { rank: 0 },
  pro:          { rank: 1 },
  negocios:     { rank: 2 },
  empresarial:  { rank: 3 },
}

// Feature flags per tier (cumulative: higher tiers include lower)
const FEATURES = {
  unlimited_products: ['pro', 'negocios', 'empresarial'],
  export_csv:         ['pro', 'negocios', 'empresarial'],
  ai_analysis:        ['pro', 'negocios', 'empresarial'],
  advanced_reports:   ['negocios', 'empresarial'],
  multi_device:       ['empresarial'],
}

const LIMITS = {
  products: { gratis: 40, pro: Infinity, negocios: Infinity, empresarial: Infinity },
}

const FREE_PRODUCT_WARNING = 35
const FREE_PRODUCT_HARD    = 40

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Resolve the current license state from DB + current user email.
 * Returns the entitlement object stored in the module (use getEntitlements() to read it).
 */
let _current = null

function _founderEntitlements() {
  return {
    tier: 'empresarial',
    plan: 'lifetime',
    valid: true,
    grace: false,
    expires_at: null,
    founder: true,
  }
}

function loadEntitlements(db, userEmail) {
  // Founder bypass — full access, no key required
  if (userEmail && userEmail.toLowerCase() === FOUNDER_EMAIL.toLowerCase()) {
    _current = _founderEntitlements()
    return _current
  }

  // Try to load a stored license key
  try {
    const row = db.prepare('SELECT key FROM license ORDER BY id DESC LIMIT 1').get()
    if (row && row.key) {
      const result = verifyLicenseKey(row.key, userEmail)
      if (result.valid) {
        _current = {
          tier:       result.payload.tier,
          plan:       result.payload.plan,
          valid:      true,
          grace:      result.grace,
          expires_at: result.payload.expires_at,
          founder:    false,
        }
        return _current
      }
    }
  } catch {}

  _current = { tier: 'gratis', plan: null, valid: false, grace: false, expires_at: null, founder: false }
  return _current
}

function getEntitlements() {
  return _current || { tier: 'gratis', plan: null, valid: false, grace: false, expires_at: null, founder: false }
}

function can(feature) {
  const { tier } = getEntitlements()
  return (FEATURES[feature] || []).includes(tier)
}

function limit(resource) {
  const { tier } = getEntitlements()
  return LIMITS[resource]?.[tier] ?? 0
}

function usage(resource, db) {
  if (resource === 'products') {
    try { return db.prepare('SELECT COUNT(*) as n FROM productos').get().n } catch { return 0 }
  }
  return 0
}

function remaining(resource, db) {
  return Math.max(0, limit(resource) - usage(resource, db))
}

/** Activate a new license key. Returns { ok, reason } */
function activateLicense(db, key, userEmail) {
  const result = verifyLicenseKey(key, userEmail)
  if (!result.valid) return { ok: false, reason: result.reason }
  try {
    db.prepare('INSERT INTO license (key, activated_at) VALUES (?, ?)').run(key, new Date().toISOString())
    loadEntitlements(db, userEmail)
    return { ok: true, tier: result.payload.tier, plan: result.payload.plan }
  } catch (err) {
    return { ok: false, reason: 'db_error' }
  }
}

module.exports = {
  loadEntitlements,
  getEntitlements,
  can,
  limit,
  usage,
  remaining,
  activateLicense,
  FREE_PRODUCT_WARNING,
  FREE_PRODUCT_HARD,
}
