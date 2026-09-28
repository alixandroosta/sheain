import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';

let isFontLoaded = false;

// جلب وتسجيل خط عربي لضمان ظهور النصوص على Vercel
async function loadArabicFont() {
  if (isFontLoaded) return;
  try {
    const response = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/tajawal@latest/arabic-700-normal.ttf');
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      GlobalFonts.register(Buffer.from(arrayBuffer), 'Tajawal');
      isFontLoaded = true;
    }
  } catch (error) {
    console.error('فشل تحميل الخط العربي:', error.message);
  }
}

export default async function handler(req, res) {
  // 1. تحميل الخط العربي قبل الرسم
  await loadArabicFont();
  const fontFamily = isFontLoaded ? 'Tajawal' : 'sans-serif';

  // 2. قراءة البيانات الممررة عبر GET أو POST
  let data = {};
  try {
    if (req.body) {
      data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }
  } catch (e) {}
  data = { ...req.query, ...data };

  const shein = data.shein || data.code || '-';
  const title = data.title || data.name || 'منتج شي إن';
  const price = data.price || '-';
  const sizes = data.sizes || '-';
  const colors = data.colors || '-';
  const imageUrl = data.imageUrl || data.image || '';

  try {
    const width = 700;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. الخلفية العامة
    ctx.fillStyle = '#f8f7f3';
    ctx.fillRect(0, 0, width, height);

    // 2. الهيدر العلوي
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, width, 68);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 20px ${fontFamily}`;
    ctx.fillText('Syria • SheIn', 25, 42);

    ctx.fillStyle = '#d4b46a';
    ctx.font = `bold 16px ${fontFamily}`;
    ctx.textAlign = 'right';
    ctx.fillText(String(shein), width - 25, 42);
    ctx.textAlign = 'left';

    // 3. منطقة الصورة (الجانب الأيسر)
    const imgX = 16;
    const imgY = 68 + 16;
    const imgW = 380;
    const imgH = height - 68 - 32;

    ctx.fillStyle = '#e9e7e2';
    ctx.fillRect(imgX, imgY, imgW, imgH);

    if (imageUrl) {
      try {
        const img = await loadImage(imageUrl);
        ctx.drawImage(img, imgX, imgY, imgW, imgH);
      } catch (err) {
        console.error('تعذر جلب صورة المنتج:', err.message);
      }
    }

    // 4. منطقة التفاصيل والنصوص العربية (الجانب الأيمن)
    const infoX = 420;
    let currentY = 110;

    // عنوان المنتج
    ctx.fillStyle = '#161616';
    ctx.font = `bold 15px ${fontFamily}`;
    ctx.fillText(String(title).substring(0, 32), infoX, currentY);

    // الخط الذهبي
    currentY += 12;
    ctx.fillStyle = '#d4b46a';
    ctx.fillRect(infoX, currentY, 45, 3);

    // مربع السعر
    currentY += 25;
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.roundRect(infoX, currentY, 255, 75, 14);
    ctx.fill();

    ctx.fillStyle = '#aaaaaa';
    ctx.font = `12px ${fontFamily}`;
    ctx.fillText('السعر', infoX + 15, currentY + 25);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 24px ${fontFamily}`;
    ctx.fillText(`${price} `, infoX + 15, currentY + 58);

    ctx.fillStyle = '#d4b46a';
    ctx.font = `14px ${fontFamily}`;
    ctx.fillText('ل.س', infoX + 180, currentY + 58);

    // مربع المقاسات
    currentY += 90;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e6e3dc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(infoX, currentY, 255, 52, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#999999';
    ctx.font = `11px ${fontFamily}`;
    ctx.fillText('المقاسات', infoX + 12, currentY + 20);

    ctx.fillStyle = '#111111';
    ctx.font = `bold 13px ${fontFamily}`;
    ctx.fillText(String(sizes), infoX + 12, currentY + 40);

    // مربع الألوان
    currentY += 62;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(infoX, currentY, 255, 52, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#999999';
    ctx.font = `11px ${fontFamily}`;
    ctx.fillText('الألوان', infoX + 12, currentY + 20);

    ctx.fillStyle = '#111111';
    ctx.font = `bold 13px ${fontFamily}`;
    ctx.fillText(String(colors), infoX + 12, currentY + 40);

    // الفوتر
    currentY += 75;
    ctx.fillStyle = '#111111';
    ctx.font = `bold 12px ${fontFamily}`;
    ctx.fillText('SheIn • Syria', infoX, currentY);

    // تصدير الصورة
    const imageBuffer = canvas.toBuffer('image/jpeg');

    res.setHeader('Content-Type', 'image/jpeg');
    return res.status(200).send(imageBuffer);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
