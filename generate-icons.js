// 🧭 PL4TO - Générateur d'icônes PWA
// Exécuter avec: node generate-icons.js

const fs = require('fs');
const path = require('path');

// Tailles d'icônes requises pour PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// SVG de base pour l'icône PL4TO (O animé stylisé)
const generateSvgIcon = (size) => {
  const padding = size * 0.1;
  const center = size / 2;
  const radius = (size - padding * 2) / 2;
  const strokeWidth = Math.max(4, size / 15);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#040449" rx="${size * 0.15}"/>
  
  <!-- Outer glow -->
  <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="#ff8c00" stroke-width="${strokeWidth}" stroke-opacity="0.3"/>
  
  <!-- Main ring (golden gradient effect) -->
  <defs>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffd700"/>
      <stop offset="25%" style="stop-color:#ff8c00"/>
      <stop offset="50%" style="stop-color:#ff4500"/>
      <stop offset="75%" style="stop-color:#ff8c00"/>
      <stop offset="100%" style="stop-color:#ffd700"/>
    </linearGradient>
  </defs>
  
  <circle cx="${center}" cy="${center}" r="${radius * 0.85}" fill="none" stroke="url(#goldGradient)" stroke-width="${strokeWidth}"/>
  
  <!-- Inner highlight -->
  <circle cx="${center}" cy="${center}" r="${radius * 0.7}" fill="none" stroke="#ffd700" stroke-width="${strokeWidth * 0.5}" stroke-opacity="0.5"/>
  
  <!-- Center compass point -->
  <circle cx="${center}" cy="${center}" r="${radius * 0.15}" fill="#ffd700" opacity="0.8"/>
</svg>`;
};

// Créer le dossier icons s'il n'existe pas
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Générer les icônes SVG (peuvent être converties en PNG avec un outil)
sizes.forEach(size => {
  const svg = generateSvgIcon(size);
  const filename = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`✅ Généré: icon-${size}x${size}.svg`);
});

console.log('\\n🧭 Icônes SVG générées!');
console.log('\\nPour convertir en PNG, utilise un des outils suivants:');
console.log('1. https://cloudconvert.com/svg-to-png');
console.log('2. https://svgtopng.com/');
console.log('3. Inkscape (en ligne de commande ou GUI)');
console.log('\\nOu installe sharp: npm install sharp');
console.log('Puis modifie ce script pour utiliser sharp pour la conversion.');
