// One-shot: save the approved Qlipper 7-day trial batch to content_plans.
// Schedule: 2 posts/day for 7 days, 9am + 7pm Jakarta time (GMT+7),
// starting Wed May 28, 2026.

const STORAGE = 'http://localhost:3001';
const BRAND_ID = '1779856883804';
const START_UTC = Date.parse('2026-05-28T02:00:00Z'); // 09:00 Jakarta (WIB)
const EVENING_OFFSET_MS = 10 * 60 * 60 * 1000;        // +10 hours → 19:00 Jakarta
const DAY_MS = 24 * 60 * 60 * 1000;

const ideas = [
  { topic: 'Editing burnout, time wasted', headline: 'Ngedit cuplikan berjam-jam itu buang-buang hidup, kan?', format: 'hook', theme: 'dark',
    caption_draft: "Pernah gak sih ngerasa waktu kamu habis cuma buat motong-motong video panjang jadi short-form? Dari ratusan menit rekaman, harus pilah-pilih momen paling ciamik, terus edit lagi biar FYP-able. Capeknya itu lho. Energi buat bikin konten utama jadi terkuras habis.\n\nPadahal, tujuan utamanya kan biar kontenmu makin banyak yang nonton, bukan malah bikin kamu stres sendiri. Rasanya pengen ada yang otomatis aja gitu, biar kamu bisa fokus bikin ide-ide baru yang lebih seru.",
    hashtags: ['#QlipperAI','#KreatorKontenIndonesia','#EditorIndonesia','#ShortFormIndonesia','#FYPIndonesia'] },

  { topic: 'Automating short-form video creation', headline: 'Qlipper.ai: Bikin short-form video itu gampang banget.', format: 'cta', theme: 'light',
    caption_draft: "Bayangin, video panjangmu masuk, terus otomatis keluar puluhan short-form video siap FYP. Gak perlu lagi berjam-jam di depan timeline editing yang bikin mata capek. Qlipper.ai bakal jadi 'editor' AI pribadi kamu.\n\nFokus aja di konten utamamu, biarin Qlipper.ai yang urus sisanya. Kamu tinggal pilih, publish, dan lihat penontonmu nambah. Waktumu jauh lebih berharga daripada buat motong-motong doang.",
    hashtags: ['#QlipperAI','#VideoPendekAI','#KontenCreatorID','#CuplikanOtomatis','#ReelsIndonesia'] },

  { topic: 'Missing out on trends and reach', headline: 'Kontenmu tenggelam di antara jutaan video lain?', format: 'hook', theme: 'dark',
    caption_draft: "Udah capek-capek bikin konten panjang yang berkualitas, eh yang nonton cuma segitu-gitu aja. Padahal, algoritma sekarang sukanya short-form video yang cepat viral. Kalau kamu gak ikutan tren ini, kontenmu bisa-bisa cuma jadi arsip doang.\n\nSayang banget kan kalau ide-ide brilianmu gak sampai ke audience yang lebih luas. Mungkin kamu cuma perlu cara lain buat 'njemput' penonton baru lewat platform yang beda.",
    hashtags: ['#QlipperAI','#KreatorKontenIndonesia','#KontenViral','#FYPIndonesia','#EditorIndonesia'] },

  { topic: 'Expanding reach with AI-generated clips', headline: 'Gampang banget nambah followers pakai short-form AI.', format: 'stat', theme: 'light',
    caption_draft: "Jangan biarkan konten panjangmu cuma jadi konsumsi segelintir orang. Dengan Qlipper.ai, kamu bisa ubah 1 video panjang jadi 10-20 short-form video yang siap bersaing di TikTok, Reels, atau YouTube Shorts.\n\nIni cara paling efektif buat menjangkau audience baru dan ngajak mereka nonton konten panjangmu. Tinggal upload, biarin AI yang kerja, kamu tinggal liat pertumbuhan audience. Simpel, cepat, dan terbukti works.",
    hashtags: ['#QlipperAI','#ShortFormIndonesia','#YouTubeShortsID','#KreatorKontenIndonesia','#KontenCreatorID'] },

  { topic: 'Niche specific manual clipping pain (podcast/gaming)', headline: 'Momen penting di podcast/game-mu suka kelewat pas ngedit?', format: 'quote', theme: 'dark',
    caption_draft: "'Gila, ini episode podcast gue durasi 2 jam. Momen kocak atau insight pentingnya banyak banget. Tapi kalau harus nyari satu-satu buat dibikin short-form, bisa-bisa gue botak duluan!' Nah, siapa yang relate sama curhatan ini?\n\nBuat podcaster atau gamer, nyari 'golden nuggets' dari rekaman berjam-jam itu PR banget. Kadang momen epik malah gak sempat di-clip karena keburu pusing duluan. Padahal itu yang bisa bikin kontenmu viral.",
    hashtags: ['#QlipperAI','#KlipPodcast','#KlipGaming','#EditorIndonesia','#KomunitasKreatorID'] },

  { topic: 'AI precision for specific niches', headline: 'AI Qlipper.ai ngerti momen emas podcast/game-mu!', format: 'listicle', theme: 'light',
    caption_draft: "Gak perlu khawatir momen penting di podcast atau game live-mu kelewat lagi. Qlipper.ai pake AI canggih buat deteksi dan potongin otomatis highlights yang paling engaging.\n\nBayangin, momen lucu, argumen tajam, atau killstreak epic di game-mu langsung jadi short-form video siap share. Tinggal pilih, edit dikit kalau mau, langsung publish. Jadi, kamu bisa fokus di konten utama, urusan clip biar Qlipper.ai yang handle.",
    hashtags: ['#QlipperAI','#KlipPodcast','#KlipGaming','#CuplikanEdukasi','#KontenViral','#ShortFormIndonesia'] },

  { topic: 'Creator burnout and overwhelming tasks', headline: 'Jujur deh, kadang bikin konten itu bikin capek banget, kan?', format: 'hook', theme: 'dark',
    caption_draft: "Jadi kreator itu multitasking banget. Dari riset, syuting, ngedit video utama, mikirin SEO, sampai harus bikin short-form yang beda-beda buat tiap platform. Rasanya kayak semua kerjaan numpuk di kamu sendiri.\n\nUjung-ujungnya, ide jadi mampet, semangat bikin konten pun hilang. Padahal, awalnya kamu bikin konten karena passion, bukan? Jangan sampai kesibukan teknis kayak ngedit short-form ini bikin kamu burnout.",
    hashtags: ['#QlipperAI','#KreatorKontenIndonesia','#BurnoutCreator','#EditorIndonesia','#KontenCreatorID'] },

  { topic: 'Reclaiming joy and focus on main content', headline: 'Balikin lagi semangat bikin kontenmu bareng Qlipper.ai.', format: 'cta', theme: 'light',
    caption_draft: "Stop capek sendiri. Qlipper.ai ada buat bantu kamu balikin lagi fokus ke hal yang kamu suka: bikin konten utama yang berkualitas dan inspiratif. Biar kerjaan motong-motong short-form itu jadi urusan AI.\n\nKamu jadi punya lebih banyak waktu buat riset ide, interaksi sama komunitas, atau bahkan sekadar istirahat. Percaya deh, produktivitasmu bakal naik drastis dan semangat bikin konten kembali menyala. Ayo, coba Qlipper.ai sekarang!",
    hashtags: ['#QlipperAI','#VideoPendekAI','#ProduktivitasKreator','#ShortFormIndonesia','#ReelsIndonesia'] },

  { topic: 'Decreasing audience engagement on long videos', headline: 'Penonton video panjangmu suka skip bagian penting?', format: 'stat', theme: 'dark',
    caption_draft: "Di era attention span yang makin pendek ini, ngarep penonton betah nonton video durasi 10-30 menit sampai habis itu PR banget. Banyak yang cuma nonton di awal, terus langsung scroll.\n\nPadahal, ada banyak insight berharga, momen lucu, atau edukasi penting di video panjangmu. Gimana caranya biar audience baru gak langsung skip dan malah jadi penasaran buat nonton full version-nya? Ini tantangan buat kita semua.",
    hashtags: ['#QlipperAI','#KreatorKontenIndonesia','#AudienceEngagement','#KontenViral','#FYPIndonesia'] },

  { topic: 'Hooking new audience with short-form content', headline: 'Pancing penonton baru pakai short-form buatan AI!', format: 'carousel', theme: 'light',
    caption_draft: "Solusinya itu ada di short-form video! Potong momen-momen paling menarik dari video panjangmu, tambahin hook yang kuat, dan sebar ke TikTok, Reels, YouTube Shorts.\n\nIni kayak 'trailer' buat video utamamu. Dijamin, mereka yang kepancing penasaran pasti bakal nyari channelmu buat nonton versi lengkapnya. Qlipper.ai siap bantu kamu bikin magnet short-form ini tanpa ribet.",
    hashtags: ['#QlipperAI','#ShortFormIndonesia','#YouTubeShortsID','#KontenCreatorID','#TikTokIndonesia'] },

  { topic: 'Fear/hesitation about using AI tools', headline: 'Ngeri nyoba AI karena takut ribet dan mahal?', format: 'hook', theme: 'dark',
    caption_draft: "Denger kata 'AI' mungkin langsung mikir teknologi yang canggih, rumit, dan cuma buat ahli IT doang. Belum lagi, ada stigma kalau tools AI itu harganya selangit dan gak ramah di kantong kreator.\n\nAkhirnya, kita milih jalan lama yang capek. Padahal, dunia digital bergerak cepat. Kalau gak ikut adaptasi, bisa-bisa kalah saing sama kreator lain yang udah melek teknologi. Pikiran ini sering bikin stuck, kan?",
    hashtags: ['#QlipperAI','#KreatorKontenIndonesia','#TeknologiAI','#EditorIndonesia','#KomunitasKreatorID'] },

  { topic: 'Simplicity and accessibility of Qlipper.ai', headline: 'AI itu gampang dan terjangkau, serius deh!', format: 'cta', theme: 'light',
    caption_draft: "Qlipper.ai dirancang buat siapa aja, bahkan buat kamu yang belum pernah nyentuh AI sebelumnya. Interfacenya ramah pengguna, tinggal upload video, dan biar AI kami yang kerja. Sesimpel itu!\n\nPlus, harganya juga sangat bersahabat kok. Gak perlu ngeluarin budget editor profesional. Kamu bisa dapat hasil sekelas pro dengan biaya yang jauh lebih hemat. Jadi, jangan takut lagi sama AI, yuk cobain Qlipper.ai!",
    hashtags: ['#QlipperAI','#VideoPendekAI','#ShortFormIndonesia','#CuplikanOtomatis','#FYPIndonesia'] },

  { topic: 'Cost of manual editing vs. AI', headline: 'Budget ngedit membengkak terus tiap bulan?', format: 'stat', theme: 'dark',
    caption_draft: "Punya konten panjang berarti harus punya editor dedicated atau ngeluarin duit buat jasa editing. Kalau targetnya bikin puluhan short-form video tiap bulan, biaya operasionalnya bisa lumayan bikin pusing.\n\nPadahal, budget itu bisa dialokasikan buat equipment baru, promosi, atau bahkan buat kamu liburan. Coba deh hitung-hitung lagi, berapa banyak uang yang kamu keluarkan cuma buat urusan gunting-gunting video?",
    hashtags: ['#QlipperAI','#EditorIndonesia','#KreatorKontenIndonesia','#HematBudget','#BiayaProduksi'] },

  { topic: 'Value proposition, ROI, future of content creation', headline: 'Investasi terbaik buat masa depan kontenmu? Qlipper.ai!', format: 'cta', theme: 'light',
    caption_draft: "Qlipper.ai itu bukan cuma tool, tapi investasi cerdas buat masa depan channel-mu. Dengan biaya yang minimal, kamu bisa produksi short-form video secara massal, ningkatin reach, dan dapetin audience baru.\n\nBayangin, return of investment-nya itu jauh lebih besar. Waktu hemat, biaya hemat, penonton nambah. Ini cara pintar buat bersaing di era digital. Jangan sampai ketinggalan tren, yuk jadi kreator yang smart bareng Qlipper.ai.",
    hashtags: ['#QlipperAI','#ProduktivitasKreator','#ShortFormIndonesia','#VideoPendekAI','#KontenCreatorID','#FYPIndonesia'] },
];

// Compute scheduled_at for each: 2 posts/day, 9am + 7pm Jakarta time
const scheduled = ideas.map((idea, i) => {
  const dayIndex = Math.floor(i / 2);
  const isEvening = i % 2 === 1;
  const ts = START_UTC + dayIndex * DAY_MS + (isEvening ? EVENING_OFFSET_MS : 0);
  return {
    ...idea,
    id: `idea_${Date.now()}_${i}`,
    scheduled_at: ts,
    scheduled_at_iso: new Date(ts).toISOString(),
    target_platforms: ['instagram', 'tiktok'],
    status: 'approved',
  };
});

const plan = {
  id: `plan_${Date.now()}`,
  name: 'Qlipper.ai · 7-day trial · May 28 – Jun 3',
  brief: '7-day trial run, 2 posts/day, alternating dark/light themes, Bahasa Indonesia, first post dark.',
  brand_id: BRAND_ID,
  schedule: {
    posts_per_day: 2,
    days: 7,
    start_utc: START_UTC,
    timezone: 'Asia/Jakarta',
    morning_slot_wib: '09:00',
    evening_slot_wib: '19:00',
  },
  ideas: scheduled,
  createdAt: Date.now(),
};

// POST to storage
const existing = await fetch(`${STORAGE}/api/content_plans`).then((r) => r.json()).catch(() => []);
const updated = [plan, ...(Array.isArray(existing) ? existing : [])];

const res = await fetch(`${STORAGE}/api/content_plans`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updated),
});

if (!res.ok) {
  console.error('Failed to save:', res.status, await res.text());
  process.exit(1);
}

console.log(`Saved plan: ${plan.id}`);
console.log(`  Name: ${plan.name}`);
console.log(`  Posts: ${scheduled.length}`);
console.log(`  First scheduled: ${scheduled[0].scheduled_at_iso} (${new Date(scheduled[0].scheduled_at).toLocaleString('en-US', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' })} WIB)`);
console.log(`  Last scheduled:  ${scheduled[scheduled.length-1].scheduled_at_iso} (${new Date(scheduled[scheduled.length-1].scheduled_at).toLocaleString('en-US', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' })} WIB)`);
