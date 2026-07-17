const { randomUUID } = require('crypto')
const os = require('os')

// Replaced at build time by electron-vite define (from .env)
const MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || ''
const API_SECRET     = process.env.GA_API_SECRET     || ''
const ENDPOINT       = 'https://www.google-analytics.com/mp/collect'

let _db      = null
let _version = ''
const _sessionId = Date.now().toString()

function init(database, appVersion) {
  _db      = database
  _version = appVersion || ''
  _db.exec(`
    CREATE TABLE IF NOT EXISTS telemetry_queue (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      event_name TEXT NOT NULL,
      params     TEXT NOT NULL,
      created_at TEXT NOT NULL,
      sent       INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS telemetry_meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `)
}

function getMeta(key) {
  if (!_db) return null
  const row = _db.prepare('SELECT value FROM telemetry_meta WHERE key = ?').get(key)
  return row ? row.value : null
}

function setMeta(key, value) {
  if (!_db) return
  _db.prepare('INSERT OR REPLACE INTO telemetry_meta (key, value) VALUES (?, ?)').run(key, value)
}

function getInstallId() {
  let id = getMeta('install_id')
  if (!id) {
    id = randomUUID()
    setMeta('install_id', id)
  }
  return id
}

function getConsent() {
  const c = getMeta('consent')
  if (c === null) return null   // not set yet
  return c === '1'
}

function setConsent(bool) {
  setMeta('consent', bool ? '1' : '0')
}

function _baseParams() {
  return {
    app_version:          _version,
    os:                   process.platform,
    os_version:           os.release(),
    locale:               Intl.DateTimeFormat().resolvedOptions().locale,
    session_id:           _sessionId,
    engagement_time_msec: '1'
  }
}

function trackEvent(name, params = {}) {
  if (!_db || getConsent() !== true) return
  try {
    _db.prepare(
      'INSERT INTO telemetry_queue (event_name, params, created_at) VALUES (?, ?, ?)'
    ).run(name, JSON.stringify({ ..._baseParams(), ...params }), new Date().toISOString())
  } catch (err) {
    console.error('[telemetry] trackEvent error:', err)
  }
}

function trackInstallIfNeeded() {
  if (getMeta('install_event_sent') === '1') return
  if (getConsent() !== true) return
  trackEvent('app_installed', {})
  setMeta('install_event_sent', '1')
}

async function flush() {
  if (!_db || !MEASUREMENT_ID || !API_SECRET) return
  if (getConsent() !== true) return
  try {
    const rows = _db.prepare(
      'SELECT * FROM telemetry_queue WHERE sent = 0 ORDER BY id ASC LIMIT 20'
    ).all()
    if (rows.length === 0) return

    const installId = getInstallId()
    const events = rows.map(r => ({
      name:   r.event_name,
      params: (() => { try { return JSON.parse(r.params) } catch { return {} } })()
    }))

    const res = await fetch(
      `${ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ client_id: installId, events })
      }
    )

    if (res.ok || res.status === 204) {
      const ids          = rows.map(r => r.id)
      const placeholders = ids.map(() => '?').join(',')
      _db.prepare(`UPDATE telemetry_queue SET sent = 1 WHERE id IN (${placeholders})`).run(...ids)
    }
  } catch (err) {
    console.error('[telemetry] flush error:', err)
  }
}

module.exports = { init, getConsent, setConsent, trackEvent, trackInstallIfNeeded, flush }
