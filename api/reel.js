import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import tmp from 'tmp';

ffmpeg.setFfmpegPath(ffmpegStatic);
const SUPABASE_URL = 'https://cxnttqtavbqhpnslkamr.supabase.co';//[span_0](start_span)[span_0](end_span)
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4bnR0cXRhdmJxaHBuc2xrYW1yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDcwNDY5NywiZXhwIjoyMTA2MjgwNjk3fQ.Qi72S7IpsJksYj2nFRZPJbzQWSCG5-3vuU7HoUb_hj4';//[span_1](start_span)[span_1](end_span)

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);//[span_2](start_span)[span_2](end_span)

export default async function handler(req, res) {
  const imageUrl = req.query.imageUrl;//[span_3](start_span)[span_3](end_span)

  if (!imageUrl) {//[span_4](start_span)[span_4](end_span)
    return res.status(400).json({ error: 'Missing imageUrl parameter' });//[span_5](start_span)[span_5](end_span)
  }

  // 1. اختيار رقم عشوائي بين 1 و 17
  const randomNumber = Math.floor(Math.random() * 17) + 1;
  const randomAudioUrl = `https://noqta.sy/song/${randomNumber}.mp3`;
  const randomImageUrl = `https://noqta.sy/song/${randomNumber}.jpg`;

  const tmpImgMain = tmp.fileSync({ postfix: '.jpg' });
  const tmpImgRandom = tmp.fileSync({ postfix: '.jpg' });
  const tmpAudio = tmp.fileSync({ postfix: '.mp3' });
  const tmpVideo = tmp.fileSync({ postfix: '.mp4' });//[span_6](start_span)[span_6](end_span)

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
        // المدخل 0: صورة السكرين شوت (تستمر 4.8 ثانية لتغطية زمن الترانزيشن)
        .input(tmpImgMain.name)
        .inputOptions(['-loop 1', '-t 4.8'])

        // المدخل 1: الصورة العشوائية (1.5 ثانية)
        .input(tmpImgRandom.name)
        .inputOptions(['-loop 1', '-t 1.5'])

        // المدخل 2: الملف الصوتي (6 ثوانٍ)
        .input(tmpAudio.name)

        .complexFilter([
          // ضبط المقاسات والصيغة للصورة الأولى
          '[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p[v0]',
          
          // ضبط المقاسات والصيغة للصورة الثانية
          '[1:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p[v1]',
          
          // تطبيق انتقال xfade ناعم عند الثانية 4.5 بمدة 0.3 ثانية
          '[v0][v1]xfade=transition=fade:duration=0.3:offset=4.5[outv]',

          // خفض الصوت تدريجياً (Fade Out) من الثانية 5 إلى 6
          '[2:a]afade=t=out:st=5:d=1[outa]'
        ])
        .outputOptions([
          '-map [outv]',
          '-map [outa]',
          '-c:v libx264',
          '-c:a aac',
          '-t 6',               // المدة الإجمالية 6 ثوانٍ
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
    const videoBuffer = fs.readFileSync(tmpVideo.name);//[span_7](start_span)[span_7](end_span)
    const fileName = `reels/reel_${Date.now()}.mp4`;//[span_8](start_span)[span_8](end_span)

    const { error } = await supabase.storage
      .from('media')//[span_9](start_span)[span_9](end_span)
      .upload(fileName, videoBuffer, {//[span_10](start_span)[span_10](end_span)
        contentType: 'video/mp4',//[span_11](start_span)[span_11](end_span)
        upsert: true//[span_12](start_span)[span_12](end_span)
      });

    if (error) throw error;//[span_13](start_span)[span_13](end_span)

    const { data: publicUrlData } = supabase.storage
      .from('media')//[span_14](start_span)[span_14](end_span)
      .getPublicUrl(fileName);//[span_15](start_span)[span_15](end_span)

    // تنظيف الملفات المؤقتة
    tmpImgMain.removeCallback();
    tmpImgRandom.removeCallback();
    tmpAudio.removeCallback();
    tmpVideo.removeCallback();//[span_16](start_span)[span_16](end_span)

    return res.status(200).json({//[span_17](start_span)[span_17](end_span)
      success: true,//[span_18](start_span)[span_18](end_span)
      video_url: publicUrlData.publicUrl,//[span_19](start_span)[span_19](end_span)
      file_name: fileName,//[span_20](start_span)[span_20](end_span)
      used_index: randomNumber
    });

  } catch (err) {
    tmpImgMain.removeCallback();
    tmpImgRandom.removeCallback();
    tmpAudio.removeCallback();
    tmpVideo.removeCallback();//[span_21](start_span)[span_21](end_span)
    return res.status(500).json({ success: false, error: err.message });//[span_22](start_span)[span_22](end_span)
  }
}
