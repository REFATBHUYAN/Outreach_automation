import { useState } from 'react';
import { applyTheme, readTheme, type Theme } from '../../lib/theme';
import { MonitorIcon, MoonIcon, SunIcon } from './icons';

const OPTIONS: { value: Theme; label: string; Icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
  { value: 'system', label: 'System', Icon: MonitorIcon },
];

/** Segmented control: Light / Dark / System. */
export function ThemeToggle() {
  const [theme, setTheme] = useState(readTheme);
  const pick = (t: Theme) => {
    applyTheme(t);
    setTheme(t);
  };
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          title={label}
          onClick={() => pick(value)}
          className={`flex h-7 items-center justify-center rounded-md transition-colors duration-100 ${theme === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Icon />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}
