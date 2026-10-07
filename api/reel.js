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
  const imageUrl = req.query.imageUrl;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing imageUrl parameter' });
  }

  // 1. اختيار رقم عشوائي بين 1 و 17
  const randomNumber = Math.floor(Math.random() * 17) + 1;
  const randomAudioUrl = `https://noqta.sy/song/${randomNumber}.mp3`;
  const randomImageUrl = `https://noqta.sy/song/${randomNumber}.jpg`;

  const tmpImgMain = tmp.fileSync({ postfix: '.jpg' });
  const tmpImgRandom = tmp.fileSync({ postfix: '.jpg' });
  const tmpAudio = tmp.fileSync({ postfix: '.mp3' });
  const tmpVideo = tmp.fileSync({ postfix: '.mp4' });

  try {
    // 2. جلب الملفات
    const resMain = await fetch(imageUrl);
    if (!resMain.ok) throw new Error('فشل جلب صورة السكرين شوت');
    fs.writeFileSync(tmpImgMain.name, Buffer.from(await resMain.arrayBuffer()));

    const resRandom = await fetch(randomImageUrl);
    if (!resRandom.ok) throw new Error(`فشل جلب الصورة العشوائية رقم ${randomNumber}`);
    fs.writeFileSync(tmpImgRandom.name, Buffer.from(await resRandom.arrayBuffer()));

    const resAudio = await fetch(randomAudioUrl);
    if (!resAudio.ok) throw new Error(`فشل جلب ملف الصوت رقم ${randomNumber}`);
    fs.writeFileSync(tmpAudio.name, Buffer.from(await resAudio.arrayBuffer()));

    // 3. معالجة الفيديو بواسطة FFmpeg
    await new Promise((resolve, reject) => {
      ffmpeg()
        // المدخل 0: صورة السكرين شوت (4.8 ثانية لتغطية زمن الانتقال)
        .input(tmpImgMain.name)
        .inputOptions(['-loop 1', '-t 4.8'])

        // المدخل 1: الصورة العشوائية (1.5 ثانية)
        .input(tmpImgRandom.name)
        .inputOptions(['-loop 1', '-t 1.5'])

        // المدخل 2: الملف الصوتي
        .input(tmpAudio.name)

        .complexFilter([
          // تكبير الصورة الأولى لعرض 1080 وتوسيطها في إطار طولي 1080x1920
          '[0:v]scale=1080:-1,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1,format=yuv420p[v0]',
          
          // تكبير الصورة الثانية لعرض 1080 وتوسيطها في إطار طولي 1080x1920
          '[1:v]scale=1080:-1,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1,format=yuv420p[v1]',
          
          // دمج الصورتين عبر xfade عند الثانية 4.5 بمدة 0.3 ثانية
          '[v0][v1]xfade=transition=fade:duration=0.3:offset=4.5[outv]',

          // خفض الصوت تدريجياً (Fade Out) من الثانية 5 إلى 6
          '[2:a]afade=t=out:st=5:d=1[outa]'
        ])
        .outputOptions([
          '-map [outv]',
          '-map [outa]',
          '-c:v libx264',
          '-c:a aac',
          '-t 6',
          '-pix_fmt yuv420p',
          '-r 30'
        ])
        .save(tmpVideo.name)
        .on('end', resolve)
        .on('error', (err) => {
          console.error('FFmpeg Error:', err);
          reject(err);
        });
    });

    // 4. رفع الفيديو الناتج إلى Supabase
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
    tmpImgMain.removeCallback();
    tmpImgRandom.removeCallback();
    tmpAudio.removeCallback();
    tmpVideo.removeCallback();

    return res.status(200).json({
      success: true,
      video_url: publicUrlData.publicUrl,
      file_name: fileName,
      used_index: randomNumber
    });

  } catch (err) {
    tmpImgMain.removeCallback();
    tmpImgRandom.removeCallback();
    tmpAudio.removeCallback();
    tmpVideo.removeCallback();
    return res.status(500).json({ success: false, error: err.message });
  }
}
