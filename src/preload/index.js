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
  }
})
