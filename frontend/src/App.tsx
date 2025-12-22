import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { LandingPage } from './pages/Landing';
import { AllAppsPage } from './pages/AllApps';
import { AppDetailPage } from './pages/AppDetail';
import { CreateNewPage } from './pages/CreateNew';
import { Package, Plus, Home } from 'lucide-react';
import { Button } from './components/ui/button';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <nav className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <Link to="/" className="flex items-center space-x-2">
                  <Package className="h-6 w-6" />
                  <span className="text-xl font-bold">Core App Store</span>
                </Link>
                <div className="hidden md:flex space-x-4">
                  <Link to="/">
                    <Button variant="ghost" size="sm">
                      <Home className="h-4 w-4 mr-2" />
                      Home
                    </Button>
                  </Link>
                  <Link to="/apps">
                    <Button variant="ghost" size="sm">
                      <Package className="h-4 w-4 mr-2" />
                      All Apps
                    </Button>
                  </Link>
                </div>
              </div>
              <Link to="/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New App
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/apps" element={<AllAppsPage />} />
            <Route path="/apps/:id" element={<AppDetailPage />} />
            <Route path="/new" element={<CreateNewPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
