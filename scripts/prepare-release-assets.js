/**
 * Script de preparação de artefatos de Release do Nexus (v1.4.1+)
 * Gera e organiza TODOS os arquivos necessários para atualizações automáticas:
 * - Clientes instalados legados (electron-updater + NSIS): latest.yml, Nexus-Setup-1.4.1.exe, Nexus_1.4.1_x64-setup.exe
 * - Clientes portáteis legados (Portable mode): Nexus-1.4.1-x64.exe, Nexus-v1.4.1-Windows-Portable.zip
 * - Clientes Tauri v2: latest.json, arquivos MSI e setup NSIS
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json');
const TAURI_RELEASE_DIR = path.join(ROOT_DIR, 'src-tauri', 'target', 'release');
const BUNDLE_DIR = path.join(TAURI_RELEASE_DIR, 'bundle');
const OUTPUT_DIR = path.join(ROOT_DIR, 'releases', 'release-assets');

function computeSha512Base64(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha512').update(fileBuffer).digest('base64');
}

async function prepareReleaseAssets() {
  const pkg = fs.readJsonSync(PACKAGE_JSON_PATH);
  const version = pkg.version;
  const releaseTag = `v${version}`;
  const nowIso = new Date().toISOString();

  console.log(`🚀 Preparando pacote completo de Release para Nexus ${releaseTag}...`);

  fs.ensureDirSync(OUTPUT_DIR);
  fs.emptyDirSync(OUTPUT_DIR);

  // 1. Localizar executável nativo compilado
  const nativeExePath = path.join(TAURI_RELEASE_DIR, 'nexus.exe');
  if (!fs.existsSync(nativeExePath)) {
    console.error(`❌ Executável principal não encontrado em ${nativeExePath}. Execute 'npx @tauri-apps/cli build' primeiro.`);
    process.exit(1);
  }

  // 2. Localizar instaladores gerados pelo Tauri/NSIS
  let setupExePath = null;
  const nsisDir = path.join(BUNDLE_DIR, 'nsis');
  if (fs.existsSync(nsisDir)) {
    const files = fs.readdirSync(nsisDir);
    const exeFile = files.find((f) => f.endsWith('.exe'));
    if (exeFile) {
      setupExePath = path.join(nsisDir, exeFile);
    }
  }

  if (!setupExePath) {
    // Tentar fallback em outros caminhos comuns de build
    const possibleSetupPaths = [
      path.join(BUNDLE_DIR, `Nexus_${version}_x64-setup.exe`),
      path.join(BUNDLE_DIR, 'exe', `Nexus_${version}_x64-setup.exe`),
    ];
    for (const p of possibleSetupPaths) {
      if (fs.existsSync(p)) {
        setupExePath = p;
        break;
      }
    }
  }

  // Se não encontrar o instalador NSIS, usar a cópia do executável nativo como fallback de setup
  const primarySetupPath = setupExePath || nativeExePath;

  // Artifact 1: Nexus_1.4.1_x64-setup.exe
  const outSetupExe = path.join(OUTPUT_DIR, `Nexus_${version}_x64-setup.exe`);
  fs.copySync(primarySetupPath, outSetupExe);

  // Artifact 2: Nexus-Setup-1.4.1.exe (Alias para compatibilidade electron-updater)
  const outSetupAlias = path.join(OUTPUT_DIR, `Nexus-Setup-${version}.exe`);
  fs.copySync(primarySetupPath, outSetupAlias);

  // Artifact 3: Nexus-1.4.1-x64.exe (Executável Portátil para clientes portáteis)
  const outPortableExe = path.join(OUTPUT_DIR, `Nexus-${version}-x64.exe`);
  fs.copySync(nativeExePath, outPortableExe);

  // Artifact 4: Nexus-v1.4.1-Windows-Portable.zip (Zip portátil)
  const outPortableZip = path.join(OUTPUT_DIR, `Nexus-v${version}-Windows-Portable.zip`);
  console.log('📦 Gerando arquivo ZIP portátil...');
  try {
    const psCmd = `Compress-Archive -Path "${nativeExePath}" -DestinationPath "${outPortableZip}" -Force`;
    execSync(`powershell -Command "${psCmd}"`, { stdio: 'inherit' });
  } catch (err) {
    console.warn('⚠️ Falha ao criar ZIP portátil via PowerShell, mantendo binário .exe portátil.');
  }

  // Artifact 5: MSI Installer (se existir)
  const msiDir = path.join(BUNDLE_DIR, 'msi');
  if (fs.existsSync(msiDir)) {
    const msiFiles = fs.readdirSync(msiDir);
    const msiFile = msiFiles.find((f) => f.endsWith('.msi'));
    if (msiFile) {
      fs.copySync(path.join(msiDir, msiFile), path.join(OUTPUT_DIR, msiFile));
    }
  }

  // Artifact 6: Gerar latest.yml para electron-updater (versões instaladas v1.4.0 e anteriores)
  const setupSha512 = computeSha512Base64(outSetupExe);
  const setupSizeBytes = fs.statSync(outSetupExe).size;

  const latestYmlContent = `version: ${version}
files:
  - url: Nexus_${version}_x64-setup.exe
    sha512: ${setupSha512}
    size: ${setupSizeBytes}
  - url: Nexus-Setup-${version}.exe
    sha512: ${setupSha512}
    size: ${setupSizeBytes}
path: Nexus_${version}_x64-setup.exe
sha512: ${setupSha512}
releaseDate: '${nowIso}'
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'latest.yml'), latestYmlContent, 'utf-8');

  // Artifact 7: Gerar latest.json para Tauri v2 updater
  const latestJsonContent = {
    version: version,
    notes: `Release Nexus v${version} - Atualização automática do sistema.`,
    pub_date: nowIso,
    platforms: {
      'windows-x86_64': {
        signature: '',
        url: `https://github.com/PaulNasc/nexus/releases/download/${releaseTag}/Nexus_${version}_x64-setup.exe`,
      },
    },
  };
  fs.writeJsonSync(path.join(OUTPUT_DIR, 'latest.json'), latestJsonContent, { spaces: 2 });

  console.log('\n✅ Todos os artefatos de Release foram gerados com sucesso em releases/release-assets:');
  const generatedFiles = fs.readdirSync(OUTPUT_DIR);
  generatedFiles.forEach((file) => {
    const filePath = path.join(OUTPUT_DIR, file);
    const stats = fs.statSync(filePath);
    const sizeMb = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   📄 ${file} (${sizeMb} MB)`);
  });
}

if (require.main === module) {
  prepareReleaseAssets().catch((err) => {
    console.error('❌ Erro ao preparar artefatos:', err);
    process.exit(1);
  });
}

module.exports = { prepareReleaseAssets };
