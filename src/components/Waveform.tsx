interface WaveformProps {
  bars?: number;
  className?: string;
}

const PALETTE = ['#19c37d', '#3aa0ff', '#9b6bff', '#19c37d', '#3aa0ff'];

export function Waveform({ bars = 28, className = '' }: WaveformProps) {
  return (
    <div
      className={`flex items-end justify-center gap-[3px] h-16 ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: bars }).map((_, i) => {
        const delay = (i % 7) * 0.13 + (i / bars) * 0.4;
        const duration = 1.1 + (i % 5) * 0.18;
        const color = PALETTE[i % PALETTE.length];
        return (
          <span
            key={i}
            className="wave-bar block w-[3px] rounded-full animate-wave-bar"
            style={{
              height: '100%',
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              background: `linear-gradient(to top, ${color}, ${color}99)`,
            }}
          />
        );
      })}
    </div>
  );
}
