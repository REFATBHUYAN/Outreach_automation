import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppLayout } from './AppLayout';

// Route-based code splitting: each route module is its own chunk, loaded on first visit.
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, lazy: () => import('../routes/chat/ChatPage') },
      { path: 'dashboard', lazy: () => import('../routes/dashboard/DashboardPage') },
      { path: 'jobs', lazy: () => import('../routes/jobs/JobsPage') },
      { path: 'jobs/new', lazy: () => import('../routes/job-new/NewJobPage') },
      { path: 'jobs/:jobId', lazy: () => import('../routes/job/JobPage') },
    ],
  },
  { path: '/book/:candidateId', lazy: () => import('../routes/book/BookPage') },
];

export const router = createBrowserRouter(routes);
