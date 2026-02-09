/**
 * Gerador de Ícones Simples para Nexus
 * Cria ícones SVG que podem ser convertidos para outros formatos
 */

const fs = require('fs');
const path = require('path');

// Cores do Nexus
const COLORS = {
    teal: '#00D4AA',
    purple: '#7B3FF2',
    white: '#FFFFFF'
};

function createSVGIcon(size) {
    const radius = Math.floor(size * 0.45);
    const center = size / 2;
    const fontSize = Math.floor(size * 0.6);
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="nexusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${COLORS.teal};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${COLORS.purple};stop-opacity:1" />
    </linearGradient>
    <filter id="textShadow">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>
  
  <!-- Fundo circular com gradiente -->
  <circle cx="${center}" cy="${center}" r="${radius}" fill="url(#nexusGradient)" stroke="rgba(255,255,255,0.2)" stroke-width="${Math.max(1, size/128)}"/>
  
  <!-- Letra N estilizada -->
  <text x="${center}" y="${center}" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        font-weight="bold" 
        text-anchor="middle" 
        dominant-baseline="central" 
        fill="${COLORS.white}" 
        filter="url(#textShadow)">N</text>
</svg>`;
}

function createFaviconICO() {
    // Criar um ICO básico de 32x32 pixels (formato simplificado)
    const size = 32;
    const iconData = Buffer.alloc(size * size * 4); // RGBA
    
    // Criar um ícone circular simples
    const center = size / 2;
    const radius = Math.floor(size * 0.4);
    
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - center;
            const dy = y - center;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const index = (y * size + x) * 4;
            
            if (distance <= radius) {
                // Dentro do círculo - aplicar gradiente
                const ratio = distance / radius;
                const r = Math.floor(0x00 * (1 - ratio) + 0x7B * ratio);
                const g = Math.floor(0xD4 * (1 - ratio) + 0x3F * ratio);
                const b = Math.floor(0xAA * (1 - ratio) + 0xF2 * ratio);
                
                iconData[index] = r;     // R
                iconData[index + 1] = g; // G
                iconData[index + 2] = b; // B
                iconData[index + 3] = 255; // A
            } else {
                // Fora do círculo - transparente
                iconData[index] = 0;
                iconData[index + 1] = 0;
                iconData[index + 2] = 0;
                iconData[index + 3] = 0;
            }
        }
    }
    
    return iconData;
}

function main() {
    console.log('🚀 Criando ícones Nexus...');
    
    // Criar diretório assets
    const assetsDir = path.join(__dirname, 'assets');
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }
    
    // Tamanhos para criar
    const sizes = [512, 256, 128, 64, 32, 16];
    
    sizes.forEach(size => {
        const svg = createSVGIcon(size);
        const filename = path.join(assetsDir, `icon_${size}x${size}.svg`);
        fs.writeFileSync(filename, svg);
        console.log(`✅ Criado: ${filename}`);
    });
    
    // Criar ícone principal
    const mainIcon = createSVGIcon(512);
    fs.writeFileSync(path.join(assetsDir, 'icon.svg'), mainIcon);
    console.log('✅ Criado: assets/icon.svg (ícone principal)');
    
    // Criar README com instruções
    const readme = `# Ícones Nexus

Ícones criados automaticamente baseados no design da aplicação.

## Cores utilizadas:
- Teal: ${COLORS.teal}
- Purple: ${COLORS.purple}
- Gradiente: Linear de teal para purple

## Conversão necessária:

### Para Windows (ICO):
1. Use icon_256x256.svg ou icon_512x512.svg
2. Converta para PNG em https://convertio.co/svg-png/
3. Converta PNG para ICO em https://convertio.co/png-ico/
4. Renomeie para icon.ico

### Para macOS (ICNS):
1. Use icon_512x512.svg
2. Converta para PNG em https://convertio.co/svg-png/
3. Converta PNG para ICNS em https://convertio.co/png-icns/
4. Renomeie para icon.icns

### Para Linux (PNG):
1. Use icon_512x512.svg
2. Converta para PNG em https://convertio.co/svg-png/
3. Renomeie para icon.png

## Ferramentas recomendadas:
- https://convertio.co/ (conversor online)
- https://icoconvert.com/ (específico para ICO)
- ImageMagick (local): convert icon.svg icon.png
`;
    
    fs.writeFileSync(path.join(assetsDir, 'README.md'), readme);
    console.log('✅ Criado: assets/README.md');
    
    console.log('\n🎯 Ícones SVG criados com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Abra https://convertio.co/svg-png/');
    console.log('2. Converta os SVGs para PNG');
    console.log('3. Converta PNGs para ICO/ICNS conforme necessário');
    console.log('4. Coloque os arquivos finais em assets/ com nomes corretos');
}

if (require.main === module) {
    main();
}

module.exports = { createSVGIcon, COLORS };