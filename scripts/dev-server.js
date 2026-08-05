const { execSync, spawn } = require('child_process');

function freePort3000() {
  try {
    if (process.platform === 'win32') {
      execSync(
        'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Get-Process nexus -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue"',
        { stdio: 'ignore' }
      );
    } else {
      execSync('npx --yes kill-port 3000', { stdio: 'ignore' });
    }
  } catch {
    // Port already free
  }
}

freePort3000();

console.log('Preparing initial Webpack bundle...');
try {
  execSync('npx webpack --config webpack.renderer.config.js --mode development', { stdio: 'inherit' });
} catch (err) {
  console.warn('Initial bundle preparation warning:', err.message);
}

console.log('Starting Webpack dev server...');
const server = spawn('npx', ['webpack', 'serve', '--config', 'webpack.renderer.config.js', '--mode', 'development'], {
  stdio: 'inherit',
  shell: true,
});

// Propagate Ctrl+C gracefully to the child process
process.on('SIGINT', () => { server.kill('SIGINT'); });
process.on('SIGTERM', () => { server.kill('SIGTERM'); });

server.on('exit', (code, signal) => {
  // Tauri kills the webpack dev server on shutdown via signal or with exit code -1 / 4294967295.
  // Treat any externally-signalled or unexpected kill as a clean exit (code 0)
  // so `npm run tauri:dev` doesn't report a false npm ERR.
  const isCleanShutdown = signal !== null || code === null || code === 0 || code === 4294967295 || code === -1;
  process.exit(isCleanShutdown ? 0 : code);
});
