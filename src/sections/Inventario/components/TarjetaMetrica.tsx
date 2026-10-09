import React from 'react';

interface Props {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  isAlert?: boolean;
  isGreen?: boolean;
}

export const TarjetaMetrica: React.FC<Props> = ({ label, value, icon, isAlert, isGreen }) => {
  const colorMode = isAlert ? 'danger' : isGreen ? 'accent' : 'ink';
  
  return (
    <div className={`bg-[var(--color-surface)] border-2 border-[var(--color-${colorMode})] p-3 sm:p-5 flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center min-w-0 rounded-none shadow-[4px_4px_0_0_var(--color-${colorMode})] transition-transform hover:-translate-y-1`}>
      <div className={`w-10 h-10 border flex items-center justify-center rounded-none shrink-0 border-[var(--color-${colorMode})] bg-[var(--color-${colorMode === 'ink' ? 'bg' : colorMode + '-bg'})] text-[var(--color-${colorMode})]`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-black uppercase tracking-widest truncate text-[var(--color-${colorMode})]`}>
          {label}
        </p>
        <p className={`text-lg xl:text-xl font-black whitespace-nowrap text-[var(--color-${colorMode})] mt-0.5`}>
          {value}
        </p>
      </div>
    </div>
  );
};