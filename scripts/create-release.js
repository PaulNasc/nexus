/**
 * Script para criar release do Nexus
 * Comprime o build manual para distribuição
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const MANUAL_BUILD_DIR = path.join(__dirname, '..', 'manual-build');
const RELEASES_DIR = path.join(__dirname, '..', 'releases');

async function createRelease() {
    const packageJson = require('../package.json');
    const version = packageJson.version;
    const releaseDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    console.log(`🚀 Criando release do Nexus v${version}...`);
    
    try {
        // 1. Verificar se build manual existe
        if (!fs.existsSync(MANUAL_BUILD_DIR)) {
            console.log('📦 Build manual não encontrado. Criando...');
            execSync('node scripts/manual-build.js', { stdio: 'inherit' });
        }
        
        // 2. Criar diretório de releases
        fs.ensureDirSync(RELEASES_DIR);
        
        // 3. Nome do arquivo de release
        const releaseFileName = `Nexus-v${version}-Windows-Portable.zip`;
        const releasePath = path.join(RELEASES_DIR, releaseFileName);
        
        // 4. Verificar se PowerShell está disponível para compressão
        console.log('📦 Comprimindo build...');
        try {
            // Usando PowerShell para criar ZIP (nativo no Windows)
            const psCommand = `Compress-Archive -Path "${MANUAL_BUILD_DIR}\\*" -DestinationPath "${releasePath}" -Force`;
            execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' });
            
            console.log('✅ Release criado com sucesso!');
            
        } catch (psError) {
            // Fallback: Copiar pasta com nome de release
            console.log('⚠️ PowerShell Compress-Archive falhou. Criando cópia da pasta...');
            const releaseFolderPath = path.join(RELEASES_DIR, `Nexus-v${version}-Windows-Portable`);
            
            if (fs.existsSync(releaseFolderPath)) {
                fs.removeSync(releaseFolderPath);
            }
            
            fs.copySync(MANUAL_BUILD_DIR, releaseFolderPath);
            console.log('✅ Pasta de release criada!');
        }
        
        // 5. Criar arquivo de informações do release
        const releaseInfo = {
            name: `Nexus v${version}`,
            version: version,
            buildDate: releaseDate,
            platform: 'Windows',
            type: 'Portable',
            requirements: [
                'Windows 10 ou superior',
                'Node.js 16+ (será instalado automaticamente se necessário)',
                '4GB RAM mínimo',
                '100MB espaço em disco'
            ],
            features: [
                'Gerenciamento avançado de tarefas',
                'Sistema de categorias personalizáveis',
                'Timer Pomodoro integrado',
                'Relatórios e estatísticas',
                'Sistema de notas vinculadas',
                'Assistente IA configurável',
                'Verificação automática de atualizações',
                'Interface dark mode',
                'Backup e sincronização'
            ],
            installation: [
                '1. Extrair o arquivo ZIP',
                '2. Executar start.bat',
                '3. Aguardar instalação automática das dependências',
                '4. Aplicação será iniciada automaticamente'
            ],
            changelog: [
                '• Implementação do sistema de distribuição',
                '• Ícones criados com gradiente do Nexus',
                '• Sistema de atualizações via GitHub Releases',
                '• Títulos padronizados em todas as abas',
                '• Ícone IA com atualização em tempo real',
                '• Categorias corrigidas no modal de tarefas',
                '• Build otimizado sem dependências problemáticas'
            ],
            size_mb: 'Aproximadamente 150MB após instalação',
            github_url: 'https://github.com/PauloHYBEX/nexus',
            support_url: 'https://github.com/PauloHYBEX/nexus/issues'
        };
        
        fs.writeJsonSync(
            path.join(RELEASES_DIR, `release-info-v${version}.json`),
            releaseInfo,
            { spaces: 2 }
        );
        
        // 6. Criar changelog em markdown
        const changelogMd = `# Nexus v${version} - Release Notes

**Data de Lançamento:** ${releaseDate}
**Tipo:** Versão Portável para Windows

## 🆕 Novidades

${releaseInfo.changelog.map(item => item).join('\n')}

## 💿 Instalação

${releaseInfo.installation.map((step, i) => `${i + 1}. ${step.replace(/^\d+\.\s*/, '')}`).join('\n')}

## 📋 Requisitos do Sistema

${releaseInfo.requirements.map(req => `- ${req}`).join('\n')}

## ✨ Funcionalidades Principais

${releaseInfo.features.map(feature => `- ${feature}`).join('\n')}

## 📞 Suporte

- **Issues/Bugs:** ${releaseInfo.support_url}
- **Repositório:** ${releaseInfo.github_url}

## 📊 Informações Técnicas

- **Tamanho:** ${releaseInfo.size_mb}
- **Plataforma:** ${releaseInfo.platform}
- **Arquitetura:** x64
- **Tipo de Build:** Portável (não requer instalação)

---

**Download:** [Nexus-v${version}-Windows-Portable.zip](./releases/${releaseFileName})
`;
        
        fs.writeFileSync(
            path.join(RELEASES_DIR, `CHANGELOG-v${version}.md`),
            changelogMd
        );
        
        // 7. Relatório final
        console.log('');
        console.log('🎯 Release Summary:');
        console.log(`📁 Local: ${RELEASES_DIR}`);
        console.log(`📦 Arquivo: ${releaseFileName}`);
        console.log(`📋 Versão: v${version}`);
        console.log(`📅 Data: ${releaseDate}`);
        console.log('');
        console.log('📋 Arquivos criados:');
        
        const releaseFiles = fs.readdirSync(RELEASES_DIR);
        releaseFiles.forEach(file => {
            const filePath = path.join(RELEASES_DIR, file);
            const stats = fs.statSync(filePath);
            const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
            console.log(`   ✅ ${file} (${sizeMB}MB)`);
        });
        
        console.log('');
        console.log('🚀 Próximos passos para distribuição:');
        console.log('   1. Criar repositório no GitHub');
        console.log('   2. Fazer push do código');
        console.log('   3. Criar release no GitHub com tag v' + version);
        console.log('   4. Fazer upload do arquivo ZIP');
        console.log('   5. Copiar changelog para descrição do release');
        
    } catch (error) {
        console.error('❌ Erro durante criação do release:', error.message);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    createRelease();
}

module.exports = { createRelease };