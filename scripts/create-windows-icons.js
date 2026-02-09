/**
 * Script para criar ícones Windows (.ico) a partir do SVG
 */

const fs = require('fs-extra');
const path = require('path');

async function createWindowsIcons() {
    console.log('🎨 Criando ícones Windows (.ico)...');
    
    try {
        const assetsDir = path.join(__dirname, '..', 'assets');
        
        // Template SVG do ícone Nexus
        const iconSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="nexusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00D4AA;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7B3FF2;stop-opacity:1" />
    </linearGradient>
    <filter id="textShadow">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>
  
  <!-- Background circle with gradient -->
  <circle cx="128" cy="128" r="120" fill="url(#nexusGradient)" stroke="none"/>
  
  <!-- Letter N -->
  <text x="128" y="128" 
        font-family="Arial, sans-serif" 
        font-size="140" 
        font-weight="bold" 
        text-anchor="middle" 
        dominant-baseline="central" 
        fill="#FFFFFF" 
        filter="url(#textShadow)">N</text>
</svg>`;

        // Criar diferentes tamanhos de SVG
        const sizes = [16, 24, 32, 48, 64, 128, 256];
        
        for (const size of sizes) {
            const sizedSVG = iconSVG.replace(/width="256" height="256"/, `width="${size}" height="${size}"`);
            await fs.writeFile(path.join(assetsDir, `icon_${size}x${size}.svg`), sizedSVG);
        }
        
        // Criar favicon básico (PNG data URI para ICO)
        const icoContent = `
// Fallback ICO file - Use online converter for production
// This is a placeholder - for production, convert SVG to ICO using:
// https://convertio.co/svg-ico/
// Or use electron-builder which handles conversion automatically
`;
        
        await fs.writeFile(path.join(assetsDir, 'icon-creation-instructions.txt'), `
# Instruções para Criação do Ícone ICO

## Método 1: Conversão Online (Recomendado)
1. Vá para https://convertio.co/svg-ico/
2. Faça upload do arquivo 'icon_256x256.svg'
3. Baixe como 'icon.ico'
4. Substitua o arquivo 'icon.ico' na pasta assets/

## Método 2: Electron Builder (Automático)
O electron-builder converte automaticamente SVG para ICO durante o build.
Configure no package.json:
{
  "build": {
    "win": {
      "icon": "assets/icon_256x256.svg"
    }
  }
}

## Método 3: ImageMagick (Linha de comando)
Se tiver ImageMagick instalado:
magick convert icon_256x256.svg icon.ico

## Tamanhos incluídos no ICO:
- 16x16 (menu do sistema)
- 24x24 (barra de tarefas pequena) 
- 32x32 (barra de tarefas normal)
- 48x48 (área de trabalho)
- 64x64 (alta resolução)
- 128x128 (muito alta resolução)
- 256x256 (máxima qualidade)
`);
        
        // Criar ícone temporário usando base64 do SVG
        const svgBuffer = Buffer.from(iconSVG);
        const base64SVG = svgBuffer.toString('base64');
        
        // Criar um pequeno HTML para visualizar o ícone
        const previewHTML = `<!DOCTYPE html>
<html>
<head>
    <title>Nexus Icon Preview</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            background: #f0f0f0; 
        }
        .icon-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .icon-item {
            text-align: center;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .icon-item img {
            display: block;
            margin: 0 auto 10px auto;
        }
    </style>
</head>
<body>
    <h1>Nexus - Prévia do Ícone</h1>
    <p>Este é o ícone que será usado na distribuição do Nexus.</p>
    
    <div class="icon-grid">
        <div class="icon-item">
            <img src="data:image/svg+xml;base64,${base64SVG}" width="16" height="16" alt="16x16">
            <div>16x16</div>
        </div>
        <div class="icon-item">
            <img src="data:image/svg+xml;base64,${base64SVG}" width="24" height="24" alt="24x24">
            <div>24x24</div>
        </div>
        <div class="icon-item">
            <img src="data:image/svg+xml;base64,${base64SVG}" width="32" height="32" alt="32x32">
            <div>32x32</div>
        </div>
        <div class="icon-item">
            <img src="data:image/svg+xml;base64,${base64SVG}" width="48" height="48" alt="48x48">
            <div>48x48</div>
        </div>
        <div class="icon-item">
            <img src="data:image/svg+xml;base64,${base64SVG}" width="64" height="64" alt="64x64">
            <div>64x64</div>
        </div>
        <div class="icon-item">
            <img src="data:image/svg+xml;base64,${base64SVG}" width="128" height="128" alt="128x128">
            <div>128x128</div>
        </div>
    </div>
    
    <h2>Características do Ícone:</h2>
    <ul>
        <li>✅ Formato vetorial (SVG) para máxima qualidade</li>
        <li>✅ Gradiente oficial do Nexus (teal → purple)</li>
        <li>✅ Letra "N" em fonte bold e limpa</li>
        <li>✅ Sombra sutil para profundidade</li>
        <li>✅ Fundo circular moderno</li>
        <li>✅ Compatível com todos os tamanhos</li>
    </ul>
    
    <h2>Uso:</h2>
    <p>Para usar este ícone na distribuição:</p>
    <ol>
        <li>Converta o SVG para ICO usando as instruções na pasta assets/</li>
        <li>Configure no package.json do electron-builder</li>
        <li>O ícone aparecerá na barra de tarefas, área de trabalho e menus</li>
    </ol>
</body>
</html>`;
        
        await fs.writeFile(path.join(assetsDir, 'icon-preview.html'), previewHTML);
        
        console.log('✅ Ícones Windows criados com sucesso!');
        console.log(`📁 Local: ${assetsDir}`);
        console.log('');
        console.log('📋 Arquivos criados:');
        console.log('   ✅ SVGs em vários tamanhos (16x16 até 256x256)');
        console.log('   ✅ Instruções para conversão ICO');
        console.log('   ✅ Prévia HTML do ícone');
        console.log('');
        console.log('🔗 Para converter para ICO:');
        console.log('   1. Abra icon-preview.html no navegador');
        console.log('   2. Siga as instruções em icon-creation-instructions.txt');
        console.log('   3. Ou use electron-builder para conversão automática');
        
    } catch (error) {
        console.error('❌ Erro ao criar ícones:', error.message);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    createWindowsIcons();
}

module.exports = { createWindowsIcons };