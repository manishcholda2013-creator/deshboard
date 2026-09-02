import { Waveform } from './Waveform';

const SUGGESTIONS = [
  'Explain a tricky concept simply',
  'Draft a warm professional email',
  'Brainstorm names for a project',
  'Plan a productive weekend',
];

interface WelcomeScreenProps {
  onPick: (text: string) => void;
}

export function WelcomeScreen({ onPick }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 animate-fade-in">
      <div className="flex flex-col items-center text-center max-w-2xl w-full">
        <div className="relative mb-8">
          <div className="absolute inset-0 -m-6 rounded-full bg-accent/10 blur-2xl" />
          <div className="relative">
            <Waveform bars={32} className="h-20 w-64" />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
          Danosu AI
        </h1>
        <p className="mt-3 text-muted text-base sm:text-lg max-w-md">
          Your fluid thinking partner. Ask anything, or start with a spark.
        </p>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onPick(s)}
              className="group text-left rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20 transition-all duration-200 px-4 py-3.5"
            >
              <span className="text-sm text-softText group-hover:text-white transition-colors">
                {s}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
