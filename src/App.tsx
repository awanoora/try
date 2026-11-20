import {
  AlertCircle,
  Check,
  Copy,
  Download,
  FileText,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import { WaveformPlayer } from './components/WaveformPlayer';
import {
  DEFAULT_SCRIPT,
  SCRIPT_TEMPLATES,
  STYLE_PRESETS,
  VOICE_OPTIONS,
} from './data/ceremonyPresets';
import type { GeneratedTake, VoiceId } from './types/tts';

const HERO_IMAGE_PATH =
  '/src/assets/images/ceremony_sirih_songket_1795179256749.jpg';

function base64ToBlobUrl(base64: string, mimeType: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType || 'audio/wav' });
  return URL.createObjectURL(blob);
}

function estimateReadingSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  // Ceremonial Malay pacing ~115 words per minute (~1.9 words/sec) plus stanza pauses
  return Math.max(2, Math.round(words / 1.9));
}

export default function App() {
  const [scriptText, setScriptText] = useState<string>(DEFAULT_SCRIPT);
  const [editorMode, setEditorMode] = useState<'edit' | 'stage'>('edit');
  const [selectedVoice, setSelectedVoice] = useState<VoiceId>('Kore');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    STYLE_PRESETS[0].id
  );
  const [stylePrompt, setStylePrompt] = useState<string>(
    STYLE_PRESETS[0].prompt
  );
  const [showAllVoices, setShowAllVoices] = useState<boolean>(false);
  const [dismissedTypoHint, setDismissedTypoHint] = useState<boolean>(false);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [heroImgFailed, setHeroImgFailed] = useState<boolean>(false);

  const [takes, setTakes] = useState<GeneratedTake[]>([]);
  const [activeTakeId, setActiveTakeId] = useState<string | null>(null);

  const playerSectionRef = useRef<HTMLElement | null>(null);
  const createdUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      createdUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const activeTake = useMemo(
    () => takes.find((t) => t.id === activeTakeId) ?? takes[0] ?? null,
    [takes, activeTakeId]
  );

  const hasPentuaTypo = useMemo(
    () => /\bTuan\s+pentua\b/.test(scriptText) && !dismissedTypoHint,
    [scriptText, dismissedTypoHint]
  );

  const wordCount = useMemo(
    () => scriptText.trim().split(/\s+/).filter(Boolean).length,
    [scriptText]
  );
  const charCount = scriptText.length;
  const estSeconds = useMemo(
    () => estimateReadingSeconds(scriptText),
    [scriptText]
  );

  const visibleVoices = useMemo(
    () =>
      showAllVoices
        ? VOICE_OPTIONS
        : VOICE_OPTIONS.filter((v) => v.genderLabel === 'Suara Perempuan'),
    [showAllVoices]
  );

  const activePresetLabel = useMemo(() => {
    const match = STYLE_PRESETS.find((p) => p.prompt === stylePrompt);
    return match ? match.label : 'Gaya Tersuai';
  }, [stylePrompt]);

  const handleSelectPreset = (presetId: string) => {
    const preset = STYLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(preset.id);
    setStylePrompt(preset.prompt);
  };

  const handleApplyTemplate = (content: string) => {
    setScriptText(content);
    setDismissedTypoHint(false);
    setErrorMessage(null);
  };

  const handleFixPentua = () => {
    setScriptText((prev) => prev.replace(/\bTuan\s+pentua\b/g, 'Tuan Pengetua'));
    setDismissedTypoHint(true);
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(scriptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleDurationResolved = (id: string, durationSeconds: number) => {
    setTakes((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, durationSeconds } : item
      )
    );
  };

  const handleGenerateSpeech = async () => {
    const trimmed = scriptText.trim();
    if (!trimmed) {
      setErrorMessage(
        'Sila masukkan teks ucapan atau pantun sebelum menjana suara.'
      );
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed,
          voiceName: selectedVoice,
          stylePrompt,
        }),
      });

      const data = (await response.json()) as {
        audioBase64?: string;
        mimeType?: string;
        voiceName?: VoiceId;
        error?: string;
      };

      if (!response.ok || !data.audioBase64) {
        throw new Error(
          data.error ||
            'Tidak dapat menjana audio pada masa ini. Sila cuba sebentar lagi.'
        );
      }

      const audioUrl = base64ToBlobUrl(
        data.audioBase64,
        data.mimeType || 'audio/wav'
      );
      createdUrlsRef.current.push(audioUrl);

      const now = new Date();
      const timeLabel = now.toLocaleTimeString('ms-MY', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const newTake: GeneratedTake = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: timeLabel,
        text: trimmed,
        voiceName: data.voiceName || selectedVoice,
        styleLabel: activePresetLabel,
        stylePrompt,
        audioUrl,
        mimeType: data.mimeType || 'audio/wav',
        durationSeconds: 0,
      };

      setTakes((prev) => [newTake, ...prev]);
      setActiveTakeId(newTake.id);

      requestAnimationFrame(() => {
        playerSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Ralat rangkaian berlaku semasa menghubungi pelayan suara.';
      setErrorMessage(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Split script into paragraphs for Stage Teleprompter view
  const scriptParagraphs = useMemo(
    () =>
      scriptText
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean),
    [scriptText]
  );

  return (
    <div id="atas" className="min-h-screen bg-[#FAF8F4] text-[#1C1917]">
      <TopBar isGenerating={isGenerating} onGenerate={handleGenerateSpeech} />

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        {/* Editorial Ceremony Header */}
        <section className="grid grid-cols-1 items-center gap-8 border-b border-[#E5DFD3] pb-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#78716C]">
              <span>Bahasa Melayu</span>
              <span aria-hidden="true">·</span>
              <span>Suara Perempuan Lemah Lembut</span>
              <span aria-hidden="true">·</span>
              <span>Majlis Rasmi &amp; Pantun</span>
            </div>

            <h1 className="mt-3 max-w-2xl font-serif text-4xl font-semibold tracking-tight text-[#1C1917] sm:text-5xl [text-wrap:balance]">
              Pengucapan Majlis &amp; Pantun Pembuka Bicara
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#57534E]">
              Susun teks protokol dan rangkap pantun untuk majlis penghargaan,
              kemudian hasilkan rakaman suara perempuan yang lemah lembut,
              sopan, dan teratur dalam format WAV bermutu tinggi.
            </p>
          </div>

          <figure className="lg:col-span-5">
            <div className="overflow-hidden rounded-xl border border-[#E5DFD3] bg-[#F3EFE7]">
              {!heroImgFailed ? (
                <img
                  src={HERO_IMAGE_PATH}
                  alt="Tepak sirih tembaga bersama daun sirih berlipat dan kain songket tenunan tradisi di atas meja batu kapur"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="aspect-[16/9] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[16/9] w-full flex-col items-center justify-center bg-gradient-to-br from-[#F3EFE7] to-[#E7E0D2] p-6 text-center">
                  <Sparkles
                    className="h-7 w-7 text-[#78350F]"
                    aria-hidden="true"
                  />
                  <p className="mt-2 font-serif text-lg font-medium text-[#1C1917]">
                    Sirih Berlipat Sirih Pinang
                  </p>
                </div>
              )}
            </div>
            <figcaption className="mt-2 font-serif text-xs italic text-[#78716C]">
              Fig. 1 — Tepak sirih dan lipatan kain songket sebagai lambang adab
              menyambut tetamu kehormat majlis.
            </figcaption>
          </figure>
        </section>

        {/* Main Studio Workspace */}
        <section
          aria-label="Ruang kerja skrip dan kawalan suara"
          className="mt-10 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12"
        >
          {/* Left Column: Script Editor & Teleprompter */}
          <div
            id="skrip-ucapan"
            className="flex flex-col rounded-xl border border-[#E5DFD3] bg-white p-6 lg:col-span-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EFEAE0] pb-4">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-[#1C1917]">
                  Skrip Ucapan &amp; Pantun
                </h2>
                <p className="mt-0.5 text-xs text-[#78716C]">
                  Sunting teks protokol atau semak susunan rangkap sebelum
                  dirakam.
                </p>
              </div>

              <div
                role="tablist"
                aria-label="Mod paparan skrip"
                className="flex items-center gap-1 rounded-lg bg-[#F3EFE7] p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={editorMode === 'edit'}
                  onClick={() => setEditorMode('edit')}
                  className={`min-h-[34px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                    editorMode === 'edit'
                      ? 'bg-white text-[#1C1917] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  Sunting Skrip
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={editorMode === 'stage'}
                  onClick={() => setEditorMode('stage')}
                  className={`min-h-[34px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                    editorMode === 'stage'
                      ? 'bg-white text-[#1C1917] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  Paparan Pentas
                </button>
              </div>
            </div>

            {/* Template Quick Bar */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[#78716C]">
                Templat:
              </span>
              {SCRIPT_TEMPLATES.map((tpl) => {
                const isActive = scriptText.trim() === tpl.content.trim();
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl.content)}
                    className={`min-h-[32px] rounded-md border px-2.5 py-1 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'border-[#14532D] bg-[#14532D]/5 text-[#14532D]'
                        : 'border-[#E5DFD3] bg-[#FAF8F4] text-[#57534E] hover:border-[#D6CEBE] hover:text-[#1C1917]'
                    }`}
                  >
                    {tpl.title}
                  </button>
                );
              })}
            </div>

            {/* Optional Non-Intrusive Spelling Suggestion for "pentua" -> "Pengetua" */}
            {hasPentuaTypo && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E5DFD3] bg-[#FAF8F4] px-4 py-3 text-xs text-[#57534E]">
                <span>
                  Nota semakan: Perkataan{' '}
                  <strong className="font-semibold text-[#1C1917]">
                    &ldquo;Tuan pentua&rdquo;
                  </strong>{' '}
                  dikesan. Adakah anda maksudkan{' '}
                  <strong className="font-semibold text-[#1C1917]">
                    &ldquo;Tuan Pengetua&rdquo;
                  </strong>
                  ?
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleFixPentua}
                    className="min-h-[30px] rounded-md bg-[#14532D] px-3 py-1 text-xs font-medium text-white transition-colors duration-150 hover:bg-[#0F3F22] whitespace-nowrap shrink-0"
                  >
                    Betulkan
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissedTypoHint(true)}
                    className="min-h-[30px] rounded-md border border-[#D6CEBE] bg-white px-2.5 py-1 text-xs font-medium text-[#57534E] transition-colors duration-150 hover:text-[#1C1917] whitespace-nowrap shrink-0"
                  >
                    Kekalkan
                  </button>
                </div>
              </div>
            )}

            {/* Editor / Stage Teleprompter Body */}
            <div className="mt-4 flex-1">
              {editorMode === 'edit' ? (
                <label className="block h-full">
                  <span className="sr-only">Teks ucapan dan pantun</span>
                  <textarea
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    rows={11}
                    placeholder="Masukkan teks ucapan majlis atau rangkap pantun di sini..."
                    className="h-full min-h-[280px] w-full resize-y rounded-lg border border-[#E5DFD3] bg-[#FAF8F4] p-4 text-[15px] leading-[1.75] text-[#1C1917] placeholder:text-[#A8A29E] focus:border-[#14532D] focus:bg-white focus:outline-none"
                  />
                </label>
              ) : (
                <div className="min-h-[280px] rounded-lg border border-[#E5DFD3] bg-[#FAF8F4] px-6 py-8">
                  {scriptParagraphs.length === 0 ? (
                    <p className="text-sm text-[#78716C]">
                      Tiada teks untuk dipaparkan. Sila masukkan skrip ucapan.
                    </p>
                  ) : (
                    <div className="mx-auto max-w-prose space-y-6">
                      {scriptParagraphs.map((block, index) => {
                        const isLastPantun =
                          index > 0 && block.split('\n').length >= 3;
                        return (
                          <p
                            key={index}
                            className={
                              isLastPantun
                                ? 'whitespace-pre-line font-serif text-2xl italic leading-[1.7] text-[#1C1917]'
                                : 'whitespace-pre-line font-serif text-xl leading-[1.75] text-[#292524]'
                            }
                          >
                            {block}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Metadata & Utilities */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[#EFEAE0] pt-4">
              <div className="flex items-center gap-2 font-mono text-xs text-[#78716C] tabular-nums">
                <span>{wordCount} patah perkataan</span>
                <span aria-hidden="true">·</span>
                <span>{charCount} aksara</span>
                <span aria-hidden="true">·</span>
                <span>Anggaran ~{estSeconds}s</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#E5DFD3] bg-[#FAF8F4] px-3 py-1.5 text-xs font-medium text-[#57534E] transition-colors duration-150 hover:bg-[#F3EFE7] hover:text-[#1C1917] whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#14532D]" aria-hidden="true" />
                      <span className="text-[#14532D]">Disalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Salin Skrip</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyTemplate(DEFAULT_SCRIPT)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#E5DFD3] bg-[#FAF8F4] px-3 py-1.5 text-xs font-medium text-[#57534E] transition-colors duration-150 hover:bg-[#F3EFE7] hover:text-[#1C1917] whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Set Semula</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Voice & Tone Controls */}
          <div
            id="kawalan-suara"
            className="flex flex-col justify-between rounded-xl border border-[#E5DFD3] bg-white p-6 lg:col-span-5"
          >
            <div>
              <div className="border-b border-[#EFEAE0] pb-4">
                <h2 className="font-serif text-2xl font-semibold text-[#1C1917]">
                  Kawalan Suara &amp; Intonasi
                </h2>
                <p className="mt-0.5 text-xs text-[#78716C]">
                  Ditala khusus untuk suara perempuan yang lemah lembut dan
                  tertib.
                </p>
              </div>

              {/* Voice Selection */}
              <div className="mt-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#1C1917]">
                    Pilihan Suara
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAllVoices((prev) => !prev)}
                    className="text-xs font-medium text-[#78350F] underline-offset-4 hover:underline whitespace-nowrap shrink-0"
                  >
                    {showAllVoices
                      ? 'Suara Perempuan Sahaja'
                      : 'Tunjukkan Semua Suara'}
                  </button>
                </div>

                <div className="mt-2.5 grid grid-cols-1 gap-2">
                  {visibleVoices.map((voice) => {
                    const isSelected = selectedVoice === voice.id;
                    return (
                      <button
                        key={voice.id}
                        type="button"
                        onClick={() => setSelectedVoice(voice.id)}
                        className={`flex w-full items-start justify-between gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors duration-150 ${
                          isSelected
                            ? 'border-[#14532D] bg-[#14532D]/[0.04]'
                            : 'border-[#E5DFD3] bg-[#FAF8F4] hover:border-[#D6CEBE] hover:bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-[#1C1917]">
                            <span>{voice.name}</span>
                            <span aria-hidden="true" className="text-[#A8A29E]">
                              ·
                            </span>
                            <span className="text-xs font-normal text-[#57534E]">
                              {voice.genderLabel}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-[#57534E]">
                            {voice.character}
                          </p>
                        </div>

                        {voice.recommended && (
                          <span className="text-xs font-medium text-[#14532D] whitespace-nowrap shrink-0">
                            Disyorkan
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Style Presets */}
              <div className="mt-6">
                <span className="text-xs font-semibold text-[#1C1917]">
                  Gaya Penyampaian
                </span>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  {STYLE_PRESETS.map((preset) => {
                    const isActive =
                      selectedPresetId === preset.id &&
                      stylePrompt === preset.prompt;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.id)}
                        className={`min-h-[40px] rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors duration-150 ${
                          isActive
                            ? 'border-[#14532D] bg-[#14532D] text-white'
                            : 'border-[#E5DFD3] bg-[#FAF8F4] text-[#44403C] hover:border-[#D6CEBE] hover:bg-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable Style Prompt */}
              <div className="mt-5">
                <label className="block">
                  <span className="text-xs font-semibold text-[#1C1917]">
                    Arahan Nada &amp; Jeda Suara
                  </span>
                  <textarea
                    value={stylePrompt}
                    onChange={(e) => setStylePrompt(e.target.value)}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-lg border border-[#E5DFD3] bg-[#FAF8F4] p-3 text-xs leading-relaxed text-[#44403C] focus:border-[#14532D] focus:bg-white focus:outline-none"
                  />
                </label>
              </div>
            </div>

            {/* Error Notice & Primary CTA */}
            <div className="mt-6 border-t border-[#EFEAE0] pt-5">
              {errorMessage && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2.5 rounded-lg border border-[#DC2626]/30 bg-[#FEF2F2] px-3.5 py-3 text-xs text-[#991B1B]"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]"
                    aria-hidden="true"
                  />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleGenerateSpeech}
                disabled={isGenerating}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-[#14532D] px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#0F3F22] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Volume2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {isGenerating
                    ? 'Sedang Menjana Audio Ucapan...'
                    : 'Jana Audio Ucapan'}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Audio Waveform Player */}
        <section
          id="pemain-audio"
          ref={playerSectionRef}
          aria-label="Pemain audio hasil janaan"
          className="mt-8"
        >
          <WaveformPlayer
            take={activeTake}
            isGenerating={isGenerating}
            onDurationResolved={handleDurationResolved}
          />
        </section>

        {/* Session Audio Archive */}
        <section
          id="rekod-audio"
          aria-label="Arkib rakaman sesi ini"
          className="mt-10 rounded-xl border border-[#E5DFD3] bg-white p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EFEAE0] pb-4">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[#1C1917]">
                Arkib Rakaman Sesi
              </h2>
              <p className="mt-0.5 text-xs text-[#78716C]">
                Bandingkan versi suara dan muat turun fail WAV pilihan anda.
              </p>
            </div>
            <span className="font-mono text-xs text-[#78716C] tabular-nums">
              {takes.length} rakaman
            </span>
          </div>

          {takes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FileText
                className="h-6 w-6 text-[#A8A29E]"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-medium text-[#1C1917]">
                Belum ada rakaman suara dijana dalam sesi ini.
              </p>
              <p className="mt-1 max-w-md text-xs text-[#78716C]">
                Setiap rakaman yang dijana akan disimpan di sini buat sementara
                supaya anda boleh memainkan semula atau memuat turun fail WAV.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#EFEAE0]">
              {takes.map((item, idx) => {
                const isSelected = activeTake?.id === item.id;
                const previewLine = item.text.split('\n')[0] || item.text;
                return (
                  <div
                    key={item.id}
                    className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between ${
                      isSelected ? 'bg-[#FAF8F4]/70 -mx-3 px-3 rounded-lg' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#78716C]">
                        <span className="font-mono font-medium text-[#1C1917] tabular-nums">
                          #{takes.length - idx}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-[#1C1917]">
                          {item.voiceName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{item.styleLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {item.createdAt}
                        </span>
                        {item.durationSeconds > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {item.durationSeconds.toFixed(1)}s
                            </span>
                          </>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm text-[#44403C]">
                        {previewLine}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveTakeId(item.id)}
                        className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
                          isSelected
                            ? 'bg-[#14532D] text-white'
                            : 'border border-[#E5DFD3] bg-[#FAF8F4] text-[#1C1917] hover:bg-[#F3EFE7]'
                        }`}
                      >
                        <Play className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{isSelected ? 'Dipilih' : 'Dengar'}</span>
                      </button>

                      <a
                        href={item.audioUrl}
                        download={`ucapan-${item.voiceName.toLowerCase()}-${takes.length - idx}.wav`}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#E5DFD3] bg-white px-3 py-1.5 text-xs font-medium text-[#57534E] transition-colors duration-150 hover:bg-[#F3EFE7] hover:text-[#1C1917] whitespace-nowrap shrink-0"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>WAV</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="mt-12 border-t border-[#E5DFD3] bg-[#FAF8F4]">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-4 px-6 py-6 text-xs text-[#78716C] sm:flex-row sm:items-center">
          <p>Suara Majlis — Studio Ucapan &amp; Pantun Bahasa Melayu</p>
          <p>Format audio WAV 24 kHz untuk sistem siar raya dewan dan acara rasmi.</p>
        </div>
      </footer>
    </div>
  );
}
