/*
  Icon generator: generate PNGs from SVG using sharp (if available), then build ICO via png-to-ico.
  Base SVG: assets/icon.svg

  Run: node assets/generate-icons.js
*/
const fs = require('fs');
const path = require('path');

async function ensurePngsFromSvg(baseSvg, outDir) {
  const fs = require('fs');
  // Prefer resvg (no native deps)
  try {
    const { Resvg } = require('@resvg/resvg-js');
    const svg = fs.readFileSync(baseSvg);
    // Generate multiple sizes for ICO (16, 32, 48, 64, 128, 256) + 512 for high-res
    const sizes = [16, 32, 48, 64, 128, 256, 512];
    for (const size of sizes) {
      const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();
      const outPath = path.join(outDir, `icon-${size}.png`);
      fs.writeFileSync(outPath, pngBuffer);
      console.log('[icons] wrote', outPath, `(${pngBuffer.length} bytes)`);
    }
    // Also replace legacy names to ensure consistency
    fs.copyFileSync(path.join(outDir, 'icon-256.png'), path.join(outDir, 'icon.png'));
    fs.copyFileSync(path.join(outDir, 'icon-512.png'), path.join(outDir, 'icon@2x.png'));
    return true;
  } catch (e) {
    console.warn('[icons] Failed to rasterize SVG with resvg:', e?.message || e);
  }
  return false;
}

async function main() {
  let pngToIco;
  try {
    pngToIco = require('png-to-ico');
  } catch {
    console.error('Missing dependency: png-to-ico. Install with: npm i -D png-to-ico');
    process.exit(1);
  }

  const outDir = path.resolve(__dirname);
  const baseSvg = path.join(outDir, 'icon.svg');

  // Sempre tente regenerar PNGs a partir do SVG para garantir arquivos válidos
  if (fs.existsSync(baseSvg)) {
    await ensurePngsFromSvg(baseSvg, outDir);
  }

  // ICO format supports max 256x256 — use all sizes up to 256
  const icoSizes = [16, 32, 48, 64, 128, 256];
  const inputs = icoSizes
    .map(s => path.join(outDir, `icon-${s}.png`))
    .filter(p => fs.existsSync(p));
  if (inputs.length === 0) {
    // Fallback to legacy names
    if (fs.existsSync(path.join(outDir, 'icon-256.png'))) inputs.push(path.join(outDir, 'icon-256.png'));
  }
  if (inputs.length === 0) {
    console.error('[icons] No PNG files found for ICO generation');
    process.exit(1);
  }
  const icoBuffer = await pngToIco(inputs);
  fs.writeFileSync(path.join(outDir, 'icon.ico'), icoBuffer);
  console.log('[icons] ICO generated at', path.join(outDir, 'icon.ico'), `(${icoBuffer.length} bytes, ${inputs.length} sizes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});



