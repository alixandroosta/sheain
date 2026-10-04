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

// خريطة الألوان المطابقة للسكربت
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

// دالة رسم الصورة بطريقة Cover متناسقة
function drawImageCover(ctx, img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const rectRatio = w / h;
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
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
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

  const shein = data.shein || '-';
  const title = (data.title || 'منتج شي إن').trim();
  const price = data.reply || data.price || '-';
  const sizes = data.sizes || '-';
  const colorsText = data.colors || '';
  const attributesText = data.attributes || '';
  let imageUrl = data.file_id || '';

  try {
    // 1. أبعاد الكانفاس الطولية الخاصة بـ Reels / Story (1080x1920)
    const scale = 2;
    const baseW = 1080;
    const baseH = 1920;

    const canvas = createCanvas(baseW * scale, baseH * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // 2. خلفية البطاقة الداكنة الأنيقة
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, baseW, baseH);

    // لمسات ديكورية خلفية
    ctx.fillStyle = 'rgba(212, 180, 106, 0.05)';
    ctx.beginPath();
    ctx.arc(baseW / 2, 300, 400, 0, Math.PI * 2);
    ctx.fill();

    // 3. الهيدر (HEADER)
    const headerH = 110;
    ctx.fillStyle = '#161616';
    ctx.fillRect(0, 0, baseW, headerH);

    // شعار Syria • SheIn (يمين)
    ctx.textAlign = 'right';
    ctx.font = `900 36px ${fontBold}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Syria ', baseW - 50, 68);
    const syriaW = ctx.measureText('Syria ').width;

    ctx.fillStyle = '#d4b46a';
    ctx.fillText('•', baseW - 50 - syriaW, 68);
    const dotW = ctx.measureText('• ').width;

    ctx.fillStyle = '#ffffff';
    ctx.fillText(' SheIn', baseW - 50 - syriaW - dotW, 68);

    // كود المنتج (Product Code Pill) (يسار)
    if (shein && shein !== '-') {
      ctx.textAlign = 'center';
      ctx.font = `700 28px ${fontBold}`;
      const codeText = String(shein);
      const textW = ctx.measureText(codeText).width;
      const pillW = textW + 48;
      const pillH = 54;
      const pillX = 50;
      const pillY = 28;

      ctx.fillStyle = '#222222';
      ctx.strokeStyle = '#d4b46a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 27);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(codeText, pillX + (pillW / 2), pillY + 38);
    }

    let currentY = headerH + 35;

    // 4. عنوان المنتج (TITLE)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0f0f0';
    ctx.font = `700 34px ${fontBold}`;

    const titleLines = wrapText(ctx, title, baseW - 100).slice(0, 2);
    titleLines.forEach(line => {
      ctx.fillText(line, baseW / 2, currentY);
      currentY += 46;
    });

    currentY += 15;

    // 5. صورة المنتج الطولية (PRODUCT IMAGE - 450x599)
    const imgW = 880;
    const imgH = 900;
    const imgX = (baseW - imgW) / 2;
    const imgY = currentY;

    // خلفية مخصصة للصورة
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath();
    ctx.roundRect(imgX, imgY, imgW, imgH, 24);
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
          ctx.roundRect(imgX, imgY, imgW, imgH, 24);
          ctx.clip();
          drawImageCover(ctx, img, imgX, imgY, imgW, imgH);
          ctx.restore();
        }
      } catch (err) {
        console.error('خطأ تحميل الصورة:', err.message);
      }
    }

    // إطار رفيع حول الصورة
    ctx.strokeStyle = 'rgba(212, 180, 106, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(imgX, imgY, imgW, imgH, 24);
    ctx.stroke();

    currentY += imgH + 30;

    // 6. صندوق السعر والكود (PRICE CARD)
    const cardW = 880;
    const cardX = (baseW - cardW) / 2;

    const priceBoxH = 95;
    ctx.fillStyle = '#181818';
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX, currentY, cardW, priceBoxH, 20);
    ctx.fill();
    ctx.stroke();

    // نص السعر بالداخل
    ctx.textAlign = 'right';
    ctx.fillStyle = '#aaaaaa';
    ctx.font = `400 22px ${fontReg}`;
    ctx.fillText('السعر', cardX + cardW - 35, currentY + 38);

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 44px ${fontBold}`;
    ctx.fillText(String(price), cardX + cardW - 35, currentY + 76);

    const priceW = ctx.measureText(String(price)).width;
    ctx.fillStyle = '#d4b46a';
    ctx.font = `700 24px ${fontBold}`;
    ctx.fillText('ل.س', cardX + cardW - 45 - priceW, currentY + 74);

    // كود المنتج المصغر على اليسار داخل الصندوق
    ctx.textAlign = 'left';
    ctx.fillStyle = '#888888';
    ctx.font = `400 20px ${fontReg}`;
    ctx.fillText('كود القطعة:', cardX + 35, currentY + 38);

    ctx.fillStyle = '#d4b46a';
    ctx.font = `700 26px ${fontBold}`;
    ctx.fillText(String(shein), cardX + 35, currentY + 74);

    currentY += priceBoxH + 20;

    // 7. صندوق المقاسات والألوان (SIZES & COLORS)
    const optionsBoxH = 120;
    ctx.fillStyle = '#141414';
    ctx.strokeStyle = '#262626';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX, currentY, cardW, optionsBoxH, 20);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'right';

    // المقاسات
    ctx.fillStyle = '#888888';
    ctx.font = `400 20px ${fontReg}`;
    ctx.fillText('المقاسات المتوفرة:', cardX + cardW - 30, currentY + 42);

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 24px ${fontBold}`;
    ctx.fillText(String(sizes), cardX + cardW - 200, currentY + 42);

    // الألوان
    ctx.fillStyle = '#888888';
    ctx.font = `400 20px ${fontReg}`;
    ctx.fillText('الألوان المتوفرة:', cardX + cardW - 30, currentY + 90);

    ctx.fillStyle = '#d4b46a';
    ctx.font = `700 22px ${fontBold}`;
    ctx.fillText(colorsText || 'متعدد الألوان', cardX + cardW - 180, currentY + 90);

    // 8. الهامش السفلي الآمن (SAFE ZONE FOR REELS)
    // نترك المساحة المتبقية ($340\text{px}$) فارغة ونظيفة لمنع التداخل مع واجهة تطبيقات التواصل
    
    // تصدير الصورة بجودة PNG عالية
    const imageBuffer = canvas.toBuffer('image/png');
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(imageBuffer);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
