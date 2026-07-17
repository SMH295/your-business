const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  app: {
    getDeviceId: () => ipcRenderer.invoke('app:getDeviceId')
  },
  negocio: {
    get: () => ipcRenderer.invoke('negocio:get'),
    create: (data) => ipcRenderer.invoke('negocio:create', data),
    update: (data) => ipcRenderer.invoke('negocio:update', data)
  },
  productos: {
    getAll: () => ipcRenderer.invoke('productos:getAll'),
    create: (data) => ipcRenderer.invoke('productos:create', data),
    update: (data) => ipcRenderer.invoke('productos:update', data),
    delete: (data) => ipcRenderer.invoke('productos:delete', data)
  },
  ventas: {
    create: (data) => ipcRenderer.invoke('ventas:create', data),
    getToday: () => ipcRenderer.invoke('ventas:getToday'),
    getNextOrder: () => ipcRenderer.invoke('ventas:getNextOrder'),
    delete: (data) => ipcRenderer.invoke('ventas:delete', data)
  },
  pedidos: {
    getAll: () => ipcRenderer.invoke('pedidos:getAll'),
    create: (data) => ipcRenderer.invoke('pedidos:create', data),
    update: (data) => ipcRenderer.invoke('pedidos:update', data),
    delete: (data) => ipcRenderer.invoke('pedidos:delete', data)
  },
  analytics: {
    getStats: () => ipcRenderer.invoke('analytics:getStats')
  },
  ai: {
    chat: (data) => ipcRenderer.invoke('ai:chat', data),
    listModels: (key) => ipcRenderer.invoke('ai:listModels', key)
  },
  config: {
    get: (key) => ipcRenderer.invoke('config:get', key),
    set: (key, value) => ipcRenderer.invoke('config:set', key, value)
  },
  calendar: {
    getMonthSummary: (year, month) => ipcRenderer.invoke('calendar:getMonthSummary', year, month),
    getDaySales:     (date)        => ipcRenderer.invoke('calendar:getDaySales', date),
    getNote:         (date)        => ipcRenderer.invoke('calendar:getNote', date),
    setNote:         (date, note)  => ipcRenderer.invoke('calendar:setNote', date, note)
  },
  telemetry: {
    track:      (name, params) => ipcRenderer.invoke('telemetry:track', name, params),
    getConsent: ()             => ipcRenderer.invoke('telemetry:getConsent'),
    setConsent: (val)          => ipcRenderer.invoke('telemetry:setConsent', val)
  },
  license: {
    init:              (email) => ipcRenderer.invoke('license:init', email),
    getEntitlements:   ()      => ipcRenderer.invoke('license:getEntitlements'),
    activate:          (key, email) => ipcRenderer.invoke('license:activate', key, email),
    checkProductLimit: ()      => ipcRenderer.invoke('license:checkProductLimit'),
  },
  db: {
    switchUser: (uid, email) => ipcRenderer.invoke('db:switchUser', uid, email),
    closeUser:  ()           => ipcRenderer.invoke('db:closeUser'),
  }
})
