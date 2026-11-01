export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-100 ${checked ? 'bg-primary' : 'bg-input'}`}
    >
      <span className={`size-4 rounded-full bg-card shadow-sm transition-transform duration-100 ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </button>
  );
}
