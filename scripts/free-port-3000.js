const { execSync } = require('child_process');

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
    // Port 3000 was free
  }
}

freePort3000();
