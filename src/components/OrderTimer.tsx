import { useState, useEffect } from 'react';
import { Ring, Clock } from 'lucide-react';

interface OrderTimerProps {
  createdAt: string;
  targetMinutes?: number; // Expected prep time
  className?: string;
}

export default function OrderTimer({ createdAt, targetMinutes = 15, className = '' }: OrderTimerProps) {
  const [time, setTime] = useState<string>('0s');
  const [isBeyondTarget, setIsBeyondTarget] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - new Date(createdAt).getTime();
      const seconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(seconds / 60);
      const displaySeconds = seconds % 60;

      if (minutes > 0) {
        setTime(`${minutes}m ${displaySeconds}s`);
      } else {
        setTime(`${seconds}s`);
      }

      setIsBeyondTarget(minutes >= targetMinutes);
    }, 100);

    return () => clearInterval(interval);
  }, [createdAt, targetMinutes]);

  const getTimerColor = () => {
    const elapsed = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(elapsed / 60000);
    
    if (minutes >= (targetMinutes * 1.5)) return 'text-red-500'; // Way over
    if (minutes >= targetMinutes) return 'text-orange-500'; // Over target
    if (minutes >= (targetMinutes * 0.7)) return 'text-yellow-500'; // Getting close
    return 'text-green-500'; // Good time
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Clock className={`h-4 w-4 ${getTimerColor()} ${isBeyondTarget ? 'animate-pulse' : ''}`} />
      <span className={`font-mono text-sm font-bold ${getTimerColor()}`}>
        {time}
      </span>
      {isBeyondTarget && (
        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full animate-pulse">
          LATE
        </span>
      )}
    </div>
  );
}
