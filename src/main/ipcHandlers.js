const { ipcMain } = require('electron')
const db = require('./database')

function registerHandlers() {
  // --- Negocio ---
  ipcMain.handle('negocio:get', () => {
    try {
      return db.prepare('SELECT * FROM negocio LIMIT 1').get() || null
    } catch (err) {
      console.error('negocio:get', err)
      throw err
    }
  })

  ipcMain.handle('negocio:create', (_event, { nombre }) => {
    try {
      db.prepare('INSERT INTO negocio (nombre) VALUES (?)').run(nombre)
      return db.prepare('SELECT * FROM negocio LIMIT 1').get()
    } catch (err) {
      console.error('negocio:create', err)
      throw err
    }
  })

  // --- Productos ---
  ipcMain.handle('productos:getAll', () => {
    try {
      return db.prepare('SELECT * FROM productos ORDER BY nombre ASC').all()
    } catch (err) {
      console.error('productos:getAll', err)
      throw err
    }
  })

  ipcMain.handle('productos:create', (_event, { nombre, precio }) => {
    try {
      const result = db.prepare('INSERT INTO productos (nombre, precio) VALUES (?, ?)').run(nombre, precio)
      return db.prepare('SELECT * FROM productos WHERE id = ?').get(result.lastInsertRowid)
    } catch (err) {
      console.error('productos:create', err)
      throw err
    }
  })

  ipcMain.handle('productos:update', (_event, { id, nombre, precio }) => {
    try {
      db.prepare('UPDATE productos SET nombre = ?, precio = ? WHERE id = ?').run(nombre, precio, id)
      return db.prepare('SELECT * FROM productos WHERE id = ?').get(id)
    } catch (err) {
      console.error('productos:update', err)
      throw err
    }
  })

  ipcMain.handle('productos:delete', (_event, { id }) => {
    try {
      db.prepare('DELETE FROM productos WHERE id = ?').run(id)
      return { ok: true }
    } catch (err) {
      console.error('productos:delete', err)
      throw err
    }
  })

  // --- Ventas ---
  ipcMain.handle('ventas:create', (_event, { numero_orden, total, detalle }) => {
    try {
      const result = db
        .prepare('INSERT INTO ventas (numero_orden, total, detalle) VALUES (?, ?, ?)')
        .run(numero_orden, total, detalle)
      return db.prepare('SELECT * FROM ventas WHERE id = ?').get(result.lastInsertRowid)
    } catch (err) {
      console.error('ventas:create', err)
      throw err
    }
  })

  ipcMain.handle('ventas:getToday', () => {
    try {
      return db
        .prepare("SELECT * FROM ventas WHERE DATE(fecha_hora) = DATE('now') ORDER BY numero_orden ASC")
        .all()
    } catch (err) {
      console.error('ventas:getToday', err)
      throw err
    }
  })

  ipcMain.handle('ventas:getNextOrder', () => {
    try {
      const row = db
        .prepare("SELECT COUNT(*) + 1 as next FROM ventas WHERE DATE(fecha_hora) = DATE('now')")
        .get()
      return row.next
    } catch (err) {
      console.error('ventas:getNextOrder', err)
      throw err
    }
  })
}

module.exports = { registerHandlers }
