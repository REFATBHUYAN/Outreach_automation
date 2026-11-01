import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { eyebrowClass } from './typography';

const field = 'w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-base transition-colors duration-100 focus:border-ring';

export const Input = ({ className = '', ...p }: InputHTMLAttributes<HTMLInputElement>) => <input className={`${field} ${className}`} {...p} />;
export const Textarea = ({ className = '', ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={`${field} ${className}`} {...p} />;

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="flex flex-col gap-1.5">
    <span className={eyebrowClass}>{label}</span>
    {children}
  </label>
);
