import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';

let isFontLoaded = false;

// جلب خط Tajawal المباشر بدعم أرقام وحروف كاملة
async function loadFonts() {
  if (isFontLoaded) return;
  try {
    const [boldRes, regRes] = await Promise.all([
      fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Bold.ttf'),
      fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Regular.ttf')
    ]);

    if (boldRes.ok && regRes.ok) {
      GlobalFonts.register(Buffer.from(await boldRes.arrayBuffer()), 'TajawalBold');
      GlobalFonts.register(Buffer.from(await regRes.arrayBuffer()), 'TajawalReg');
      isFontLoaded = true;
    }
  } catch (error) {
    console.error('فشل تحميل الخطوط:', error.message);
  }
}

// دالة تنظيف كود شي إن وتحويله إلى Base36 قصير
function processSheinCode(rawCode) {
  if (!rawCode || rawCode === '-') return '-';
  let cleaned = String(rawCode).trim();
  
  cleaned = cleaned.replace(/^shein/i, '').replace(/mo$/i, '').trim();
  
  const num = Number(cleaned);
  if (!isNaN(num) && num > 0) {
    return num.toString(36).toUpperCase();
  }
  return cleaned.toUpperCase();
}

// دالة تقسيم النص وتلفيفه تلقائياً لأسطر متعددة (Word Wrap)
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

export default async function handler(req, res) {
  await loadFonts();
  const fontBold = isFontLoaded ? 'TajawalBold' : 'sans-serif';
  const fontReg = isFontLoaded ? 'TajawalReg' : 'sans-serif';

  let data = {};
  try {
    if (req.body) {
      data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }
  } catch (e) {}
  data = { ...req.query, ...data };

  const rawShein = data.shein || '-';
  const shortCode = processSheinCode(rawShein);

  const title = (data.title || 'منتج شي إن').trim();
  const price = data.reply || data.price || '-';
  const sizes = data.sizes || '-';
  const colorsText = data.colors || '';
  const attributesText = data.attributes || '';
  let imageUrl = data.file_id || '';

  try {
    const scale = 2;
    const baseW = 500;
    const baseH = 920;

    const canvas = createCanvas(baseW * scale, baseH * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // خلفية البطاقة
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, baseW, baseH);

    // 1. الهيدر (HEADER)
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, baseW, 55);

    // شعار Syria • SheIn
    ctx.textAlign = 'left';
    ctx.font = `900 18px ${fontBold}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Syria ', 20, 34);
    const syriaWidth = ctx.measureText('Syria ').width;

    ctx.fillStyle = '#d4b46a';
    ctx.fillText('•', 20 + syriaWidth, 34);
    const dotWidth = ctx.measureText('• ').width;

    ctx.fillStyle = '#ffffff';
    ctx.fillText(' SheIn', 20 + syriaWidth + dotWidth, 34);

    // رقم المنتج
    if (shortCode && shortCode !== '-') {
      ctx.textAlign = 'right';
      ctx.font = `600 13px ${fontBold}`;
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('رقم المنتج', baseW - 20, 33);
      const labelW = ctx.measureText('رقم المنتج').width;

      const spacedCode = shortCode.split('').join(' ');
      ctx.font = `900 14px ${fontBold}`;
      const codeW = ctx.measureText(spacedCode).width;

      const pillW = codeW + 20;
      const pillH = 30;
      const pillX = baseW - 25 - labelW - pillW;
      const pillY = 12;

      ctx.fillStyle = '#222222';
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 15);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(spacedCode, pillX + (pillW / 2), pillY + 20);
    }

    let currentY = 70;

    // 2. صورة المنتج
    const margin = 20;
    const imgW = baseW - (margin * 2);
    const imgH = 460;
    const imgX = margin;
    const imgY = currentY;

    ctx.fillStyle = '#eae6df';
    ctx.beginPath();
    ctx.roundRect(imgX, imgY, imgW, imgH, 12);
    ctx.fill();

    if (imageUrl) {
      try {
        const cleanImageUrl = imageUrl
          .replace(/\.avif(\?.*)?$/i, '.jpg$1')
          .replace(/_thumbnail_\d+x\d*/i, '_thumbnail_450x');

        const imgRes = await fetch(cleanImageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        if (imgRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          const img = await loadImage(imgBuffer);
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(imgX, imgY, imgW, imgH, 12);
          ctx.clip();
          
          // رسم الصورة بتناسب الحجم (Cover)
          const imgRatio = img.width / img.height;
          const rectRatio = imgW / imgH;
          let sx, sy, sw, sh;
          if (imgRatio > rectRatio) {
            sh = img.height;
            sw = img.height * rectRatio;
            sx = (img.width - sw) / 2;
            sy = 0;
          } else {
            sw = img.width;
            sh = img.width / rectRatio;
            sx = 0;
            sy = (img.height - sh) / 2;
          }
          ctx.drawImage(img, sx, sy, sw, sh, imgX, imgY, imgW, imgH);
          ctx.restore();
        }
      } catch (err) {
        console.error('خطأ جلب الصورة:', err.message);
      }
    }

    ctx.strokeStyle = '#e0ded8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(imgX, imgY, imgW, imgH, 12);
    ctx.stroke();

    currentY += imgH + 15;

    // 3. عنوان المنتج
    ctx.textAlign = 'center';
    ctx.fillStyle = '#111111';
    ctx.font = `700 15px ${fontBold}`;

    const titleLines = wrapText(ctx, title, imgW - 20).slice(0, 2);
    titleLines.forEach(line => {
      ctx.fillText(line, baseW / 2, currentY);
      currentY += 20;
    });

    currentY += 10;

    // 4. صندوق السعر
    const priceBoxH = 50;
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.roundRect(margin, currentY, imgW, priceBoxH, 10);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#888888';
    ctx.font = `400 9px ${fontReg}`;
    ctx.fillText('السعر', baseW / 2, currentY + 14);

    ctx.fillStyle = '#e5be69';
    ctx.font = `900 20px ${fontBold}`;
    ctx.fillText(`${price} ل.س`, baseW / 2, currentY + 38);

    currentY += priceBoxH + 12;

    // 5. صناديق المقاسات والألوان المتجاورة
    const gap = 12;
    const subBoxW = (imgW - gap) / 2;
    const boxH = 70;

    // الألوان (يمين)
    const colorsBoxX = margin + subBoxW + gap;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e8e6e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(colorsBoxX, currentY, subBoxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#999999';
    ctx.font = `400 10px ${fontReg}`;
    ctx.fillText('الألوان المتوفرة', colorsBoxX + (subBoxW / 2), currentY + 20);

    ctx.fillStyle = '#222222';
    ctx.font = `700 11px ${fontBold}`;
    const displayColor = colorsText ? colorsText.split('-')[0].trim() : 'متعدد الألوان';
    ctx.fillText(displayColor, colorsBoxX + (subBoxW / 2), currentY + 48);

    // المقاسات (يسار)
    const sizesBoxX = margin;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e8e6e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(sizesBoxX, currentY, subBoxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#999999';
    ctx.font = `400 10px ${fontReg}`;
    ctx.fillText('المقاسات المتوفرة', sizesBoxX + (subBoxW / 2), currentY + 20);

    ctx.fillStyle = '#111111';
    ctx.font = `800 12px ${fontBold}`;
    ctx.fillText(String(sizes), sizesBoxX + (subBoxW / 2), currentY + 48);

    currentY += boxH + 12;

    // 6. صندوق التفاصيل
    const attrBoxH = 50;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e8e6e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(margin, currentY, imgW, attrBoxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#111111';
    ctx.font = `700 11px ${fontBold}`;
    ctx.fillText('تفاصيل المنتج', baseW / 2, currentY + 20);

    ctx.fillStyle = '#777777';
    ctx.font = `400 10px ${fontReg}`;
    ctx.fillText(attributesText || 'غير متوفر', baseW / 2, currentY + 38);

    // 7. الفوتر السفلي (ديناميكي)
    const footerY = baseH - 30;

    ctx.textAlign = 'left';
    ctx.font = `900 11px ${fontBold}`;
    ctx.fillStyle = '#111111';
    ctx.fillText('SheIn ', margin, footerY);
    const fSheinW = ctx.measureText('SheIn ').width;

    ctx.fillStyle = '#d4b46a';
    ctx.fillText('•', margin + fSheinW, footerY);
    const fDotW = ctx.measureText('• ').width;

    ctx.fillStyle = '#111111';
    ctx.fillText(' Syria', margin + fSheinW + fDotW, footerY);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#aaaaaa';
    ctx.font = `400 10px ${fontReg}`;
    ctx.fillText('اطلبها بسهولة واستلمها عندك', baseW - margin, footerY);

    // تصدير الصورة
    const imageBuffer = canvas.toBuffer('image/png');
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(imageBuffer);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
