// 🧭 PL4TO - Générateur d'icônes PWA (SVG + PNG)
// Exécuter avec: node generate-icons.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tailles d'icônes requises pour PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// SVG de base pour l'icône PL4TO (Anneau doré sur fond blanc)
const generateSvgIcon = (size) => {
  const center = size / 2;
  const outerRadius = size * 0.43;
  const innerRadius = size * 0.33;
  const ringRadius = size * 0.225;
  const ringStroke = Math.max(4, size / 23);
  const centerDot = size * 0.063;
  const cornerRadius = size * 0.15;
  
  // Calculer la flèche nord
  const arrowTip = center - ringRadius - ringStroke * 0.8;
  const arrowBase = center - ringRadius + ringStroke * 1.2;
  const arrowMid = center - ringRadius + ringStroke * 0.6;
  const arrowWidth = ringStroke * 0.6;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradient doré uniforme (sans rouge) -->
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffd700"/>
      <stop offset="50%" style="stop-color:#ffb800"/>
      <stop offset="100%" style="stop-color:#ffa500"/>
    </linearGradient>
  </defs>
  
  <rect width="${size}" height="${size}" fill="white" rx="${cornerRadius}"/>
  <circle cx="${center}" cy="${center}" r="${outerRadius}" fill="url(#goldGradient)"/>
  <circle cx="${center}" cy="${center}" r="${innerRadius}" fill="white"/>
  <circle cx="${center}" cy="${center}" r="${ringRadius}" fill="none" stroke="url(#goldGradient)" stroke-width="${ringStroke}"/>
  <circle cx="${center}" cy="${center}" r="${centerDot}" fill="url(#goldGradient)"/>
  <path d="M${center} ${arrowTip} L${center + arrowWidth} ${arrowBase} L${center} ${arrowMid} L${center - arrowWidth} ${arrowBase} Z" fill="url(#goldGradient)"/>
</svg>`;
};

// Créer le dossier icons s'il n'existe pas
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Générer les icônes SVG
console.log('\n🧭 Génération des icônes SVG...\n');
sizes.forEach(size => {
  const svg = generateSvgIcon(size);
  const filename = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`✅ Généré: icon-${size}x${size}.svg`);
});

// Essayer de générer les PNG avec sharp si disponible
async function generatePngIcons() {
  try {
    const sharp = (await import('sharp')).default;
    console.log('\n🎨 Sharp détecté! Génération des PNG...\n');
    
    for (const size of sizes) {
      const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
      const pngPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(pngPath);
      
      console.log(`✅ Généré: icon-${size}x${size}.png`);
    }
    
    console.log('\n🎉 Toutes les icônes PNG ont été générées!');
    console.log('\n📱 Les icônes sont prêtes pour iOS et Android.');
    
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      console.log('\n⚠️  Sharp non installé - PNG non générés.');
      console.log('\nPour générer les PNG automatiquement:');
      console.log('  npm install sharp');
      console.log('  node generate-icons.js');
    } else {
      console.error('\n❌ Erreur lors de la génération PNG:', err.message);
    }
  }
}

generatePngIcons();
