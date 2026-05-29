// Builds the app and publishes a new release to GitHub
// Usage: npm run publish-app
require('dotenv').config()
delete process.env.ELECTRON_RUN_AS_NODE

const { spawn } = require('child_process')
const child = spawn(
  'electron-vite build && electron-builder --publish always',
  { stdio: 'inherit', env: process.env, shell: true }
)
child.on('close', (code) => process.exit(code ?? 0))
