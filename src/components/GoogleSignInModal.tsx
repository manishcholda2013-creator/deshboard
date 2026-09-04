import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/firebase';
import { Waveform } from './Waveform';

function GoogleLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function GoogleSignInModal() {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setSigningIn(false);
        return;
      }
      setError('Sign-in failed. Please try again.');
      setSigningIn(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-canvas transition-opacity duration-500 ${
        signingIn ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-accent/8 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center text-center max-w-md w-full animate-fade-in-up">
        {/* Waveform */}
        <div className="mb-8">
          <Waveform bars={36} className="h-20 w-72" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
          Welcome to CodeFlex AI
        </h1>
        <p className="mt-3 text-muted text-base max-w-xs">
          Sign in to start your conversation with your fluid thinking partner.
        </p>

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={signingIn}
          className="mt-9 w-full max-w-xs flex items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 text-sm font-medium text-gray-800 hover:bg-gray-50 active:scale-[0.98] transition-all duration-200 shadow-lg"
        >
          <GoogleLogo className="w-5 h-5" />
          Continue with Google
        </button>

        {error && (
          <p className="mt-4 text-sm text-red-400 animate-fade-in">{error}</p>
        )}

        <p className="mt-6 text-xs text-muted/70 leading-relaxed max-w-xs">
          By continuing, you agree to CodeFlex AI's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
