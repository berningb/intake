import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(null);
  
  const { signInWithGoogle, continueAsGuest } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading('google');

    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(null);
    }
  };

  const handleGuestContinue = async () => {
    setError('');
    setLoading('guest');

    try {
      await continueAsGuest();
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to continue as guest');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-lg bg-bg-deep relative overflow-hidden before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_20%_20%,rgba(0,242,255,0.05)_0%,transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,0,255,0.05)_0%,transparent_40%)] before:pointer-events-none">
      <motion.div 
        className="bg-bg-card rounded-md pt-[6rem] px-[2rem] pb-[4.5rem] w-full max-w-[420px] border border-gray-800 shadow-card relative z-10 after:content-[''] after:absolute after:-top-[1px] after:left-[20px] after:right-[20px] after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-primary after:to-transparent after:shadow-neon max-sm:p-xl max-sm:rounded-none max-sm:border-none max-sm:bg-transparent max-sm:shadow-none"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center mb-[3.5rem]">
          <h1 className="font-display text-[2.25rem] font-black text-white tracking-[0.25em] uppercase mb-md max-sm:text-[1.75rem]">intake</h1>
          <p className="text-primary text-[0.7rem] font-display uppercase tracking-[0.4em] m-0 opacity-80">Mindful eating, simplified</p>
        </div>

        <div className="flex flex-col gap-xl">
          {error && (
            <motion.div 
              className="bg-error/10 text-error p-md rounded-sm text-[0.8rem] text-center border border-error/20 font-display uppercase"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              {error}
            </motion.div>
          )}

          <p className="text-center text-gray-500 text-[0.85rem] leading-[1.6] m-0">
            Track your nutrition with ease. Get insights on whether your meals fit your daily goals.
          </p>

          <button 
            className="flex items-center justify-center gap-md w-full p-4 bg-bg-accent border border-gray-800 rounded-sm text-[0.9rem] font-bold text-white font-display uppercase tracking-[0.1em] transition-all duration-fast cursor-pointer hover:border-primary hover:shadow-neon hover:bg-white/[0.02] disabled:opacity-30 disabled:cursor-not-allowed" 
            onClick={handleGoogleSignIn}
            disabled={loading !== null}
          >
            {loading === 'google' ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <svg className="w-[20px] h-[20px] drop-shadow-[0_0_2px_white]" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="flex items-center gap-lg text-gray-800 text-[0.7rem] font-display uppercase tracking-[0.2em] before:content-[''] before:flex-1 before:h-[1px] before:bg-gray-800 after:content-[''] after:flex-1 after:h-[1px] after:bg-gray-800">
            <span>or</span>
          </div>

          <button 
            className="flex items-center justify-center gap-sm w-full p-4 bg-transparent border border-gray-800 rounded-sm text-[0.85rem] font-bold text-gray-500 font-display uppercase tracking-[0.1em] transition-all duration-fast cursor-pointer hover:text-white hover:border-white hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed" 
            onClick={handleGuestContinue}
            disabled={loading !== null}
          >
            {loading === 'guest' ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <UserCircle size={20} />
                Continue as Guest
              </>
            )}
          </button>

          <p className="text-center text-[0.65rem] text-gray-600 m-0 font-body">
            Guest data is saved but can be lost. Sign in with Google to keep your progress.
          </p>
        </div>

        <p className="text-center mt-[2rem] text-gray-500 text-[0.75rem] font-display uppercase tracking-[0.1em]">
          By signing in, you agree to track your nutrition mindfully
        </p>
      </motion.div>
    </div>
  );
}
