import type { SVGProps } from 'react';

// Minimal stroke icon set (24px grid, currentColor). Decorative by default.
const icon = (paths: string[]) => (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4 shrink-0" {...props}>
    {paths.map((d) => <path key={d} d={d} />)}
  </svg>
);

export const ChatIcon = icon(['M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z']);
export const ChartIcon = icon(['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2']);
export const BriefcaseIcon = icon(['M3 8h18v11H3z', 'M8 8V5h8v3', 'M3 13h18']);
export const SunIcon = icon(['M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z', 'M12 1v2', 'M12 21v2', 'M4.2 4.2l1.4 1.4', 'M18.4 18.4l1.4 1.4', 'M1 12h2', 'M21 12h2', 'M4.2 19.8l1.4-1.4', 'M18.4 5.6l1.4-1.4']);
export const MoonIcon = icon(['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z']);
export const MonitorIcon = icon(['M3 4h18v12H3z', 'M8 20h8', 'M12 16v4']);
export const SendIcon = icon(['M22 2 11 13', 'M22 2l-7 20-4-9-9-4 20-7Z']);
export const SparkIcon = icon(['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z', 'M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17Z']);
export const UploadIcon = icon(['M12 16V4', 'M7 9l5-5 5 5', 'M4 20h16']);
export const ArrowIcon = icon(['M5 12h14', 'M13 6l6 6-6 6']);
export const PlusIcon = icon(['M12 5v14', 'M5 12h14']);
export const SearchIcon = icon(['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z', 'M21 21l-4.3-4.3']);
export const XIcon = icon(['M18 6 6 18', 'M6 6l12 12']);
export const LinkIcon = icon(['M14 4h6v6', 'M20 4l-9 9', 'M18 14v6H4V6h6']);
