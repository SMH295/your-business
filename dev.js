#!/usr/bin/env node
delete process.env.ELECTRON_RUN_AS_NODE

const { spawn } = require('child_process')

const child = spawn('electron-vite', ['dev'], {
  stdio: 'inherit',
  env: process.env,
  shell: true
})

child.on('close', (code) => process.exit(code ?? 0))
