import { Download, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { GeneratedTake } from '../types/tts';

interface WaveformPlayerProps {
  take: GeneratedTake | null;
  isGenerating: boolean;
  onDurationResolved?: (id: string, durationSeconds: number) => void;
}

const SPEED_OPTIONS = [0.85, 0.95, 1, 1.1] as const;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function WaveformPlayer({
  take,
  isGenerating,
  onDurationResolved,
}: WaveformPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [peaks, setPeaks] = useState<number[]>([]);

  // Decode actual WAV buffer into amplitude peaks for the waveform canvas
  useEffect(() => {
    let cancelled = false;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(take?.durationSeconds || 0);

    if (!take?.audioUrl) {
      setPeaks([]);
      return;
    }

    async function extractWaveform() {
      try {
        const res = await fetch(take!.audioUrl);
        const buffer = await res.arrayBuffer();
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new AudioCtx();
        const decoded = await ctx.decodeAudioData(buffer);
        if (cancelled) {
          await ctx.close();
          return;
        }

        if (decoded.duration && onDurationResolved) {
          onDurationResolved(take!.id, decoded.duration);
        }
        setDuration(decoded.duration);

        const raw = decoded.getChannelData(0);
        const barCount = 96;
        const step = Math.max(1, Math.floor(raw.length / barCount));
        const computed: number[] = [];
        for (let i = 0; i < barCount; i++) {
          let maxAmp = 0;
          const start = i * step;
          const end = Math.min(raw.length, start + step);
          for (let j = start; j < end; j++) {
            const val = Math.abs(raw[j]);
            if (val > maxAmp) maxAmp = val;
          }
          computed.push(Math.max(0.08, Math.min(1, maxAmp)));
        }
        setPeaks(computed);
        await ctx.close();
      } catch {
        // Fallback uniform wave shape if AudioContext decoding is blocked
        if (!cancelled) {
          const fallback = Array.from({ length: 96 }, (_, idx) =>
            0.25 + 0.45 * Math.abs(Math.sin(idx * 0.27))
          );
          setPeaks(fallback);
        }
      }
    }

    extractWaveform();
    return () => {
      cancelled = true;
    };
  }, [take?.id, take?.audioUrl]);

  // Keep playbackRate and mute synced on <audio>
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
    audio.muted = isMuted;
  }, [playbackRate, isMuted, take?.audioUrl]);

  // Draw crisp canvas waveform reflecting playback progress
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const progress = duration > 0 ? currentTime / duration : 0;
    const totalBars = peaks.length;
    const gap = 3;
    const barWidth = Math.max(2, (rect.width - gap * (totalBars - 1)) / totalBars);
    const midY = rect.height / 2;

    peaks.forEach((amp, i) => {
      const x = i * (barWidth + gap);
      const barHeight = Math.max(4, amp * (rect.height - 12));
      const barRatio = i / totalBars;
      ctx.fillStyle = barRatio <= progress ? '#14532D' : '#D6CEBE';
      ctx.beginPath();
      ctx.roundRect(x, midY - barHeight / 2, barWidth, barHeight, 2);
      ctx.fill();
    });
  }, [peaks, currentTime, duration]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !take) return;
    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handleRestart = async () => {
    const audio = audioRef.current;
    if (!audio || !take) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const handleCanvasSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || !duration) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = ratio * duration;
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  if (isGenerating) {
    return (
      <div className="rounded-xl border border-[#E5DFD3] bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#1C1917]">
              Sedang mensintesis suara perempuan lemah lembut...
            </p>
            <p className="text-xs text-[#57534E]">
              Menyusun intonasi protokol majlis dan alunan pantun dalam format WAV 24 kHz.
            </p>
          </div>
          <div className="h-10 w-40 animate-pulse rounded-lg bg-[#F3EFE7]" />
        </div>
        <div className="mt-6 h-16 w-full animate-pulse rounded-lg bg-[#F7F4EE]" />
      </div>
    );
  }

  if (!take) {
    return (
      <div className="rounded-xl border border-[#E5DFD3] bg-white p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-serif text-xl font-semibold text-[#1C1917]">
              Pemain Audio Ucapan
            </h3>
            <p className="mt-1 text-sm text-[#57534E]">
              Klik <span className="font-medium text-[#1C1917]">Jana Audio Ucapan</span> untuk mendengar bacaan skrip dan pantun anda dengan suara perempuan yang lemah lembut.
            </p>
          </div>
          <p className="font-mono text-xs text-[#78716C] tabular-nums">
            WAV 24 kHz · Mono 16-bit
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E5DFD3] bg-white p-6">
      <audio
        ref={audioRef}
        src={take.audioUrl}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => {
          const d = audioRef.current?.duration || 0;
          if (d > 0) setDuration(d);
        }}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      <div className="flex flex-col gap-4 border-b border-[#EFEAE0] pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-serif text-xl font-semibold text-[#1C1917]">
            Hasil Rakaman Ucapan
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#57534E]">
            <span>Suara {take.voiceName}</span>
            <span aria-hidden="true">·</span>
            <span>{take.styleLabel}</span>
            <span aria-hidden="true">·</span>
            <span>WAV 24 kHz</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{take.createdAt}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Kelajuan main balik"
            className="flex items-center gap-1 rounded-lg bg-[#F3EFE7] p-1"
          >
            {SPEED_OPTIONS.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setPlaybackRate(rate)}
                className={`min-h-[32px] rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-colors duration-150 tabular-nums whitespace-nowrap shrink-0 ${
                  playbackRate === rate
                    ? 'bg-white text-[#1C1917] shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          <a
            href={take.audioUrl}
            download={`ucapan-majlis-${take.voiceName.toLowerCase()}.wav`}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#D6CEBE] bg-[#FAF8F4] px-4 py-2 text-sm font-medium text-[#1C1917] transition-colors duration-150 hover:bg-[#F3EFE7] whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Muat Turun WAV</span>
          </a>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Jeda audio' : 'Mainkan audio'}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#14532D] text-white transition-colors duration-150 hover:bg-[#0F3F22]"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Play className="ml-0.5 h-5 w-5" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={handleRestart}
            aria-label="Ulang dari mula"
            title="Ulang dari mula"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5DFD3] text-[#57534E] transition-colors duration-150 hover:bg-[#F3EFE7] hover:text-[#1C1917]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setIsMuted((prev) => !prev)}
            aria-label={isMuted ? 'Bunyikan audio' : 'Senyapkan audio'}
            title={isMuted ? 'Bunyikan audio' : 'Senyapkan audio'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5DFD3] text-[#57534E] transition-colors duration-150 hover:bg-[#F3EFE7] hover:text-[#1C1917]"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="flex-1">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasSeek}
            aria-label="Graf gelombang audio boleh klik untuk melompat masa"
            className="h-16 w-full cursor-pointer rounded-lg bg-[#FAF8F4] px-2"
          />
        </div>

        <div className="flex items-center justify-end font-mono text-xs text-[#57534E] tabular-nums shrink-0 sm:min-w-[104px]">
          <span>{formatTime(currentTime)}</span>
          <span className="mx-1 text-[#A8A29E]">/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
