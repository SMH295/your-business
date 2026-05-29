const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const { randomUUID } = require('crypto')
const Database = require('better-sqlite3')

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

app.whenReady().then(() => {
  initDb()
  registerHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
