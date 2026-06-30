import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../hooks/useFavorites';
import { fetchPokemonByName } from '../utils/pokemonApi';
import Navbar from '../components/Navbar';
import PokemonCard from '../components/PokemonCard';

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col items-center gap-3 animate-pulse">
      <div className="w-32 h-32 bg-slate-100 rounded-xl"></div>
      <div className="h-4 w-24 bg-slate-100 rounded"></div>
      <div className="h-3 w-16 bg-slate-100 rounded"></div>
    </div>
  );
}

function FavoritePokemonCard({ pokemonName }: { pokemonName: string }) {
  const { data: pokemon, isLoading } = useQuery({
    queryKey: ['pokemon', pokemonName],
    queryFn: () => fetchPokemonByName(pokemonName),
    staleTime: 1000 * 60 * 10,
  });

  if (isLoading) return <SkeletonCard />;
  if (!pokemon) return null;

  return <PokemonCard pokemon={pokemon} />;
}

export default function FavoritesPage() {
  const { user, openAuthModal } = useAuth();
  const { favorites, isLoading } = useFavorites();

  return (
    <div className="min-h-screen bg-[#f6f8fc] font-sans">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Seus Favoritos</h1>
            {user && (
              <p className="text-sm text-slate-400 mt-1">
                {favorites.length} {favorites.length === 1 ? 'Pokémon salvo' : 'Pokémon salvos'}
              </p>
            )}
          </div>
          {user && favorites.length > 0 && (
            <Link
              to="/team-builder"
              className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors"
            >
              Montar time com favoritos →
            </Link>
          )}
        </div>

        {!user ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-5xl mb-5">⭐</p>
            <h2 className="text-xl font-bold text-slate-700 mb-2">Faça login para ver seus favoritos</h2>
            <p className="text-slate-400 text-sm mb-8 max-w-sm mx-auto">
              Seus favoritos ficam salvos na nuvem e sincronizados em qualquer dispositivo.
            </p>
            <button
              onClick={openAuthModal}
              className="px-7 py-2.5 bg-red-500 text-white font-bold rounded-full hover:bg-red-600 transition-colors text-sm shadow-sm"
            >
              Fazer Login
            </button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-5xl mb-5">☆</p>
            <h2 className="text-xl font-bold text-slate-700 mb-2">Nenhum favorito ainda</h2>
            <p className="text-slate-400 text-sm mb-8 max-w-sm mx-auto">
              Clique na estrela ☆ em qualquer card da Pokédex para salvar um favorito.
            </p>
            <Link
              to="/"
              className="px-7 py-2.5 bg-red-500 text-white font-bold rounded-full hover:bg-red-600 transition-colors text-sm shadow-sm"
            >
              Explorar Pokédex
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {favorites.map((fav) => (
              <FavoritePokemonCard key={fav.pokemon_id} pokemonName={fav.pokemon_name} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
