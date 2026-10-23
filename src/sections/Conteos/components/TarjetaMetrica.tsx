import React from 'react';

interface Props {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  isAlert?: boolean;
}

export const TarjetaMetrica: React.FC<Props> = ({ label, value, icon, isAlert }) => {
  return (
    <div className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 border-2 bg-white min-w-0 xl:min-w-[200px] shrink-0 transition-transform hover:-translate-y-1 cursor-default rounded-none ${
      isAlert ? 'border-[var(--color-danger)] shadow-[4px_4px_0_0_var(--color-danger)]' : 'border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)]'
    }`}>
      <div className={`w-10 h-10 flex items-center justify-center border-2 rounded-none shrink-0 ${
        isAlert ? 'bg-[var(--color-danger-bg)] border-[var(--color-danger)] text-[var(--color-danger)]' : 'bg-[var(--color-bg)] border-[var(--color-ink)] text-[var(--color-ink)]'
      }`}>
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-widest truncate">{label}</p>
        <p className={`text-lg font-black uppercase tracking-wider truncate ${
          isAlert ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink)]'
        }`}>
          {value}
        </p>
      </div>
    </div>
  );
};