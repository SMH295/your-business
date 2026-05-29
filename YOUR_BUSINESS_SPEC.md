# YOUR BUSINESS POS — SPEC DE DESARROLLO (MVP)

> Documento de especificaciones técnicas para Claude Code  
> Versión 1.0 — Mayo 2026

---

## 1. RESUMEN DEL PROYECTO

**Your Business** es una aplicación de escritorio para Windows que funciona como sistema POS (Point of Sale) para pequeños negocios. Es **offline-first**: no requiere internet, no tiene suscripciones en dólares, y todos los datos se guardan localmente.

### Objetivo del MVP
Construir la versión mínima funcional con tres módulos core:
1. Registro del negocio (setup inicial)
2. Gestión de productos (CRUD)
3. Registro de ventas con historial del día

### Instrucción inicial para Claude Code
**Empieza por inicializar el proyecto con `electron-vite` usando el template React. Configura la estructura de archivos completa antes de escribir cualquier funcionalidad.**

---

## 2. STACK TECNOLÓGICO

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework desktop | Electron | 28+ |
| Build system | electron-vite | 2+ |
| Frontend | React | 18+ |
| Estilos | TailwindCSS | 3+ |
| Base de datos | better-sqlite3 | 9+ |
| Instalador | electron-builder | 24+ |
| Runtime | Node.js | 18+ |

**¿Por qué `better-sqlite3` y no `sqlite3`?**  
Es síncrono, más simple de usar en el proceso main de Electron, y no requiere callbacks ni promesas para queries básicas.

**¿Por qué `electron-vite` y no Webpack?**  
Es el setup moderno recomendado para Electron + React + Vite. Hot reload rápido y configuración mínima.

---

## 3. ESTRUCTURA DE ARCHIVOS

```
your-business/
├── src/
│   ├── main/
│   │   ├── index.js            # Proceso principal Electron (ventana, lifecycle)
│   │   ├── database.js         # Inicialización SQLite y todas las queries
│   │   └── ipcHandlers.js      # Manejadores de eventos IPC
│   ├── preload/
│   │   └── index.js            # Bridge seguro: expone window.api al renderer
│   └── renderer/
│       ├── index.html
│       ├── main.jsx            # Entry point React
│       ├── App.jsx             # Router principal + layout
│       ├── components/
│       │   ├── Setup.jsx       # Pantalla de configuración inicial
│       │   ├── Sales.jsx       # Módulo de ventas (carrito)
│       │   ├── Products.jsx    # Gestión de productos (CRUD)
│       │   └── History.jsx     # Historial de ventas del día
│       └── styles/
│           └── globals.css     # Variables CSS + imports Tailwind
├── package.json
├── electron.vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## 4. BASE DE DATOS — SCHEMA SQLITE

**Archivo:** `src/main/database.js`  
**Ubicación del archivo DB:** `app.getPath('userData')` + `/yourbusiness.db`  
Esto garantiza que los datos persistan entre sesiones y no se borren al actualizar la app.

```sql
-- Tabla negocio (siempre 1 solo registro)
CREATE TABLE IF NOT EXISTS negocio (
  id    INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL
);

-- Tabla productos
CREATE TABLE IF NOT EXISTS productos (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre  TEXT NOT NULL,
  precio  REAL NOT NULL CHECK(precio > 0)
);

-- Tabla ventas
CREATE TABLE IF NOT EXISTS ventas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_orden INTEGER NOT NULL,
  fecha_hora   DATETIME DEFAULT CURRENT_TIMESTAMP,
  total        REAL NOT NULL,
  detalle      TEXT NOT NULL
  -- detalle es un JSON array: [{ id, nombre, precio, cantidad, subtotal }]
);
```

### Inicialización en `database.js`

```javascript
const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

const dbPath = path.join(app.getPath('userData'), 'yourbusiness.db');
const db = new Database(dbPath);

// Crear tablas si no existen
db.exec(`
  CREATE TABLE IF NOT EXISTS negocio (...);
  CREATE TABLE IF NOT EXISTS productos (...);
  CREATE TABLE IF NOT EXISTS ventas (...);
`);

module.exports = db;
```

---

## 5. COMUNICACIÓN IPC

### Regla fundamental
- **Todo acceso a la base de datos ocurre en el proceso `main`**, nunca en el renderer.
- El **preload** es el único puente entre ambos procesos.
- Los componentes React solo llaman a `window.api.*`.

### Canales IPC a implementar en `ipcHandlers.js`

#### Negocio
| Canal | Acción SQL | Parámetros |
|-------|-----------|------------|
| `negocio:get` | `SELECT * FROM negocio LIMIT 1` | ninguno |
| `negocio:create` | `INSERT INTO negocio (nombre) VALUES (?)` | `{ nombre }` |

#### Productos
| Canal | Acción SQL | Parámetros |
|-------|-----------|------------|
| `productos:getAll` | `SELECT * FROM productos ORDER BY nombre ASC` | ninguno |
| `productos:create` | `INSERT INTO productos (nombre, precio) VALUES (?, ?)` | `{ nombre, precio }` |
| `productos:update` | `UPDATE productos SET nombre=?, precio=? WHERE id=?` | `{ id, nombre, precio }` |
| `productos:delete` | `DELETE FROM productos WHERE id=?` | `{ id }` |

#### Ventas
| Canal | Acción SQL | Parámetros |
|-------|-----------|------------|
| `ventas:create` | `INSERT INTO ventas (numero_orden, total, detalle) VALUES (?, ?, ?)` | `{ numero_orden, total, detalle }` |
| `ventas:getToday` | `SELECT * FROM ventas WHERE DATE(fecha_hora) = DATE('now') ORDER BY numero_orden ASC` | ninguno |
| `ventas:getNextOrder` | `SELECT COUNT(*) + 1 as next FROM ventas WHERE DATE(fecha_hora) = DATE('now')` | ninguno |

### Exposición en `preload/index.js`

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  negocio: {
    get: () => ipcRenderer.invoke('negocio:get'),
    create: (data) => ipcRenderer.invoke('negocio:create', data),
  },
  productos: {
    getAll: () => ipcRenderer.invoke('productos:getAll'),
    create: (data) => ipcRenderer.invoke('productos:create', data),
    update: (data) => ipcRenderer.invoke('productos:update', data),
    delete: (data) => ipcRenderer.invoke('productos:delete', data),
  },
  ventas: {
    create: (data) => ipcRenderer.invoke('ventas:create', data),
    getToday: () => ipcRenderer.invoke('ventas:getToday'),
    getNextOrder: () => ipcRenderer.invoke('ventas:getNextOrder'),
  },
});
```

---

## 6. FUNCIONALIDADES DETALLADAS

### 6.1 App.jsx — Router principal

**Lógica de arranque:**
1. Al montar, llamar `window.api.negocio.get()`
2. Si **no hay negocio** → mostrar `<Setup />`
3. Si **hay negocio** → mostrar layout principal con navegación
4. Estado de carga durante la consulta inicial

**Layout principal:**
- Sidebar izquierdo fijo con navegación (Ventas / Productos / Historial)
- Header con nombre del negocio
- Área de contenido principal que renderiza el módulo activo

---

### 6.2 Setup.jsx — Configuración inicial

**Cuándo se muestra:** Solo si la tabla `negocio` está vacía (primera ejecución).

**UI:**
- Pantalla completa centrada
- Logo o ícono de la app
- Título: "Bienvenido a Your Business"
- Subtítulo: "Configura el nombre de tu negocio para comenzar"
- Input: placeholder "Ej: Zona Burguer"
- Botón: "Comenzar" (verde, deshabilitado si input vacío)

**Validaciones:**
- Nombre no vacío
- Mínimo 2 caracteres
- Máximo 60 caracteres

**Al guardar:**
1. `window.api.negocio.create({ nombre })`
2. Actualizar estado global → renderizar layout principal

---

### 6.3 Products.jsx — Gestión de productos

**Vista principal:**
- Header con título "Productos" y botón "+ Agregar Producto"
- Tabla o lista de productos con columnas: Nombre | Precio | Acciones (Editar / Eliminar)
- Estado vacío: ilustración/icono + mensaje "Aún no tienes productos. ¡Agrega tu primero!"

**Modal Agregar/Editar:**
- Campo: Nombre del producto (obligatorio)
- Campo: Precio (número, mayor a 0)
- Botones: Cancelar / Guardar
- Al guardar: recargar lista de productos

**Validaciones:**
- Nombre: obligatorio, mínimo 2 caracteres
- Precio: numérico, mayor a 0, máximo 2 decimales

**Eliminar:**
- Mostrar diálogo de confirmación: "¿Eliminar [nombre del producto]? Esta acción no se puede deshacer."
- Botones: Cancelar / Eliminar (rojo)

**Flujo de datos:**
```
montar componente → getAll() → mostrar lista
click Agregar → abrir modal vacío → guardar → create() → recargar lista
click Editar → abrir modal con datos → guardar → update() → recargar lista
click Eliminar → confirmar → delete() → recargar lista
```

---

### 6.4 Sales.jsx — Registro de ventas

**Layout de dos paneles:**

**Panel izquierdo — Catálogo de productos (60% del ancho)**
- Grid de cards, una por producto
- Card muestra: nombre del producto y precio
- Click en card → agrega al carrito (o incrementa cantidad si ya existe)
- Estado vacío: "No hay productos registrados. Ve a Productos para agregar."

**Panel derecho — Carrito (40% del ancho)**
- Título: "Orden actual"
- Lista de ítems del carrito:
  - Nombre del producto
  - Controles de cantidad: botón `-` | número | botón `+`
  - Subtotal del ítem (precio × cantidad)
  - Botón eliminar ítem (×)
- Separador
- **TOTAL** en grande y negrita
- Botón "Cancelar" (gris) — limpia carrito sin guardar
- Botón "Confirmar Venta" (verde, deshabilitado si carrito vacío)

**Al confirmar venta:**
1. Validar que el carrito no esté vacío
2. `window.api.ventas.getNextOrder()` → obtener número de orden del día
3. Calcular total final
4. Construir JSON del detalle: `[{ id, nombre, precio, cantidad, subtotal }]`
5. `window.api.ventas.create({ numero_orden, total, detalle: JSON.stringify(detalle) })`
6. Limpiar carrito
7. Mostrar toast/notificación de éxito: "✓ Venta #[numero_orden] registrada"

**Estructura del estado del carrito:**
```javascript
// Estado: array de ítems
const [carrito, setCarrito] = useState([]);

// Estructura de cada ítem:
{
  id: 1,
  nombre: "Hamburguesa",
  precio: 15000,
  cantidad: 2,
  subtotal: 30000
}
```

---

### 6.5 History.jsx — Historial de ventas

**Al montar:** `window.api.ventas.getToday()` → cargar ventas del día

**Header con resumen del día:**
- Total vendido: suma de todos los `total` del día
- Cantidad de órdenes: número de ventas del día
- Fecha actual

**Lista de ventas:**
- Una fila por venta: `#[numero_orden]` | Hora | Total
- Click en fila → expandir/mostrar modal con detalle de esa venta

**Modal de detalle:**
- Número de orden y hora
- Tabla con los productos vendidos: Nombre | Cantidad | Precio unit. | Subtotal
- Total de la venta
- Botón cerrar

**Estado vacío:** "No hay ventas registradas hoy."

---

## 7. DISEÑO UI/UX

### Paleta de colores
```css
:root {
  --color-primary:      #10B981;  /* Verde esmeralda — acción principal */
  --color-primary-dark: #059669;  /* Verde oscuro — hover */
  --color-primary-light:#D1FAE5;  /* Verde claro — backgrounds sutiles */
  --color-bg:           #F9FAFB;  /* Fondo general */
  --color-surface:      #FFFFFF;  /* Cards, panels, modales */
  --color-border:       #E5E7EB;  /* Bordes sutiles */
  --color-text-primary: #111827;  /* Texto principal */
  --color-text-secondary:#6B7280; /* Texto secundario/labels */
  --color-danger:       #EF4444;  /* Acciones destructivas */
  --color-danger-dark:  #DC2626;  /* Hover peligro */
}
```

### Tipografía
- Fuente: `Inter` (importar desde Google Fonts)
- Tamaño base: 14px
- Títulos de sección: 20px, font-weight 600
- Labels: 12px, color secundario

### Espaciado y formas
- Border radius: `8px` para cards y modales, `6px` para inputs y botones
- Sombra cards: `0 1px 3px rgba(0,0,0,0.1)`
- Sombra modales: `0 4px 20px rgba(0,0,0,0.15)`
- Padding cards: `16px`
- Padding modales: `24px`

### Tamaño de ventana
- Inicial: `1200 × 700` px
- Mínimo: `900 × 600` px

### Componentes reutilizables a crear
- `<Button variant="primary|secondary|danger" size="sm|md">` 
- `<Modal title onClose>` 
- `<Toast message type="success|error">` 
- `<EmptyState icon message>` 
- `<ConfirmDialog message onConfirm onCancel>`

---

## 8. CONFIGURACIÓN ELECTRON

### `src/main/index.js`

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 700,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,   // SIEMPRE true por seguridad
      nodeIntegration: false,   // SIEMPRE false por seguridad
    },
    titleBarStyle: 'default',
    show: false, // Mostrar solo cuando esté lista
  });

  win.once('ready-to-show', () => win.show());
  // ... cargar URL de vite o archivo
}

app.whenReady().then(createWindow);
```

### `package.json` — scripts importantes

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "dist": "electron-vite build && electron-builder"
  }
}
```

### `electron-builder` — configuración para instalador Windows

```json
{
  "build": {
    "appId": "com.yourbusiness.pos",
    "productName": "Your Business",
    "directories": { "output": "dist" },
    "win": {
      "target": "nsis",
      "icon": "resources/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

---

## 9. DEPENDENCIAS — `package.json` COMPLETO

```json
{
  "name": "your-business",
  "version": "1.0.0",
  "description": "Sistema POS para pequeños negocios",
  "main": "out/main/index.js",
  "dependencies": {
    "better-sqlite3": "^9.4.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "electron": "^28.2.0",
    "electron-builder": "^24.9.1",
    "electron-vite": "^2.0.0",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1"
  }
}
```

---

## 10. CRITERIOS DE ACEPTACIÓN — CHECKLIST MVP

### Configuración
- [ ] Primera ejecución muestra pantalla de Setup
- [ ] Segunda ejecución (con negocio configurado) va directo al dashboard
- [ ] Nombre del negocio aparece en el header

### Productos
- [ ] Se pueden agregar productos con nombre y precio
- [ ] Se pueden editar productos existentes
- [ ] Se pueden eliminar productos con confirmación
- [ ] Validaciones funcionan correctamente
- [ ] Estado vacío se muestra cuando no hay productos

### Ventas
- [ ] Los productos aparecen en el catálogo izquierdo
- [ ] Click en producto lo agrega al carrito
- [ ] Los controles de cantidad (+/-) funcionan
- [ ] El total se calcula correctamente en tiempo real
- [ ] La venta se registra con número de orden del día
- [ ] El número de orden se reinicia cada día
- [ ] El carrito se limpia después de confirmar
- [ ] Se muestra toast de éxito con número de orden
- [ ] No se puede confirmar venta con carrito vacío

### Historial
- [ ] Muestra las ventas del día actual
- [ ] Muestra resumen: total vendido y cantidad de órdenes
- [ ] Al hacer click en una venta muestra el detalle de productos
- [ ] Estado vacío cuando no hay ventas

### General
- [ ] Los datos persisten al cerrar y reabrir la app
- [ ] Sin errores en consola en el flujo normal de uso
- [ ] Interfaz verde, moderna y minimalista
- [ ] Ventana respeta tamaño mínimo de 900×600px

---

## 11. NOTAS IMPORTANTES PARA EL DESARROLLO

### Seguridad Electron (obligatorio)
- `contextIsolation: true` — siempre activo
- `nodeIntegration: false` — siempre desactivado
- Nunca hacer `require('electron')` o `require('fs')` en los componentes React
- Todo acceso al sistema de archivos y base de datos va en el proceso `main`

### Manejo de errores
- Todos los handlers IPC deben tener `try/catch`
- Los componentes React deben manejar estados de error y loading
- Mostrar mensajes de error amigables al usuario

### Persistencia
- La base de datos se guarda en `app.getPath('userData')`
- En Windows esto es: `C:\Users\[usuario]\AppData\Roaming\your-business\`
- **No guardar en la carpeta de instalación** — se borraría al desinstalar

### Formato de moneda
- Mostrar precios con separadores de miles: `15.000` o `15,000`
- Sin símbolo de moneda fijo (el negocio define su moneda implícitamente)
- Usar `toLocaleString()` para formatear

### El detalle JSON de ventas
Estructura esperada al guardar:
```json
[
  { "id": 1, "nombre": "Hamburguesa", "precio": 15000, "cantidad": 2, "subtotal": 30000 },
  { "id": 3, "nombre": "Jugo de naranja", "precio": 5000, "cantidad": 1, "subtotal": 5000 }
]
```
Al leer: `JSON.parse(venta.detalle)` para convertir de string a array.

---

## 12. ORDEN DE DESARROLLO RECOMENDADO

1. **Setup del proyecto** — inicializar con `electron-vite`, instalar dependencias, configurar Tailwind
2. **Base de datos** — crear `database.js` con schema y queries
3. **IPC handlers** — conectar queries con canales IPC + preload
4. **Setup.jsx** — primera pantalla funcional para validar que el IPC funciona
5. **App.jsx** — router y layout con navegación
6. **Products.jsx** — CRUD completo (más simple para empezar)
7. **Sales.jsx** — módulo de ventas con carrito
8. **History.jsx** — historial del día
9. **Polish UI** — refinar estilos, componentes reutilizables, toasts
10. **Build** — generar instalador `.exe` con electron-builder

---

*Documento generado para el proyecto Your Business POS — MVP v1.0*
