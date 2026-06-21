const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function drawIcon(size) {
  const png = new PNG({ width: size, height: size });
  const radius = size * 0.19;
  const blue = [37, 99, 235];
  const darkBlue = [29, 78, 216];
  const white = [255, 255, 255];
  const lightBlue = [147, 197, 253];

  const inRoundedRect = (x, y, w, h, r) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    const corners = [
      [r, r], [w - r, r], [r, h - r], [w - r, h - r],
    ];
    for (const [cx, cy] of corners) {
      const nearX = (cx === r) ? x < r : x > w - r;
      const nearY = (cy === r) ? y < r : y > h - r;
      if (nearX && nearY) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy > r * r) return false;
      }
    }
    return true;
  };

  const cardX = size * 0.1875;
  const cardY = size * 0.34375;
  const cardW = size * 0.625;
  const cardH = size * 0.390625;
  const stripeH = size * 0.109375;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      let color = null;

      if (!inRoundedRect(x, y, size, size, radius)) {
        color = [243, 244, 246];
      } else {
        color = blue;

        const onCard = x >= cardX && x < cardX + cardW && y >= cardY && y < cardY + cardH;
        if (onCard) {
          color = white;
          if (y < cardY + stripeH) {
            color = darkBlue;
          } else {
            const lineY1 = cardY + size * 0.203125;
            const lineY2 = cardY + size * 0.27343;
            if (y >= lineY1 && y < lineY1 + size * 0.039 && x >= cardX + size * 0.0625 && x < cardX + size * 0.296875) {
              color = lightBlue;
            } else if (y >= lineY2 && y < lineY2 + size * 0.039 && x >= cardX + size * 0.0625 && x < cardX + size * 0.21875) {
              color = lightBlue;
            }
          }
        }
      }

      png.data[idx] = color[0];
      png.data[idx + 1] = color[1];
      png.data[idx + 2] = color[2];
      png.data[idx + 3] = 255;
    }
  }
  return png;
}

const outDir = path.join(__dirname, '..', 'public');
for (const size of [192, 512]) {
  const png = drawIcon(size);
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), buffer);
  console.log(`wrote icon-${size}.png`);
}
