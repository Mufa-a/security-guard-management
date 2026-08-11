import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

export interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  isLoading: boolean;
  gradient: string; // tailwind gradient classes e.g. 'from-emerald-500 to-emerald-600'
  suffix?: string;
}

function AnimatedNumber({ value }: { value: number }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(motionVal, value, { duration: 0.8, ease: 'easeOut' });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display}</>;
}

export default function KpiCard({ icon: Icon, label, value, isLoading, gradient, suffix }: KpiCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: '0 12px 28px -8px rgba(15,23,42,0.18)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm"
    >
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-10`} />
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-sm mb-3`}>
        <Icon size={17} strokeWidth={1.9} />
      </div>
      <p className="text-[11px] font-mono uppercase tracking-wide text-slate-400 mb-1">{label}</p>
      {isLoading ? (
        <span className="inline-block w-12 h-6 bg-slate-100 rounded animate-pulse" />
      ) : (
        <p className="font-display text-2xl font-bold text-slate-800 tabular-nums">
          <AnimatedNumber value={value} />
          {suffix}
        </p>
      )}
    </motion.div>
  );
}