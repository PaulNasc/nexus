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
    // Port free
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

server.on('exit', (code) => {
  process.exit(code || 0);
});
