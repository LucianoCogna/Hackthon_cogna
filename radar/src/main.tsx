import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import './index.css';
import { AppProvider, useApp } from './app/store';
import { Layout } from './app/Layout';
import { TooltipProvider } from './components/ui/overlay';
import Overview from './pages/Overview';
import GithubDevs from './pages/GithubDevs';
import GithubJira from './pages/GithubJira';
import AiUsage from './pages/AiUsage';
import AiCost from './pages/AiCost';
import PrRadar from './pages/PrRadar';
import Projects from './pages/Projects';
import Crew from './pages/Crew';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Overview /> },
      { path: 'github', element: <GithubDevs /> },
      { path: 'aderencia', element: <GithubJira /> },
      { path: 'ia', element: <AiUsage /> },
      { path: 'custo', element: <AiCost /> },
      { path: 'radar', element: <PrRadar /> },
      { path: 'projetos', element: <Projects /> },
      { path: 'crew', element: <Crew /> },
      { path: '*', element: <Overview /> },
    ],
  },
]);

function ThemedToaster() {
  const { theme } = useApp();
  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      toastOptions={{ style: { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' } }}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <TooltipProvider>
        <RouterProvider router={router} />
        <ThemedToaster />
      </TooltipProvider>
    </AppProvider>
  </React.StrictMode>,
);
