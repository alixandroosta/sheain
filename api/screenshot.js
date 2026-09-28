import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  const data = req.method === 'POST' ? req.body : req.query;
  const shein = data?.shein || '';
  const title = data?.title || '';
  const price = data?.price || '';
  const sizes = data?.sizes || '';
  const colors = data?.colors || '';
  const imageUrl = data?.imageUrl || '';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; background: #f8f7f3; width: 700px; height: 600px; display: flex; flex-direction: column; }
        .card-header { height: 68px; padding: 0 25px; display: flex; align-items: center; justify-content: space-between; background: #111; color: white; }
        .logo { font-size: 21px; font-weight: 900; }
        .logo span { color: #d4b46a; }
        .header-label { font-size: 18px; font-weight: 600; border: 1px solid #555; border-radius: 30px; padding: 6px 12px; }
        .main { height: calc(100% - 68px); display: flex; direction: ltr; }
        .image-side { width: 410px; height: 100%; padding: 16px; flex-shrink: 0; }
        .image-container { width: 100%; height: 100%; background: #e9e7e2; }
        .image-container img { width: 100%; height: 100%; object-fit: cover; }
        .info-side { flex: 1; direction: rtl; padding: 20px 18px; display: flex; flex-direction: column; justify-content: space-between; }
        .product-title { font-size: 14px; font-weight: 600; color: #161616; }
        .gold-line { width: 45px; height: 3px; background: #d4b46a; margin: 8px 0 18px 0; }
        .price-box { background: #111; color: white; padding: 13px 15px; border-radius: 14px; }
        .price { font-size: 28px; font-weight: 900; }
        .currency { color: #d4b46a; font-size: 12px; }
        .detail { background: white; border: 1px solid #e6e3dc; border-radius: 12px; padding: 9px 11px; margin-top: 10px; }
        .detail-value { font-weight: 800; font-size: 12px; }
        .footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #ddd9d0; padding-top: 8px; }
      </style>
    </head>
    <body>
      <div class="card-header">
        <div class="logo">Syria <span>•</span> SheIn</div>
        <div class="header-label">${shein || '-'}</div>
      </div>
      <div class="main">
        <div class="image-side">
          <div class="image-container">
            <img src="${imageUrl}" alt="Product">
          </div>
        </div>
        <div class="info-side">
          <div>
            <div class="product-title">${title || 'منتج شي إن'}</div>
            <div class="gold-line"></div>
            <div class="price-box">
              <div style="font-size:10px; color:#aaa;">السعر</div>
              <div class="price">${price || '-'} <span class="currency">ل.س</span></div>
            </div>
            <div class="detail">
              <div style="font-size:9px; color:#999;">المقاسات</div>
              <div class="detail-value">${sizes || '-'}</div>
            </div>
            <div class="detail">
              <div style="font-size:9px; color:#999;">الألوان</div>
              <div class="detail-value">${colors || '-'}</div>
            </div>
          </div>
          <div class="footer">
            <div style="font-weight:900; font-size:11px;">SheIn <span>•</span> Syria</div>
            <div style="font-size:8px; color:#999;">اطلبها بسهولة واستلمها عندك</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    // جلب ملف المتصفح الشامل مع جميع المكتبات الناقصة
    const executablePath = await chromium.executablePath(
      'https://github.com/sparticuz/chromium/releases/download/v126.0.0/chromium-v126.0.0-pack.tar'
    );

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 700, height: 600 },
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const imageBuffer = await page.screenshot({ type: 'jpeg', quality: 85 });
    await browser.close();

    res.setHeader('Content-Type', 'image/jpeg');
    return res.status(200).send(imageBuffer);

  } catch (error) {
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
