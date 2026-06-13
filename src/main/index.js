const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { randomUUID } = require('crypto')
const Database = require('better-sqlite3')

// ─── Telemetry ────────────────────────────────────────────────────────────────
// Replaced at build time by electron-vite define; fallback for dev mode
const _GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || 'G-L32W9KW4FJ'
const _GA_API_SECRET      = process.env.GA_API_SECRET     || 'J9f5xbOcQ4eNCnyGPvvNT'
const _GA_ENDPOINT        = 'https://www.google-analytics.com/mp/collect'
const _sessionId          = Date.now().toString()
let   _telDb              = null
let   _appVersion         = ''

function _initTelemetry(database, appVersion) {
  _telDb      = database
  _appVersion = appVersion || ''
  _telDb.exec(`
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

function _getMeta(key) {
  if (!_telDb) return null
  const row = _telDb.prepare('SELECT value FROM telemetry_meta WHERE key = ?').get(key)
  return row ? row.value : null
}
function _setMeta(key, value) {
  if (!_telDb) return
  _telDb.prepare('INSERT OR REPLACE INTO telemetry_meta (key, value) VALUES (?, ?)').run(key, value)
}

function _getInstallId() {
  let id = _getMeta('install_id')
  if (!id) { id = randomUUID(); _setMeta('install_id', id) }
  return id
}

function telGetConsent() {
  const c = _getMeta('consent')
  if (c === null) return null
  return c === '1'
}
function telSetConsent(bool) { _setMeta('consent', bool ? '1' : '0') }

function _baseParams() {
  return {
    app_version:          _appVersion,
    os:                   process.platform,
    os_version:           os.release(),
    locale:               Intl.DateTimeFormat().resolvedOptions().locale,
    session_id:           _sessionId,
    engagement_time_msec: '1'
  }
}

function telTrackEvent(name, params = {}) {
  if (!_telDb || telGetConsent() !== true) return
  try {
    _telDb.prepare(
      'INSERT INTO telemetry_queue (event_name, params, created_at) VALUES (?, ?, ?)'
    ).run(name, JSON.stringify({ ..._baseParams(), ...params }), new Date().toISOString())
  } catch (err) { console.error('[telemetry] trackEvent error:', err) }
}

function telTrackInstallIfNeeded() {
  if (_getMeta('install_event_sent') === '1') return
  if (telGetConsent() !== true) return
  telTrackEvent('app_installed', {})
  _setMeta('install_event_sent', '1')
}

async function telFlush() {
  if (!_telDb || !_GA_MEASUREMENT_ID || !_GA_API_SECRET) return
  if (telGetConsent() !== true) return
  try {
    const rows = _telDb.prepare(
      'SELECT * FROM telemetry_queue WHERE sent = 0 ORDER BY id ASC LIMIT 20'
    ).all()
    if (rows.length === 0) return
    const installId = _getInstallId()
    const events = rows.map(r => ({
      name:   r.event_name,
      params: (() => { try { return JSON.parse(r.params) } catch { return {} } })()
    }))
    const res = await fetch(
      `${_GA_ENDPOINT}?measurement_id=${_GA_MEASUREMENT_ID}&api_secret=${_GA_API_SECRET}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: installId, events }) }
    )
    if (res.ok || res.status === 204) {
      const ids = rows.map(r => r.id)
      _telDb.prepare(`UPDATE telemetry_queue SET sent = 1 WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids)
    }
  } catch (err) { console.error('[telemetry] flush error:', err) }
}
// ─────────────────────────────────────────────────────────────────────────────

function getOrCreateDeviceId() {
  const deviceIdPath = path.join(app.getPath('userData'), 'device-id.txt')
  if (fs.existsSync(deviceIdPath)) return fs.readFileSync(deviceIdPath, 'utf8').trim()
  const id = randomUUID()
  fs.writeFileSync(deviceIdPath, id)
  return id
}

// --- Database setup ---
let db

function initDb() {
  const dbPath = path.join(app.getPath('userData'), 'yourbusiness.db')
  db = new Database(dbPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS negocio (
      id     INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS productos (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL CHECK(precio > 0)
    );
    CREATE TABLE IF NOT EXISTS ventas (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_orden INTEGER NOT NULL,
      fecha_hora   DATETIME DEFAULT CURRENT_TIMESTAMP,
      total        REAL NOT NULL,
      detalle      TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pedidos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_orden INTEGER,
      total        REAL,
      detalle      TEXT,
      nota         TEXT NOT NULL DEFAULT '',
      hecho        INTEGER NOT NULL DEFAULT 0,
      creado_en    DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS calendar_notes (
      date TEXT PRIMARY KEY,
      note TEXT NOT NULL DEFAULT ''
    );
  `)

  // Migration: add new columns if they don't exist (for existing installs)
  const existingCols = db.prepare('PRAGMA table_info(pedidos)').all().map(c => c.name)
  if (!existingCols.includes('numero_orden')) db.exec('ALTER TABLE pedidos ADD COLUMN numero_orden INTEGER')
  if (!existingCols.includes('total'))        db.exec('ALTER TABLE pedidos ADD COLUMN total REAL')
  if (!existingCols.includes('detalle'))      db.exec('ALTER TABLE pedidos ADD COLUMN detalle TEXT')
}

// --- IPC Handlers ---
function registerHandlers() {
  ipcMain.handle('app:getDeviceId', () => getOrCreateDeviceId())

  ipcMain.handle('negocio:get', () => {
    try { return db.prepare('SELECT * FROM negocio LIMIT 1').get() || null }
    catch (err) { console.error('negocio:get', err); throw err }
  })

  ipcMain.handle('negocio:update', (_e, { nombre }) => {
    try {
      db.prepare('UPDATE negocio SET nombre = ? WHERE id = 1').run(nombre)
      return db.prepare('SELECT * FROM negocio LIMIT 1').get()
    } catch (err) { console.error('negocio:update', err); throw err }
  })

  ipcMain.handle('negocio:create', (_e, { nombre }) => {
    try {
      db.prepare('INSERT INTO negocio (nombre) VALUES (?)').run(nombre)
      return db.prepare('SELECT * FROM negocio LIMIT 1').get()
    } catch (err) { console.error('negocio:create', err); throw err }
  })

  ipcMain.handle('productos:getAll', () => {
    try { return db.prepare('SELECT * FROM productos ORDER BY nombre ASC').all() }
    catch (err) { console.error('productos:getAll', err); throw err }
  })

  ipcMain.handle('productos:create', (_e, { nombre, precio }) => {
    try {
      const r = db.prepare('INSERT INTO productos (nombre, precio) VALUES (?, ?)').run(nombre, precio)
      return db.prepare('SELECT * FROM productos WHERE id = ?').get(r.lastInsertRowid)
    } catch (err) { console.error('productos:create', err); throw err }
  })

  ipcMain.handle('productos:update', (_e, { id, nombre, precio }) => {
    try {
      db.prepare('UPDATE productos SET nombre = ?, precio = ? WHERE id = ?').run(nombre, precio, id)
      return db.prepare('SELECT * FROM productos WHERE id = ?').get(id)
    } catch (err) { console.error('productos:update', err); throw err }
  })

  ipcMain.handle('productos:delete', (_e, { id }) => {
    try { db.prepare('DELETE FROM productos WHERE id = ?').run(id); return { ok: true } }
    catch (err) { console.error('productos:delete', err); throw err }
  })

  ipcMain.handle('ventas:create', (_e, { numero_orden, total, detalle }) => {
    try {
      const r = db
        .prepare('INSERT INTO ventas (numero_orden, total, detalle) VALUES (?, ?, ?)')
        .run(numero_orden, total, detalle)
      return db.prepare('SELECT * FROM ventas WHERE id = ?').get(r.lastInsertRowid)
    } catch (err) { console.error('ventas:create', err); throw err }
  })

  ipcMain.handle('ventas:getToday', () => {
    try {
      return db
        .prepare("SELECT * FROM ventas WHERE DATE(fecha_hora) = DATE('now') ORDER BY numero_orden ASC")
        .all()
    } catch (err) { console.error('ventas:getToday', err); throw err }
  })

  ipcMain.handle('ventas:getNextOrder', () => {
    try {
      return db
        .prepare("SELECT COUNT(*) + 1 as next FROM ventas WHERE DATE(fecha_hora) = DATE('now')")
        .get().next
    } catch (err) { console.error('ventas:getNextOrder', err); throw err }
  })

  ipcMain.handle('ventas:delete', (_e, { id }) => {
    try { db.prepare('DELETE FROM ventas WHERE id = ?').run(id); return { ok: true } }
    catch (err) { console.error('ventas:delete', err); throw err }
  })

  // --- Pedidos (Tablero) ---
  ipcMain.handle('pedidos:getAll', () => {
    try { return db.prepare('SELECT * FROM pedidos ORDER BY hecho ASC, creado_en ASC').all() }
    catch (err) { console.error('pedidos:getAll', err); throw err }
  })

  ipcMain.handle('pedidos:create', (_e, { numero_orden, total, detalle, nota, hecho }) => {
    try {
      const r = db
        .prepare('INSERT INTO pedidos (numero_orden, total, detalle, nota, hecho) VALUES (?, ?, ?, ?, ?)')
        .run(numero_orden, total, detalle ?? null, nota ?? '', hecho ?? 0)
      return db.prepare('SELECT * FROM pedidos WHERE id = ?').get(r.lastInsertRowid)
    } catch (err) { console.error('pedidos:create', err); throw err }
  })

  ipcMain.handle('pedidos:update', (_e, { id, nota, hecho }) => {
    try {
      db.prepare('UPDATE pedidos SET nota = ?, hecho = ? WHERE id = ?').run(nota, hecho, id)
      return { ok: true }
    } catch (err) { console.error('pedidos:update', err); throw err }
  })

  ipcMain.handle('pedidos:delete', (_e, { id }) => {
    try { db.prepare('DELETE FROM pedidos WHERE id = ?').run(id); return { ok: true } }
    catch (err) { console.error('pedidos:delete', err); throw err }
  })

  // Telemetry
  ipcMain.handle('telemetry:track', (_e, name, params) => {
    telTrackEvent(name, params || {})
    return true
  })
  ipcMain.handle('telemetry:getConsent', () => telGetConsent())
  ipcMain.handle('telemetry:setConsent', (_e, val) => {
    telSetConsent(val)
    if (val) {
      telTrackEvent('app_opened', {})
      telTrackInstallIfNeeded()
      telFlush().catch(() => {})
    }
    return true
  })

  // Calendar
  ipcMain.handle('calendar:getMonthSummary', (_e, year, month) => {
    try {
      return db.prepare(`
        SELECT DATE(fecha_hora, 'localtime') as date,
               COUNT(*) as count,
               SUM(total) as total
        FROM ventas
        WHERE strftime('%Y', fecha_hora, 'localtime') = ?
          AND strftime('%m', fecha_hora, 'localtime') = ?
        GROUP BY DATE(fecha_hora, 'localtime')
      `).all(String(year), String(month).padStart(2, '0'))
    } catch (err) { console.error('calendar:getMonthSummary', err); throw err }
  })

  ipcMain.handle('calendar:getDaySales', (_e, date) => {
    try {
      return db.prepare(`
        SELECT * FROM ventas
        WHERE DATE(fecha_hora, 'localtime') = ?
        ORDER BY numero_orden ASC
      `).all(date)
    } catch (err) { console.error('calendar:getDaySales', err); throw err }
  })

  ipcMain.handle('calendar:getNote', (_e, date) => {
    try {
      const row = db.prepare('SELECT note FROM calendar_notes WHERE date = ?').get(date)
      return row ? row.note : ''
    } catch (err) { console.error('calendar:getNote', err); throw err }
  })

  ipcMain.handle('calendar:setNote', (_e, date, note) => {
    try {
      db.prepare('INSERT OR REPLACE INTO calendar_notes (date, note) VALUES (?, ?)').run(date, note)
      return true
    } catch (err) { console.error('calendar:setNote', err); throw err }
  })

  // Config (API keys, preferences)
  const getConfigPath = () => path.join(app.getPath('userData'), 'config.json')
  const readConfig = () => { try { return JSON.parse(fs.readFileSync(getConfigPath(), 'utf8')) } catch { return {} } }
  ipcMain.handle('config:get', (_e, key) => readConfig()[key] ?? null)
  ipcMain.handle('config:set', (_e, key, value) => {
    const cfg = readConfig()
    cfg[key] = value
    fs.writeFileSync(getConfigPath(), JSON.stringify(cfg))
    return true
  })

  // Analytics
  ipcMain.handle('analytics:getStats', () => {
    try {
      const ventasHoy = db.prepare(`
        SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total
        FROM ventas WHERE DATE(fecha_hora,'localtime') = DATE('now','localtime')
      `).get()

      const ventasPorHora = db.prepare(`
        SELECT strftime('%H',fecha_hora,'localtime') as hora,
               COUNT(*) as count, COALESCE(SUM(total),0) as total
        FROM ventas WHERE DATE(fecha_hora,'localtime') = DATE('now','localtime')
        GROUP BY hora ORDER BY hora
      `).all()

      const ventasPorDia = db.prepare(`
        SELECT DATE(fecha_hora,'localtime') as dia,
               COUNT(*) as count, COALESCE(SUM(total),0) as total
        FROM ventas
        WHERE fecha_hora >= datetime('now','localtime','-6 days')
        GROUP BY dia ORDER BY dia
      `).all()

      const todasVentas = db.prepare('SELECT detalle FROM ventas').all()
      const pm = {}
      todasVentas.forEach(v => {
        try {
          JSON.parse(v.detalle).forEach(item => {
            if (!pm[item.nombre]) pm[item.nombre] = { nombre: item.nombre, cantidad: 0, ingresos: 0 }
            pm[item.nombre].cantidad += Number(item.cantidad)
            pm[item.nombre].ingresos += Number(item.subtotal)
          })
        } catch {}
      })
      const topProductos = Object.values(pm).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5)

      return { ventasHoy, ventasPorHora, ventasPorDia, topProductos }
    } catch (err) { console.error('analytics:getStats', err); throw err }
  })

  // List available Gemini models for a key
  ipcMain.handle('ai:listModels', async (_e, apiKey) => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'Error listando modelos')
    return data.models
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace('models/', ''))
  })

  // AI Chat via Google Gemini API (free tier) — auto-detects available model
  ipcMain.handle('ai:chat', async (_e, { messages, apiKey, businessContext }) => {
    const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
    const CANDIDATES = [
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash-8b',
      'gemini-1.0-pro',
    ]

    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: businessContext }] },
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))
    })

    // Discover available models for this key dynamically
    const listRes = await fetch(`${BASE}?key=${apiKey}`)
    if (listRes.ok) {
      const listData = await listRes.json()
      const available = (listData.models || [])
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name.replace('models/', ''))
      CANDIDATES.unshift(...available)
    }

    let lastErr = ''
    const tried = new Set()
    for (const model of CANDIDATES) {
      if (tried.has(model)) continue
      tried.add(model)
      const res = await fetch(`${BASE}/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      })
      if (res.ok) {
        const data = await res.json()
        return data.candidates[0].content.parts[0].text
      }
      const err = await res.json().catch(() => ({}))
      lastErr = err.error?.message || `Error ${res.status}`
      if (lastErr.includes('not found') || lastErr.includes('not supported') || lastErr.includes('quota')) continue
      break
    }
    throw new Error(lastErr)
  })
}

// --- Window ---
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 700,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'default',
    show: false
  })

  win.once('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function setupUpdater() {
  autoUpdater.checkForUpdatesAndNotify()

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Actualización lista',
      message: 'Hay una nueva versión de Your Business lista para instalar.',
      detail: '¿Querés reiniciar ahora para actualizar?',
      buttons: ['Reiniciar ahora', 'Después'],
      defaultId: 0
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall()
    })
  })
}

app.whenReady().then(() => {
  initDb()
  _initTelemetry(db, app.getVersion())
  registerHandlers()
  createWindow()
  if (app.isPackaged) setupUpdater()

  // Track startup; no-ops if consent hasn't been given yet
  telTrackEvent('app_opened', {})
  telTrackInstallIfNeeded()
  telFlush().catch(() => {})
  setInterval(() => telFlush().catch(() => {}), 5 * 60 * 1000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
