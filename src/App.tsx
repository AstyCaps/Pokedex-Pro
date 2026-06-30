import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import PokemonDetail from './pages/PokemonDetail';
import FavoritesPage from './pages/FavoritesPage';
import TeamBuilderPage from './pages/TeamBuilderPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/pokemon/:name" element={<PokemonDetail />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/team-builder" element={<TeamBuilderPage />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
