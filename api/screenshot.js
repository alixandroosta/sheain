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

// خريطة الألوان المطابقة للسكربت في تصميمك
const colorMap = {
  'وردي فاتح': '#f8bbd0', 'ذهبي': '#d4b46a', 'فضي': '#c0c0c0',
  "أحمر": "#FF3B30", "احمر": "#FF3B30", "أزرق": "#007AFF", "ازرق": "#007AFF", 
  "كحلي": "#002060", "سماوي": "#87CEEB", "أصفر": "#FFCC00", "اصفر": "#FFCC00",
  "أبيض": "#FFFFFF", "ابيض": "#FFFFFF", "أسود": "#000000", "اسود": "#000000",
  "أخضر": "#34C759", "اخضر": "#34C759", "زيتي": "#556B2F", "وردي": "#FF69B4", 
  "روز": "#FFB6C1", "زهري": "#FFB6C1", "بني": "#8B4513", "بيج": "#F5F5DC",
  "رمادي": "#808080", "رصاصي": "#808080", "خمري": "#800020", "عنابي": "#800020",
  "بنفسجي": "#AF52DE", "موف": "#E0B0FF", "برتقالي": "#FF9500",
  'الذهبي': '#d4b46a', 'الفضي': '#c0c0c0',
  "الأحمر": "#FF3B30", "الاحمر": "#FF3B30", "الأزرق": "#007AFF", "الازرق": "#007AFF", 
  "الكحلي": "#002060", "السماوي": "#87CEEB", "الأصفر": "#FFCC00", "الاصفر": "#FFCC00",
  "الأبيض": "#FFFFFF", "الابيض": "#FFFFFF", "الأسود": "#000000", "الاسود": "#000000",
  "الأخضر": "#34C759", "الاخضر": "#34C759", "الزيتي": "#556B2F", "الوردي": "#FF69B4", 
  "الروز": "#FFB6C1", "الزهري": "#FFB6C1", "البني": "#8B4513", "البيج": "#F5F5DC",
  "الرمادي": "#808080", "الرصاصي": "#808080", "الخمري": "#800020", "العنابي": "#800020",
  "البنفسجي": "#AF52DE", "الموف": "#E0B0FF", "البرتقالي": "#FF9500"
};

// دالة رسم الصورة بالكامل دون قص (Contain)
function drawImageContain(ctx, img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const rectRatio = w / h;
  let renderW, renderH, renderX, renderY;

  if (imgRatio > rectRatio) {
    renderW = w;
    renderH = w / imgRatio;
    renderX = x;
    renderY = y + (h - renderH) / 2;
  } else {
    renderH = h;
    renderW = h * imgRatio;
    renderY = y;
    renderX = x + (w - renderW) / 2;
  }

  ctx.drawImage(img, renderX, renderY, renderW, renderH);
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

    // 1. خلفية البطاقة الأساسية (الرمادي الداكن المطفأ)
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, baseW, baseH);

    // 2. الهيدر (HEADER)
    ctx.fillStyle = '#1e1e1e';
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

      ctx.fillStyle = '#2a2a2a';
      ctx.strokeStyle = '#3d3d3d';
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

    // 3. صورة المنتج (تظهر بالكامل بدون أي اقتطاع)
    const margin = 20;
    const imgW = baseW - (margin * 2);
    const imgH = 460;
    const imgX = margin;
    const imgY = currentY;

    // خلفية حقل الصورة
    ctx.fillStyle = '#1a1a1a';
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
          
          // رسم الصورة كاملة باستخدام Contain
          drawImageContain(ctx, img, imgX, imgY, imgW, imgH);
          ctx.restore();
        }
      } catch (err) {
        console.error('خطأ جلب الصورة:', err.message);
      }
    }

    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(imgX, imgY, imgW, imgH, 12);
    ctx.stroke();

    currentY += imgH + 15;

    // 4. عنوان المنتج
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 15px ${fontBold}`;

    const titleLines = wrapText(ctx, title, imgW - 20).slice(0, 2);
    titleLines.forEach(line => {
      ctx.fillText(line, baseW / 2, currentY);
      currentY += 20;
    });

    currentY += 10;

    // 5. صندوق السعر
    const priceBoxH = 50;
    ctx.fillStyle = '#1e1e1e';
    ctx.beginPath();
    ctx.roundRect(margin, currentY, imgW, priceBoxH, 10);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#aaaaaa';
    ctx.font = `400 9px ${fontReg}`;
    ctx.fillText('السعر', baseW / 2, currentY + 14);

    ctx.fillStyle = '#e5be69';
    ctx.font = `900 20px ${fontBold}`;
    ctx.fillText(`${price} ل.س`, baseW / 2, currentY + 38);

    currentY += priceBoxH + 12;

    // 6. صناديق المقاسات والألوان المتجاورة
    const gap = 12;
    const subBoxW = (imgW - gap) / 2;
    const boxH = 70;

    // --- الألوان (يمين) - مع رسم دوائر الألوان الملونة ---
    const colorsBoxX = margin + subBoxW + gap;
    ctx.fillStyle = '#1e1e1e';
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(colorsBoxX, currentY, subBoxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#aaaaaa';
    ctx.font = `400 10px ${fontReg}`;
    ctx.fillText('الألوان المتوفرة', colorsBoxX + (subBoxW / 2), currentY + 18);

    const hasColors = colorsText && colorsText !== 'لون واحد' && colorsText !== 'غير متوفر';

    if (hasColors) {
      const colorsList = colorsText.split('-').map(x => x.trim()).filter(Boolean);
      const maxDots = 5;
      const displayColors = colorsList.slice(0, maxDots);
      
      const totalWidth = displayColors.length * 20;
      let startX = colorsBoxX + (subBoxW / 2) + (totalWidth / 2) - 10;
      const dotY = currentY + 44;

      displayColors.forEach(name => {
        const firstWord = name.split(' ')[0];
        const hex = colorMap[firstWord] || colorMap[name] || '#888888';

        ctx.save();
        ctx.fillStyle = hex;
        ctx.beginPath();
        ctx.arc(startX, dotY, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#1e1e1e';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        startX -= 20;
      });
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 11px ${fontBold}`;
      ctx.fillText(colorsText || 'لون واحد', colorsBoxX + (subBoxW / 2), currentY + 46);
    }

    // --- المقاسات (يسار) ---
    const sizesBoxX = margin;
    ctx.fillStyle = '#1e1e1e';
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(sizesBoxX, currentY, subBoxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#aaaaaa';
    ctx.font = `400 10px ${fontReg}`;
    ctx.fillText('المقاسات المتوفرة', sizesBoxX + (subBoxW / 2), currentY + 18);

    ctx.fillStyle = '#ffffff';
    ctx.font = `800 12px ${fontBold}`;
    ctx.fillText(String(sizes), sizesBoxX + (subBoxW / 2), currentY + 46);

    currentY += boxH + 12;

    // 7. صندوق التفاصيل
    const attrBoxH = 50;
    ctx.fillStyle = '#1e1e1e';
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(margin, currentY, imgW, attrBoxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 11px ${fontBold}`;
    ctx.fillText('تفاصيل المنتج', baseW / 2, currentY + 20);

    ctx.fillStyle = '#aaaaaa';
    ctx.font = `400 10px ${fontReg}`;
    ctx.fillText(attributesText || 'غير متوفر', baseW / 2, currentY + 38);

    // 8. الفوتر السفلي
    const footerY = baseH - 30;

    ctx.textAlign = 'left';
    ctx.font = `900 11px ${fontBold}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SheIn ', margin, footerY);
    const fSheinW = ctx.measureText('SheIn ').width;

    ctx.fillStyle = '#d4b46a';
    ctx.fillText('•', margin + fSheinW, footerY);
    const fDotW = ctx.measureText('• ').width;

    ctx.fillStyle = '#ffffff';
    ctx.fillText(' Syria', margin + fSheinW + fDotW, footerY);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#888888';
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
