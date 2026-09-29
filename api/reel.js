import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import tmp from 'tmp';

ffmpeg.setFfmpegPath(ffmpegStatic);
const SUPABASE_URL = 'https://cxnttqtavbqhpnslkamr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4bnR0cXRhdmJxaHBuc2xrYW1yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDcwNDY5NywiZXhwIjoyMTA2MjgwNjk3fQ.Qi72S7IpsJksYj2nFRZPJbzQWSCG5-3vuU7HoUb_hj4';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // استقبال رابط الصورة المسحوبة من screenshot API
  const imageUrl = req.query.imageUrl;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing imageUrl parameter' });
  }

  const tmpImg = tmp.fileSync({ postfix: '.jpg' });
  const tmpVideo = tmp.fileSync({ postfix: '.mp4' });

  try {
    // 1. جلب الصورة الموالدة من رابط screenshot تلقائياً
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('فشل جلب الصورة من API السكرين شوت');

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(tmpImg.name, Buffer.from(arrayBuffer));

    // 2. تحويل الصورة إلى MP4 مدته 3 ثوانٍ
    await new Promise((resolve, reject) => {
      ffmpeg(tmpImg.name)
        .inputOptions(['-loop 1'])
        .outputOptions([
          '-c:v libx264',
          '-t 3',
          '-pix_fmt yuv420p',
          '-r 30',
          '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2'
        ])
        .save(tmpVideo.name)
        .on('end', resolve)
        .on('error', reject);
    });

    // 3. رفع الفيديو إلى Supabase Storage
    const videoBuffer = fs.readFileSync(tmpVideo.name);
    const fileName = `reels/reel_${Date.now()}.mp4`;

    const { error } = await supabase.storage
      .from('media')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('media')
      .getPublicUrl(fileName);

    // تنظيف الملفات المؤقتة
    tmpImg.removeCallback();
    tmpVideo.removeCallback();

// 4. إرجاع رابط الفيديو مع اسم الملف لـ PHP
return res.status(200).json({
  success: true,
  video_url: publicUrlData.publicUrl,
  file_name: fileName // <--- إرجاع مسار الملف لحذفه لاحقاً
});


  } catch (err) {
    tmpImg.removeCallback();
    tmpVideo.removeCallback();
    return res.status(500).json({ success: false, error: err.message });
  }
}
