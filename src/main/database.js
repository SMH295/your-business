const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')

const dbPath = path.join(app.getPath('userData'), 'yourbusiness.db')
const db = new Database(dbPath)

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
`)

module.exports = db
