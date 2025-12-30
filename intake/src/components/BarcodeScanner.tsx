import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw } from 'lucide-react';
import styles from './BarcodeScanner.module.css';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = async () => {
    if (!containerRef.current) return;
    
    setError(null);
    setIsScanning(true);

    try {
      const scanner = new Html5Qrcode('barcode-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          // Success callback
          onScan(decodedText);
          stopScanner();
        },
        () => {
          // Error callback (ignore scan failures)
        }
      );
    } catch (err) {
      console.error('Scanner error:', err);
      setError('Could not access camera. Please ensure camera permissions are granted.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Scan Barcode</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.scannerContainer}>
          <div id="barcode-reader" ref={containerRef} className={styles.reader} />
          
          {!isScanning && !error && (
            <div className={styles.placeholder}>
              <Camera size={48} />
              <p>Initializing camera...</p>
            </div>
          )}

          {error && (
            <div className={styles.error}>
              <p>{error}</p>
              <button className={styles.retryBtn} onClick={startScanner}>
                <RefreshCw size={20} />
                Try Again
              </button>
            </div>
          )}
        </div>

        <div className={styles.instructions}>
          <p>Point your camera at a food product barcode</p>
        </div>
      </div>
    </div>
  );
}

