import { useEffect, useState } from 'react';

interface ScanningOverlayProps {
  active: boolean;
  label?: string;
}

const ScanningOverlay = ({ active, label = 'ANALYZING' }: ScanningOverlayProps) => {
  const [scanLinePos, setScanLinePos] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setScanLinePos(prev => (prev >= 100 ? 0 : prev + 1.5));
    }, 20);
    return () => clearInterval(interval);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="relative w-72 h-72 sm:w-80 sm:h-80">
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-primary animate-pulse" />
        <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-primary animate-pulse" />
        <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-primary animate-pulse" />
        <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-primary animate-pulse" />

        {/* Grid lines */}
        <div className="absolute inset-4 opacity-20">
          {[...Array(5)].map((_, i) => (
            <div key={`h-${i}`} className="absolute w-full h-px bg-primary" style={{ top: `${(i + 1) * 16.6}%` }} />
          ))}
          {[...Array(5)].map((_, i) => (
            <div key={`v-${i}`} className="absolute h-full w-px bg-primary" style={{ left: `${(i + 1) * 16.6}%` }} />
          ))}
        </div>

        {/* Scanning beam */}
        <div
          className="absolute left-0 w-full h-0.5 shadow-[0_0_15px_3px_hsl(var(--primary))]"
          style={{
            top: `${scanLinePos}%`,
            background: `linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)`,
          }}
        />

        {/* Glow zone behind beam */}
        <div
          className="absolute left-0 w-full h-12 opacity-10"
          style={{
            top: `${Math.max(0, scanLinePos - 6)}%`,
            background: `linear-gradient(180deg, transparent, hsl(var(--primary)), transparent)`,
          }}
        />

        {/* Center crosshair */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-px bg-primary/60" />
          <div className="absolute h-8 w-px bg-primary/60" />
          <div className="absolute w-3 h-3 rounded-full border border-primary/60" />
        </div>

        {/* HUD text */}
        <div className="absolute -bottom-12 left-0 right-0 text-center">
          <p className="text-primary font-mono text-sm tracking-[0.3em] animate-pulse">
            {label}{dots}
          </p>
          <p className="text-primary/50 font-mono text-[10px] mt-1 tracking-widest">
            AI VISION ENGINE v2.0
          </p>
        </div>

        {/* Top-left data readout */}
        <div className="absolute -top-8 left-0 font-mono text-[10px] text-primary/60 tracking-wider">
          SPECTRUM: RGB+NIR
        </div>
        <div className="absolute -top-8 right-0 font-mono text-[10px] text-primary/60 tracking-wider">
          RES: 4K
        </div>

        {/* Spinning ring */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-40 h-40 rounded-full border border-dashed border-primary/20 animate-[spin_8s_linear_infinite]" />
        </div>
      </div>
    </div>
  );
};

export default ScanningOverlay;
