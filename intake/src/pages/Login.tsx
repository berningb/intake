import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<'google' | 'guest' | null>(null);
  
  const { signInWithGoogle, continueAsGuest } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading('google');

    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err: any) {
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
    } catch (err: any) {
      setError(err.message || 'Failed to continue as guest');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.backgroundPattern}>
        <div className={styles.circle1} />
        <div className={styles.circle2} />
        <div className={styles.circle3} />
      </div>

      <motion.div 
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className={styles.header}>
          <h1 className={styles.logo}>intake</h1>
          <p className={styles.subtitle}>Mindful eating, simplified</p>
        </div>

        <div className={styles.content}>
          {error && (
            <motion.div 
              className={styles.error}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              {error}
            </motion.div>
          )}

          <p className={styles.description}>
            Track your nutrition with ease. Get insights on whether your meals fit your daily goals.
          </p>

          <button 
            className={styles.googleBtn} 
            onClick={handleGoogleSignIn}
            disabled={loading !== null}
          >
            {loading === 'google' ? (
              <Loader2 className={styles.spinner} size={20} />
            ) : (
              <>
                <svg className={styles.googleIcon} viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <button 
            className={styles.guestBtn} 
            onClick={handleGuestContinue}
            disabled={loading !== null}
          >
            {loading === 'guest' ? (
              <Loader2 className={styles.spinner} size={20} />
            ) : (
              <>
                <UserCircle size={20} />
                Continue as Guest
              </>
            )}
          </button>

          <p className={styles.guestNote}>
            Guest data is saved but can be lost. Sign in with Google to keep your progress.
          </p>
        </div>

        <p className={styles.footerNote}>
          By signing in, you agree to track your nutrition mindfully
        </p>
      </motion.div>
    </div>
  );
}
