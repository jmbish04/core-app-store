import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import LandingPage from './pages/Landing';
import AllApps from './pages/AllApps';
import AppDetail from './pages/AppDetail';
import CreateNew from './pages/CreateNew';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
        <Router>
            <nav className="p-4 border-b flex gap-4">
                <Link to="/" className="font-bold">Core App Store</Link>
                <Link to="/apps">All Apps</Link>
                <Link to="/new">Create New</Link>
            </nav>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/apps" element={<AllApps />} />
                <Route path="/apps/:id" element={<AppDetail />} />
                <Route path="/new" element={<CreateNew />} />
            </Routes>
        </Router>
    </QueryClientProvider>
  );
}

export default App;
