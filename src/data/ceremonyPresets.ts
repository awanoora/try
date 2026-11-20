import type { ScriptTemplate, StylePreset, VoiceOption } from '../types/tts';

export const DEFAULT_SCRIPT = `Yang Berusaha, Tuan pentua
Yang Diraikan, Cikgu Hasnan bin Mohammad,
Barisan pengurusan, rakan-rakan seperjuangan, serta hadirin yang dihormati sekalian.

Sirih berlipat sirih pinang,
Sirih dari Pulau Mutiara,
Pemanis kata selamat datang,
Awal bismillah pembuka bicara.`;

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'Kore',
    name: 'Kore',
    genderLabel: 'Suara Perempuan',
    character: 'Lemah lembut, hangat, dan penuh budi bahasa',
    recommended: true,
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    genderLabel: 'Suara Perempuan',
    character: 'Halus, tenang, dan jelas sebutan majlis',
    recommended: false,
  },
  {
    id: 'Puck',
    name: 'Puck',
    genderLabel: 'Suara Lelaki',
    character: 'Ceria, bersahaja, dan mesra hadirin',
  },
  {
    id: 'Charon',
    name: 'Charon',
    genderLabel: 'Suara Lelaki',
    character: 'Berwibawa, tenang, dan mendalam',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    genderLabel: 'Suara Lelaki',
    character: 'Tegas dan bertenaga untuk pengumuman',
  },
];

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'lembut-rasmi',
    label: 'Lemah Lembut & Rasmi',
    summary: 'Nada pengacara majlis wanita yang sopan, halus, dan teratur.',
    prompt:
      'Gentle, soft-spoken, warm, and poised Malaysian Malay female emcee speaking with grace and deep respect at a formal school ceremony. Pause gently between salutations and recite the pantun stanza with soft melodic cadence.',
  },
  {
    id: 'puitis-pantun',
    label: 'Puitis & Berpantun',
    summary: 'Penekanan lembut pada rima akhir dan jeda rangkap pantun.',
    prompt:
      'Tender, lyrical, soft-spoken Malaysian Malay female voice. Deliver the ceremonial greetings with sincere warmth and recite the traditional four-line pantun smoothly with poised rhythmic pauses at each comma.',
  },
  {
    id: 'mesra-sanjungan',
    label: 'Mesra & Sanjungan Budi',
    summary: 'Penuh penghargaan dan keikhlasan untuk majlis meraikan guru.',
    prompt:
      'Affectionate, gentle, soft-spoken female speaker with a warm smile in her voice, honouring a beloved educator calmly and sincerely without rushing.',
  },
  {
    id: 'tenang-khusyuk',
    label: 'Tenang & Perlahan',
    summary: 'Tempo perlahan dan suara yang mendamaikan suasana dewan.',
    prompt:
      'Very calm, hushed, gentle, and unhurried Malay female ceremonial voice with soft breathy warmth and clear articulation.',
  },
];

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: 'asal-cikgu-hasnan',
    title: 'Teks Asal (Cikgu Hasnan)',
    occasion: 'Ucapan Alu-aluan & Pantun',
    content: DEFAULT_SCRIPT,
  },
  {
    id: 'penutup-majlis',
    title: 'Pantun Penutup Majlis',
    occasion: 'Penghargaan & Doa Selamat',
    content: `Yang Berusaha Tuan Pengetua, yang diraikan Cikgu Hasnan bin Mohammad, serta hadirin yang dimuliakan.

Bunga dedap di atas para,
Anak dusun pasang pelita,
Kalau tersilap tutur bicara,
Jemari disusun maaf dipinta.

Sekian, wabillahi taufik walhidayah, wassalamualaikum warahmatullahi wabarakatuh.`,
  },
  {
    id: 'jasa-pendidik',
    title: 'Bingkisan Penghargaan Guru',
    occasion: 'Majlis Sanjungan Budi',
    content: `Hadirin yang dihormati sekalian,

Majlis pada hari ini bukan sekadar pertemuan biasa, tetapi tanda ingatan tulus kami terhadap bakti, kesabaran, dan keikhlasan Cikgu Hasnan bin Mohammad sepanjang mendidik anak bangsa.

Tuai padi antara masak,
Esok jangan layu-layuan,
Intai kami antara nampak,
Esok jangan rindu-rinduan.`,
  },
];
