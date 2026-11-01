import { NavLink, Outlet, useNavigation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { BriefcaseIcon, ChartIcon, ChatIcon, PlusIcon, ThemeToggle, eyebrowClass } from '../components/ui';
import { jobsChanged, useApi } from '../lib/useApi';
import type { Job } from '../lib/types';

const item = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors duration-100 ${isActive ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`;

export function AppLayout() {
  const { data: jobs = [] } = useApi<Job[]>('/jobs', jobsChanged);
  const nav = useNavigation();
  return (
    <div className="grid min-h-screen md:grid-rail-main">
      <nav aria-label="Main" className="flex flex-col gap-5 border-b border-border bg-card px-3 py-4 md:sticky md:top-0 md:h-screen md:border-r md:border-b-0">
        <div className="flex items-center gap-2.5 px-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary font-heading text-sm font-bold text-primary-foreground">A</span>
          <div className="flex flex-col">
            <span className="font-heading text-sm font-bold">Aironauts</span>
            <span className={eyebrowClass}>Recruit</span>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <NavLink to="/" end className={item}><ChatIcon /> Chat</NavLink>
          <NavLink to="/jobs" end className={item}><BriefcaseIcon /> Jobs</NavLink>
          <NavLink to="/dashboard" className={item}><ChartIcon /> Dashboard</NavLink>
        </div>
        <Link to="/jobs/new" className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary font-medium text-primary-foreground transition-opacity duration-100 hover:opacity-90"><PlusIcon /> New job</Link>
        <div className="flex min-h-0 flex-col gap-0.5">
          <p className={`${eyebrowClass} px-2.5 pb-1`}>Open jobs · {jobs.length}</p>
          <div className="flex flex-col gap-0.5 overflow-y-auto">
            {jobs.length === 0 && <p className="px-2.5 text-xs text-muted-foreground">No jobs yet</p>}
            {jobs.map((j) => (
              <NavLink key={j._id} to={`/jobs/${j._id}`} className={item} title={j.title}>
                <span className="size-1.5 shrink-0 rounded-full bg-brand-blue" />
                <span className="truncate">{j.title}</span>
                <span className="ml-auto font-mono text-2xs text-muted-foreground">{j.stats.total}</span>
              </NavLink>
            ))}
          </div>
        </div>
        <div className="mt-auto"><ThemeToggle /></div>
      </nav>
      <main className={`min-w-0 transition-opacity duration-150 ${nav.state === 'loading' ? 'opacity-60' : ''}`}><Outlet /></main>
    </div>
  );
}
