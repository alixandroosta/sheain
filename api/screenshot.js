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

// دالة رسم الصورة بطريقة Cover
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
  const title = (data.title || 'منتج شي إن').slice(0, 150);
  const price = data.reply || data.price || '-';
  const sizes = data.sizes || '-';
  const colorsText = data.colors || '';
  const attributesText = data.attributes || '';
  const imageUrl = data.imageUrl || (data.file_id ? `https://html-to-image-api-six.vercel.app/telegram_image.php?file_id=${data.file_id}` : '');

  try {
    // 1. إعداد دقة الكانفاس بـ Scale 2 لضمان الوضوح العالي (1400x1200)
    const scale = 2;
    const baseW = 700;
    const baseH = 600;

    const canvas = createCanvas(baseW * scale, baseH * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // 2. خلفية البطاقة الأساسية والديكورات الدائرية
    ctx.fillStyle = '#f8f7f3';
    ctx.fillRect(0, 0, baseW, baseH);

    // الدائرة الذهبية الشفافة أعلى اليسار
    ctx.fillStyle = 'rgba(212, 180, 106, 0.10)';
    ctx.beginPath();
    ctx.arc(-100 + 130, -130 + 130, 130, 0, Math.PI * 2);
    ctx.fill();

    // الدائرة الداكنة الشفافة أسفل اليمين
    ctx.fillStyle = 'rgba(17, 17, 17, 0.04)';
    ctx.beginPath();
    ctx.arc(baseW - 70 + 100, baseH + 100 - 100, 100, 0, Math.PI * 2);
    ctx.fill();

    // 3. الهيدر (HEADER)
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, baseW, 68);

    // شعار Syria • SheIn
    ctx.font = `900 21px ${fontBold}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Syria ', 25, 42);
    const syriaWidth = ctx.measureText('Syria ').width;

    ctx.fillStyle = '#d4b46a';
    ctx.fillText('•', 25 + syriaWidth, 42);
    const dotWidth = ctx.measureText('• ').width;

    ctx.fillStyle = '#ffffff';
    ctx.fillText(' SheIn', 25 + syriaWidth + dotWidth, 42);

    // كود المنتج (Product Code Pill)
    if (shein && shein !== '-') {
      ctx.font = `600 16px ${fontBold}`;
      const codeText = String(shein);
      const textW = ctx.measureText(codeText).width;
      const pillW = textW + 24;
      const pillH = 32;
      const pillX = baseW - 25 - pillW;
      const pillY = 18;

      ctx.strokeStyle = '#555555';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 16);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(codeText, pillX + (pillW / 2), pillY + 22);
      ctx.textAlign = 'left';
    }

    // 4. جانب الصورة (IMAGE SIDE - 410px)
    const imgSideW = 410;
    const imgX = 16;
    const imgY = 68 + 16;
    const imgW = imgSideW - 32; // 378px
    const imgH = baseH - 68 - 32; // 500px

    ctx.fillStyle = '#e9e7e2';
    ctx.fillRect(imgX, imgY, imgW, imgH);

    if (imageUrl) {
      try {
        const img = await loadImage(imageUrl);
        drawImageCover(ctx, img, imgX, imgY, imgW, imgH);
      } catch (err) {
        console.error('خطأ جلب الصورة:', err.message);
      }
    }

    // الإطار الداخلي الأنيق للصورة
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1;
    ctx.strokeRect(imgX + 10, imgY + 10, imgW - 20, imgH - 20);

    // 5. جانب البيانات (INFO SIDE)
    const rightMargin = baseW - 18; // 682px
    const boxW = 244;
    const boxX = rightMargin - boxW;
    let currentY = 68 + 20;

    ctx.textAlign = 'right';

    // عنوان المنتج
    ctx.fillStyle = '#161616';
    ctx.font = `600 14px ${fontBold}`;
    ctx.fillText(title, rightMargin, currentY + 12);
    currentY += 25;

    // الخط الذهبي
    ctx.fillStyle = '#d4b46a';
    ctx.fillRect(rightMargin - 45, currentY, 45, 3);
    currentY += 18;

    // صندوق السعر
    const priceBoxH = 65;
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.roundRect(boxX, currentY, boxW, priceBoxH, 14);
    ctx.fill();

    ctx.fillStyle = '#aaaaaa';
    ctx.font = `400 10px ${fontReg}`;
    ctx.fillText('السعر', rightMargin - 15, currentY + 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 26px ${fontBold}`;
    ctx.fillText(String(price), rightMargin - 15, currentY + 50);

    const priceTextW = ctx.measureText(String(price)).width;
    ctx.fillStyle = '#d4b46a';
    ctx.font = `600 12px ${fontBold}`;
    ctx.fillText('ل.س', rightMargin - 20 - priceTextW, currentY + 50);

    currentY += priceBoxH + 13;

    // صندوق المقاسات
    const sizeBoxH = 48;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e6e3dc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX, currentY, boxW, sizeBoxH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#999999';
    ctx.font = `400 9px ${fontReg}`;
    ctx.fillText('المقاسات المتوفرة', rightMargin - 11, currentY + 18);

    ctx.fillStyle = '#222222';
    ctx.font = `800 12px ${fontBold}`;
    ctx.fillText(String(sizes), rightMargin - 11, currentY + 36);

    currentY += sizeBoxH + 9;

    // صندوق الألوان (مع دوائر الألوان)
    const hasColors = colorsText && colorsText !== 'لون واحد' && colorsText !== 'غير متوفر';
    const colorBoxH = hasColors ? 68 : 48;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(boxX, currentY, boxW, colorBoxH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#888888';
    ctx.font = `600 8px ${fontReg}`;
    ctx.fillText('الألوان المتوفرة', rightMargin - 11, currentY + 16);

    if (hasColors) {
      const colorsList = colorsText.split('-').map(x => x.trim()).filter(Boolean);
      let dotX = rightMargin - 22;
      const dotY = currentY + 32;

      // رسم دوائر الألوان
      colorsList.forEach(name => {
        const firstWord = name.split(' ')[0];
        const hex = colorMap[firstWord] || colorMap[name] || '#999999';

        ctx.save();
        ctx.fillStyle = hex;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 9, 0, Math.PI * 2);
        ctx.fill();

        // إطار أبيض وحلقة رمادية
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = '#cfcfcf';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        dotX -= 24;
      });

      // أسماء الألوان أسفل الدوائر
      ctx.fillStyle = '#888888';
      ctx.font = `600 8px ${fontReg}`;
      ctx.fillText(colorsText, rightMargin - 11, currentY + 56);
    } else {
      ctx.fillStyle = '#222222';
      ctx.font = `800 12px ${fontBold}`;
      ctx.fillText(colorsText || '-', rightMargin - 11, currentY + 36);
    }

    currentY += colorBoxH + 9;

    // صندوق التفاصيل (ATTRIBUTES BOX)
    if (attributesText) {
      const lines = attributesText.split(/\r\n|\r|\n/).map(x => x.trim().replace(/^•\s*/, '')).filter(Boolean);
      const attrBoxH = 25 + (lines.length * 18);

      ctx.fillStyle = '#eeece6';
      ctx.beginPath();
      ctx.roundRect(boxX, currentY, boxW, attrBoxH, 12);
      ctx.fill();

      ctx.fillStyle = '#222222';
      ctx.font = `900 10px ${fontBold}`;
      ctx.fillText('تفاصيل المنتج', rightMargin - 12, currentY + 18);

      let lineY = currentY + 34;
      ctx.font = `400 9px ${fontReg}`;
      ctx.fillStyle = '#666666';

      lines.forEach((line, idx) => {
        ctx.fillText(line, rightMargin - 12, lineY);
        if (idx < lines.length - 1) {
          ctx.strokeStyle = 'rgba(0,0,0,0.07)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(rightMargin - 12, lineY + 4);
          ctx.lineTo(boxX + 12, lineY + 4);
          ctx.stroke();
        }
        lineY += 18;
      });
    }

    // الفوتر (FOOTER)
    const footerY = baseH - 22;
    ctx.strokeStyle = '#ddd9d0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(boxX, footerY - 14);
    ctx.lineTo(rightMargin, footerY - 14);
    ctx.stroke();

    // Brand
    ctx.textAlign = 'left';
    ctx.font = `900 11px ${fontBold}`;
    ctx.fillStyle = '#111111';
    ctx.fillText('SheIn ', boxX, footerY);
    const sheinW = ctx.measureText('SheIn ').width;

    ctx.fillStyle = '#d4b46a';
    ctx.fillText('•', boxX + sheinW, footerY);
    const dotW2 = ctx.measureText('• ').width;

    ctx.fillStyle = '#111111';
    ctx.fillText(' Syria', boxX + sheinW + dotW2, footerY);

    // Text Right
    ctx.textAlign = 'right';
    ctx.fillStyle = '#999999';
    ctx.font = `400 8px ${fontReg}`;
    ctx.fillText('اطلبها بسهولة واستلمها عندك', rightMargin, footerY);

    // تصدير الصورة بجودة PNG عالية
    const imageBuffer = canvas.toBuffer('image/png');
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(imageBuffer);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
