import type { ReactNode } from 'react';

export const eyebrowClass = 'font-mono text-2xs font-bold uppercase tracking-eyebrow text-muted-foreground';

export const PageTitle = ({ children }: { children: ReactNode }) => <h1 className="text-xl font-bold">{children}</h1>;
export const SectionTitle = ({ children }: { children: ReactNode }) => <h2 className="text-lg font-bold">{children}</h2>;
export const Eyebrow = ({ children }: { children: ReactNode }) => <p className={eyebrowClass}>{children}</p>;
