/**
 * Build manual do Nexus - Contorna problemas do electron-builder
 * Cria uma distribuição funcional sem problemas de permissões
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const BUILD_DIR = path.join(__dirname, '..', 'manual-build');
const DIST_DIR = path.join(__dirname, '..', 'dist');

async function createManualBuild() {
    console.log('🚀 Criando build manual do Nexus...');
    
    try {
        // 1. Limpar diretório de build
        if (fs.existsSync(BUILD_DIR)) {
            fs.removeSync(BUILD_DIR);
        }
        fs.ensureDirSync(BUILD_DIR);
        
        // 2. Fazer build da aplicação
        console.log('📦 Compilando aplicação...');
        execSync('npm run build', { stdio: 'inherit' });
        
        // 3. Copiar arquivos essenciais
        console.log('📁 Copiando arquivos...');
        
        // Copiar dist/
        fs.copySync(DIST_DIR, path.join(BUILD_DIR, 'dist'));
        
        // Copiar package.json (simplificado)
        const originalPackage = require('../package.json');
        const simplifiedPackage = {
            name: originalPackage.name,
            version: originalPackage.version,
            description: originalPackage.description,
            main: originalPackage.main,
            dependencies: {
                // Apenas dependências essenciais para runtime
                "@radix-ui/react-dialog": originalPackage.dependencies["@radix-ui/react-dialog"],
                "@radix-ui/react-dropdown-menu": originalPackage.dependencies["@radix-ui/react-dropdown-menu"],
                "@radix-ui/react-tooltip": originalPackage.dependencies["@radix-ui/react-tooltip"],
                "react": originalPackage.dependencies.react,
                "react-dom": originalPackage.dependencies["react-dom"],
                "lucide-react": originalPackage.dependencies["lucide-react"],
                "clsx": originalPackage.dependencies.clsx
            }
        };
        
        fs.writeJsonSync(path.join(BUILD_DIR, 'package.json'), simplifiedPackage, { spaces: 2 });
        
        // 4. Copiar ícones
        if (fs.existsSync(path.join(__dirname, '..', 'assets'))) {
            fs.copySync(path.join(__dirname, '..', 'assets'), path.join(BUILD_DIR, 'assets'));
        }
        
        // 5. Criar script de inicialização
        const startScript = `@echo off
title Nexus - Task Manager
echo.
echo 🚀 Iniciando Nexus...
echo.

REM Verificar se Node.js está disponível
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js não encontrado!
    echo.
    echo Para usar o Nexus, você precisa instalar o Node.js:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Verificar se Electron está disponível
where npx >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ NPX não encontrado!
    echo Reinstale o Node.js com NPM incluído.
    pause
    exit /b 1
)

REM Instalar dependências se necessário
if not exist node_modules (
    echo 📦 Instalando dependências...
    npm install --production
)

REM Instalar Electron se necessário
if not exist node_modules/electron (
    echo ⚡ Instalando Electron...
    npm install electron@^26.6.10
)

REM Iniciar aplicação
echo ✅ Iniciando aplicação...
echo.
npx electron .

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Erro ao iniciar a aplicação.
    echo Verifique se todas as dependências estão instaladas.
    pause
)
`;
        
        fs.writeFileSync(path.join(BUILD_DIR, 'start.bat'), startScript);
        
        // 6. Criar README
        const readme = `# Nexus - Gerenciador de Tarefas

## 🚀 Como executar

### Método 1: Script automático (Recomendado)
1. Clique duas vezes em \`start.bat\`
2. Aguarde a instalação automática das dependências
3. A aplicação será iniciada automaticamente

### Método 2: Manual
1. Instale o Node.js (se não tiver): https://nodejs.org/
2. Abra o terminal nesta pasta
3. Execute: \`npm install --production\`
4. Execute: \`npm install electron@^26.6.10\`
5. Execute: \`npx electron .\`

## 📋 Requisitos

- **Node.js 16+** (obrigatório)
- **Windows 10+** (recomendado)
- **4GB RAM** (mínimo)

## ✨ Funcionalidades

✅ Gerenciamento de tarefas avançado
✅ Sistema de categorias personalizáveis  
✅ Timer Pomodoro integrado
✅ Relatórios e estatísticas
✅ Sistema de notas vinculadas
✅ Assistente IA (configurável)
✅ Verificação automática de atualizações
✅ Interface dark mode
✅ Backup e sincronização

## 🔄 Atualizações

A aplicação verifica automaticamente por atualizações.
Quando disponível, você será notificado e poderá baixar
a nova versão do GitHub Releases.

## 📧 Suporte

Para suporte, visite: https://github.com/SEU-USUARIO/nexus/issues

---

**Versão:** ${originalPackage.version}
**Data:** ${new Date().toLocaleDateString('pt-BR')}
**Build:** Manual (${new Date().toISOString()})
`;
        
        fs.writeFileSync(path.join(BUILD_DIR, 'README.md'), readme);
        
        // 7. Criar arquivo de versão
        const versionInfo = {
            version: originalPackage.version,
            buildDate: new Date().toISOString(),
            buildType: 'manual',
            platform: 'win32'
        };
        
        fs.writeJsonSync(path.join(BUILD_DIR, 'version.json'), versionInfo, { spaces: 2 });
        
        console.log('✅ Build manual criado com sucesso!');
        console.log(`📁 Local: ${BUILD_DIR}`);
        console.log('');
        console.log('📋 O que foi criado:');
        console.log('   ✅ dist/ - Aplicação compilada');
        console.log('   ✅ package.json - Dependências simplificadas');
        console.log('   ✅ start.bat - Script de inicialização');
        console.log('   ✅ README.md - Instruções de uso');
        console.log('   ✅ version.json - Informações da versão');
        console.log('');
        console.log('🚀 Para testar:');
        console.log(`   cd "${BUILD_DIR}"`);
        console.log('   start.bat');
        console.log('');
        console.log('📦 Para distribuir:');
        console.log('   1. Comprima a pasta manual-build como ZIP');
        console.log('   2. Faça upload para GitHub Releases');
        console.log('   3. Usuários baixam, extraem e executam start.bat');
        
    } catch (error) {
        console.error('❌ Erro durante o build manual:', error.message);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    createManualBuild();
}

module.exports = { createManualBuild };