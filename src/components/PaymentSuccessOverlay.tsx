import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

interface PaymentSuccessOverlayProps {
  show: boolean;
  amount: number;
  onComplete: () => void;
}

export default function PaymentSuccessOverlay({ show, amount, onComplete }: PaymentSuccessOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number; color: string }>>([]);

  useEffect(() => {
    if (show) {
      setVisible(true);
      // Generate confetti particles
      const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
      const particles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      }));
      setConfetti(particles);

      // Auto dismiss after 2.5 seconds
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onComplete, 300);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show && !visible) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
    >
      {/* Confetti */}
      {confetti.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-3 h-3 rounded-sm animate-confetti-fall"
          style={{
            left: `${particle.left}%`,
            top: '-20px',
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}s`,
            animationDuration: '3s',
          }}
        />
      ))}

      {/* Success Content */}
      <div className="text-center animate-success-bounce">
        {/* Checkmark Circle */}
        <div className="relative mb-6">
          <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-green-500/50 animate-pulse">
            <Check className="w-16 h-16 text-white animate-checkmark-draw" strokeWidth={3} />
          </div>
          {/* Glow rings */}
          <div className="absolute inset-0 w-32 h-32 mx-auto rounded-full bg-green-400/30 animate-ping" />
        </div>

        {/* Text */}
        <h1 className="text-4xl font-bold text-white mb-2 animate-fade-in">
          💳 Payment Successful!
        </h1>
        <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 animate-fade-in">
          {amount.toFixed(3)} OMR
        </p>

        {/* Fizzy bubbles */}
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full bg-white/30 animate-fizz-up"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>

        {/* Sparkles */}
        <div className="mt-8 flex justify-center gap-2">
          {['✨', '🎉', '✨', '🎊', '✨'].map((emoji, i) => (
            <span 
              key={i} 
              className="text-3xl animate-bounce"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {emoji}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
