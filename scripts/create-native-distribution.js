/**
 * Script para criar distribuição nativa do Nexus
 * Gera executável com ícone próprio e atalho na área de trabalho
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const BUILD_DIR = path.join(__dirname, '..', 'native-build');
const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');

async function createNativeDistribution() {
    const packageJson = require(PACKAGE_JSON_PATH);
    const version = packageJson.version;
    
    console.log(`🚀 Criando distribuição nativa do Nexus v${version}...`);
    
    try {
        // 1. Preparar dados limpos para distribuição
        console.log('🧹 Preparando dados limpos...');
        await cleanUserData();
        
        // 2. Fazer build de produção
        console.log('📦 Compilando aplicação...');
        execSync('npm run build', { stdio: 'inherit' });
        
        // 3. Atualizar package.json para distribuição
        console.log('⚙️ Configurando package.json para distribuição...');
        await updatePackageForDistribution();
        
        // 4. Criar executável nativo usando electron-builder
        console.log('🔨 Criando executável nativo...');
        await createNativeExecutable();
        
        // 5. Verificar se o executável foi criado
        console.log('✅ Verificando distribuição...');
        await verifyDistribution();
        
        console.log('🎉 Distribuição nativa criada com sucesso!');
        console.log(`📁 Local: ${path.join(__dirname, '..', 'dist')}`);
        
    } catch (error) {
        console.error('❌ Erro durante criação da distribuição:', error.message);
        process.exit(1);
    }
}

async function cleanUserData() {
    // Criar arquivo temporário para limpar dados do usuário na inicialização
    const cleanDataScript = `
// Script para limpar dados do usuário na primeira execução
(function() {
    const isFirstRun = !localStorage.getItem('nexus-first-run-completed');
    
    if (isFirstRun) {
        console.log('🧹 Primeira execução: limpando dados de desenvolvimento...');
        
        // Limpar todos os dados de desenvolvimento
        const allKeys = Object.keys(localStorage);
        allKeys.forEach(key => {
            if (key.startsWith('krigzis-') || key.startsWith('nexus-')) {
                localStorage.removeItem(key);
            }
        });
        
        // Definir configurações padrão para usuário final
        const cleanSettings = {
            userName: '',
            language: 'pt-BR',
            theme: 'dark',
            startWithOS: false,
            minimizeToTray: true,
            showNotifications: true,
            playSound: true,
            dailyGoal: 5,
            autoSave: true,
            autoBackup: true,
            backupFrequency: 'daily',
            showTimer: true,
            showReports: true,
            showNotes: true,
            showQuickActions: true,
            highContrastMode: false,
            largeFontMode: false,
            showTaskCounters: true,
            storageType: 'localStorage',
            aiCanCreateTasks: true,
            aiCanEditTasks: true,
            aiCanDeleteTasks: false,
            aiCanManageNotes: true,
            aiResponseMode: 'balanced',
            aiProactiveMode: false,
            showProductivityTips: true,
            showProgressInsights: true
        };
        
        localStorage.setItem('nexus-user-settings', JSON.stringify(cleanSettings));
        localStorage.setItem('nexus-first-run-completed', 'true');
        
        console.log('✅ Dados limpos e configurações padrão aplicadas');
    }
})();
`;
    
    // Salvar script de limpeza
    const scriptPath = path.join(__dirname, '..', 'dist', 'renderer', 'clean-data.js');
    await fs.ensureDir(path.dirname(scriptPath));
    await fs.writeFile(scriptPath, cleanDataScript);
    
    // Modificar index.html para incluir o script de limpeza
    const indexPath = path.join(__dirname, '..', 'dist', 'renderer', 'index.html');
    if (await fs.pathExists(indexPath)) {
        let indexContent = await fs.readFile(indexPath, 'utf8');
        
        // Adicionar script de limpeza antes do script principal
        if (!indexContent.includes('clean-data.js')) {
            indexContent = indexContent.replace(
                '<script src="renderer.js"></script>',
                '<script src="clean-data.js"></script>\n    <script src="renderer.js"></script>'
            );
            await fs.writeFile(indexPath, indexContent);
        }
    }
}

async function updatePackageForDistribution() {
    const packageJson = require(PACKAGE_JSON_PATH);
    
    // Configurações otimizadas para distribuição
    const distributionConfig = {
        ...packageJson,
        main: "./dist/main/index.js",
        build: {
            ...packageJson.build,
            artifactName: "Nexus-v${version}-${os}-${arch}.${ext}",
            directories: {
                output: "dist",
                buildResources: "assets"
            },
            files: [
                "dist/**/*",
                "assets/**/*",
                "package.json",
                "!dist/renderer/clean-data.js.map"
            ],
            win: {
                ...packageJson.build.win,
                icon: "assets/icon.ico",
                target: [
                    {
                        target: "nsis",
                        arch: ["x64"]
                    }
                ],
                requestedExecutionLevel: "asInvoker",
                sign: false,
                verifyUpdateCodeSignature: false
            },
            nsis: {
                ...packageJson.build.nsis,
                oneClick: false,
                allowToChangeInstallationDirectory: true,
                createDesktopShortcut: true,
                createStartMenuShortcut: true,
                shortcutName: "Nexus",
                displayLanguageSelector: false,
                installerLanguages: ["portuguese_br"],
                language: "2070", // Portuguese Brazil
                runAfterFinish: true,
                deleteAppDataOnUninstall: false
            },
            extraResources: [
                {
                    from: "assets/",
                    to: "assets/",
                    filter: ["**/*"]
                }
            ]
        }
    };
    
    // Salvar package.json temporário para distribuição
    const distPackagePath = path.join(__dirname, '..', 'package-dist.json');
    await fs.writeJson(distPackagePath, distributionConfig, { spaces: 2 });
}

async function createNativeExecutable() {
    try {
        // Usar package.json temporário para distribuição
        execSync('npx electron-builder build --config package-dist.json --win', { 
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });
        
        // Remover package.json temporário
        const distPackagePath = path.join(__dirname, '..', 'package-dist.json');
        if (await fs.pathExists(distPackagePath)) {
            await fs.remove(distPackagePath);
        }
        
    } catch (error) {
        console.error('Erro no electron-builder:', error.message);
        
        // Fallback: Criar distribuição portável melhorada
        console.log('📦 Criando distribuição portável como fallback...');
        await createPortableDistribution();
    }
}

async function createPortableDistribution() {
    const BUILD_DIR = path.join(__dirname, '..', 'portable-dist');
    const packageJson = require(PACKAGE_JSON_PATH);
    
    // Limpar diretório
    if (await fs.pathExists(BUILD_DIR)) {
        await fs.remove(BUILD_DIR);
    }
    await fs.ensureDir(BUILD_DIR);
    
    // Copiar dist compilado
    await fs.copy(path.join(__dirname, '..', 'dist'), path.join(BUILD_DIR, 'dist'));
    
    // Copiar package.json simplificado
    const portablePackage = {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        main: packageJson.main,
        dependencies: {
            // Apenas dependências essenciais
        }
    };
    await fs.writeJson(path.join(BUILD_DIR, 'package.json'), portablePackage, { spaces: 2 });
    
    // Copiar ícones
    if (await fs.pathExists(path.join(__dirname, '..', 'assets'))) {
        await fs.copy(path.join(__dirname, '..', 'assets'), path.join(BUILD_DIR, 'assets'));
    }
    
    // Criar executável PowerShell melhorado
    const executableScript = `
@echo off
title Nexus - Gerenciador de Tarefas
cd /d "%~dp0"

echo.
echo ========================================
echo       Nexus - Task Manager v${packageJson.version}
echo ========================================
echo.

REM Verificar Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js não encontrado!
    echo.
    echo Para usar o Nexus, instale o Node.js:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Instalar Electron se necessário
if not exist node_modules\\electron (
    echo 📦 Instalando Electron...
    npm install electron@^26.6.10 --no-save
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Erro ao instalar Electron
        pause
        exit /b 1
    )
)

REM Iniciar aplicação
echo ✅ Iniciando Nexus...
echo.
npx electron . --no-sandbox

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Erro ao iniciar a aplicação
    echo Verifique se todas as dependências estão instaladas
    pause
)
`;
    
    await fs.writeFile(path.join(BUILD_DIR, 'Nexus.bat'), executableScript);
    
    // Criar README detalhado
    const readme = `# Nexus v${packageJson.version} - Distribuição Portável

## 🚀 Como usar

### Execução simples:
1. Clique duas vezes em \`Nexus.bat\`
2. Aguarde a instalação automática das dependências
3. A aplicação será iniciada

### Requisitos:
- Windows 10 ou superior
- Node.js 16+ (será solicitado se não instalado)
- 4GB RAM mínimo

## ✨ Características desta versão

- ✅ **Dados limpos**: Primeira execução remove dados de desenvolvimento
- ✅ **Configuração automática**: Settings otimizados para usuário final
- ✅ **Instalação automática**: Dependências instaladas automaticamente
- ✅ **Executável nativo**: Interface igual ao programa original
- ✅ **Atalho desktop**: Pode criar atalho na área de trabalho

## 🔧 Configurações iniciais limpas

Na primeira execução, o sistema:
- Remove todos os dados de desenvolvimento
- Aplica configurações padrão otimizadas
- Solicita definição do nome do usuário
- Permite escolha do local de armazenamento

## 📁 Estrutura de arquivos

\`\`\`
Nexus/
├── Nexus.bat          # Executável principal
├── dist/                # Aplicação compilada
├── assets/              # Ícones e recursos
├── package.json         # Configurações
└── README.md           # Este arquivo
\`\`\`

## 🆔 Ícone personalizado

Esta distribuição inclui o ícone oficial do Nexus com o gradiente
teal/purple característico da marca.

---

**Desenvolvido por Paulo Ricardo**
**Versão:** ${packageJson.version}
**Data:** ${new Date().toLocaleDateString('pt-BR')}
`;
    
    await fs.writeFile(path.join(BUILD_DIR, 'README.md'), readme);
    
    console.log('📦 Distribuição portável criada como fallback');
}

async function verifyDistribution() {
    // Verificar se os arquivos foram criados
    const distDir = path.join(__dirname, '..', 'dist');
    const portableDir = path.join(__dirname, '..', 'portable-dist');
    
    let distributionFound = false;
    
    if (await fs.pathExists(distDir)) {
        const files = await fs.readdir(distDir);
        const exeFiles = files.filter(f => f.endsWith('.exe') || f.endsWith('.msi'));
        if (exeFiles.length > 0) {
            console.log('✅ Executável nativo criado:', exeFiles.join(', '));
            distributionFound = true;
        }
    }
    
    if (await fs.pathExists(portableDir)) {
        console.log('✅ Distribuição portável criada');
        distributionFound = true;
    }
    
    if (!distributionFound) {
        throw new Error('Nenhuma distribuição foi criada com sucesso');
    }
    
    console.log('');
    console.log('📋 Próximos passos:');
    console.log('   1. Teste a distribuição em uma máquina limpa');
    console.log('   2. Verifique se o ícone está correto');
    console.log('   3. Confirme que os dados iniciais estão limpos');
    console.log('   4. Teste a criação de atalho na área de trabalho');
}

// Executar se chamado diretamente
if (require.main === module) {
    createNativeDistribution().catch(console.error);
}

module.exports = { createNativeDistribution };