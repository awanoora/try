import { Volume2 } from 'lucide-react';

interface TopBarProps {
  isGenerating: boolean;
  onGenerate: () => void;
}

export function TopBar({ isGenerating, onGenerate }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E5DFD3] bg-[#FAF8F4]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-6 py-4">
        <a
          href="#atas"
          className="font-serif text-2xl font-semibold tracking-tight text-[#1C1917] whitespace-nowrap shrink-0"
        >
          Suara Majlis
        </a>

        <nav
          aria-label="Navigasi utama"
          className="hidden md:flex items-center gap-8 text-sm font-medium text-[#57534E]"
        >
          <a
            href="#skrip-ucapan"
            className="transition-colors duration-150 hover:text-[#1C1917] whitespace-nowrap shrink-0"
          >
            Skrip Ucapan
          </a>
          <a
            href="#kawalan-suara"
            className="transition-colors duration-150 hover:text-[#1C1917] whitespace-nowrap shrink-0"
          >
            Kawalan Suara
          </a>
          <a
            href="#pemain-audio"
            className="transition-colors duration-150 hover:text-[#1C1917] whitespace-nowrap shrink-0"
          >
            Pemain Audio
          </a>
          <a
            href="#rekod-audio"
            className="transition-colors duration-150 hover:text-[#1C1917] whitespace-nowrap shrink-0"
          >
            Arkib Sesi
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#14532D] px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#0F3F22] disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <Volume2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{isGenerating ? 'Menjana...' : 'Jana Suara'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
