import type { MouseEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../hooks/useFavorites';

interface FavoriteButtonProps {
  pokemonId: number;
  pokemonName: string;
  className?: string;
}

export default function FavoriteButton({ pokemonId, pokemonName, className = '' }: FavoriteButtonProps) {
  const { user, openAuthModal } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  const isFav = isFavorite(pokemonId);

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      openAuthModal();
      return;
    }
    toggleFavorite(pokemonId, pokemonName);
  };

  return (
    <button
      onClick={handleClick}
      aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className={`text-xl transition-transform hover:scale-125 cursor-pointer ${className}`}
    >
      {isFav ? '⭐' : '☆'}
    </button>
  );
}
