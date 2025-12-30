import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw } from 'lucide-react';

export function BarcodeScanner({ onScan, onClose }) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

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
    <div className="fixed inset-0 bg-[#050507]/90 backdrop-blur-[8px] flex items-center justify-center z-[1000] p-md">
      <div className="bg-bg-card rounded-md w-full max-w-[420px] overflow-hidden border border-gray-800 shadow-card">
        <div className="flex justify-between items-center p-lg border-b border-gray-800">
          <h2 className="text-[1rem] font-black font-display uppercase tracking-[0.1em] text-white m-0">Scan Barcode</h2>
          <button className="p-xs bg-transparent text-gray-500 rounded-sm transition-all duration-fast hover:text-error hover:bg-error/10" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="relative bg-black min-h-[300px] border-t border-b border-gray-800 after:content-[''] after:absolute after:top-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:shadow-neon after:animate-[scan_2s_linear_infinite] after:z-10">
          <div id="barcode-reader" ref={containerRef} className="w-full [&_video]:w-full! [&_video]:h-auto!" />
          
          {!isScanning && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-md text-primary font-display uppercase tracking-[0.1em] text-[0.8rem]">
              <Camera size={48} />
              <p>Initializing camera...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-md text-error text-center p-xl">
              <p className="m-0 font-display uppercase text-[0.8rem] tracking-[0.05em]">{error}</p>
              <button className="flex items-center gap-sm py-3 px-6 bg-primary text-bg-deep rounded-sm font-extrabold font-display uppercase tracking-[0.1em] text-[0.75rem] shadow-neon transition-all duration-fast hover:bg-white hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]" onClick={startScanner}>
                <RefreshCw size={20} />
                Try Again
              </button>
            </div>
          )}
        </div>

        <div className="p-lg text-center bg-bg-accent">
          <p className="m-0 text-gray-500 text-[0.75rem] font-body">Point your camera at a food product barcode</p>
        </div>
      </div>
    </div>
  );
}
