import { Link } from 'react-router-dom';
import TypeBadge from './TypeBadge';
import FavoriteButton from './FavoriteButton';

interface PokemonCardProps {
  pokemon: {
    id: number;
    name: string;
    sprites: {
      front_default: string | null;
      other: { 'official-artwork': { front_default: string | null } };
    };
    types: { type: { name: string } }[];
  };
  game?: string;
}

// Retorna a melhor URL de sprite disponível (artwork oficial > sprite padrão)
function resolveSprite(pokemon: PokemonCardProps['pokemon']): string {
  return (
    pokemon.sprites.other['official-artwork'].front_default ??
    pokemon.sprites.front_default ??
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`
  );
}

export default function PokemonCard({ pokemon, game }: PokemonCardProps) {
  return (
    <div className="group relative flex flex-col items-center bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1.5 transition-all duration-300">
      <FavoriteButton
        pokemonId={pokemon.id}
        pokemonName={pokemon.name}
        className="absolute top-4 left-4 z-20"
      />

      <Link to={`/pokemon/${pokemon.name}`} state={{ game }} className="w-full flex flex-col items-center">
        <span className="absolute top-4 right-4 font-bold text-xs text-slate-300">
          Nº {String(pokemon.id).padStart(3, '0')}
        </span>

        <div className="w-full bg-slate-50 group-hover:bg-slate-100 rounded-xl p-4 flex justify-center items-center mb-4 transition-colors">
          <img
            className="w-32 h-32 object-contain group-hover:scale-105 transition-transform duration-300"
            src={resolveSprite(pokemon)}
            alt={pokemon.name}
            loading="lazy"
          />
        </div>

        <h3 className="text-lg font-bold text-slate-800 capitalize mb-2 tracking-tight">
          {pokemon.name}
        </h3>

        <div className="flex gap-1.5 justify-center flex-wrap">
          {pokemon.types.map((t) => (
            <TypeBadge key={t.type.name} type={t.type.name} />
          ))}
        </div>
      </Link>
    </div>
  );
}
