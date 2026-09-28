import { createCanvas, loadImage } from '@napi-rs/canvas';

export default async function handler(req, res) {
  const data = req.method === 'POST' ? req.body : req.query;
  const shein = data?.shein || '-';
  const title = data?.title || 'منتج شي إن';
  const price = data?.price || '-';
  const sizes = data?.sizes || '-';
  const colors = data?.colors || '-';
  const imageUrl = data?.imageUrl || '';

  try {
    const width = 700;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. الخلفية العامة
    ctx.fillStyle = '#f8f7f3';
    ctx.fillRect(0, 0, width, height);

    // 2. الهيدر العلوي (Black Header)
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, width, 68);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Syria • SheIn', 25, 42);

    ctx.fillStyle = '#d4b46a';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(shein, width - 25, 42);
    ctx.textAlign = 'left';

    // 3. منطقة صورة المنتج (الجانب الأيسر)
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
        // في حال تعثر تحميل رابط الصورة المباشر
      }
    }

    // 4. منطقة التفاصيل (الجانب الأيمن)
    const infoX = 420;
    let currentY = 110;

    // العنوان
    ctx.fillStyle = '#161616';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(title.substring(0, 30), infoX, currentY);

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
    ctx.font = '12px sans-serif';
    ctx.fillText('السعر', infoX + 15, currentY + 25);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`${price} `, infoX + 15, currentY + 58);

    ctx.fillStyle = '#d4b46a';
    ctx.font = '14px sans-serif';
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
    ctx.font = '11px sans-serif';
    ctx.fillText('المقاسات', infoX + 12, currentY + 20);

    ctx.fillStyle = '#111111';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(sizes, infoX + 12, currentY + 40);

    // مربع الألوان
    currentY += 62;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(infoX, currentY, 255, 52, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#999999';
    ctx.font = '11px sans-serif';
    ctx.fillText('الألوان', infoX + 12, currentY + 20);

    ctx.fillStyle = '#111111';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(colors, infoX + 12, currentY + 40);

    // الفوتر
    currentY += 75;
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('SheIn • Syria', infoX, currentY);

    // استخراج الصورة وتصديرها
    const imageBuffer = canvas.toBuffer('image/jpeg');

    res.setHeader('Content-Type', 'image/jpeg');
    return res.status(200).send(imageBuffer);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
