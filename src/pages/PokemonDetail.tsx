import { useState, useMemo } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { type PokemonDetails } from '../types';
import { fetchPokemonByName, GAME_OPTIONS, VERSION_RECENCY_ORDER } from '../utils/pokemonApi';
import Navbar from '../components/Navbar';
import TypeBadge from '../components/TypeBadge';
import FavoriteButton from '../components/FavoriteButton';

const STALE_30_MIN = 1000 * 60 * 30;

const STAT_COLORS: Record<string, string> = {
  hp: 'bg-green-500',
  attack: 'bg-red-500',
  defense: 'bg-orange-500',
  'special-attack': 'bg-pink-500',
  'special-defense': 'bg-indigo-500',
  speed: 'bg-teal-500',
};

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Ataque',
  defense: 'Defesa',
  'special-attack': 'Atq. Esp.',
  'special-defense': 'Def. Esp.',
  speed: 'Velocidade',
};

interface FlavorEntry {
  flavor_text: string;
  language: { name: string };
  version: { name: string };
}

interface SpeciesData {
  flavor_text_entries: FlavorEntry[];
}

function cleanFlavorText(text: string): string {
  return text
    .replace(/[\n\f\r]/g, ' ')
    .replace(/­/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function PokemonDetail() {
  const { name } = useParams<{ name: string }>();
  const location = useLocation();
  const routeGame = (location.state as { game?: string } | null)?.game;
  const activeGame = routeGame && routeGame !== 'all' ? routeGame : null;

  const [forceLatest, setForceLatest] = useState(false);

  const { data: pokemon, isLoading, isError } = useQuery<PokemonDetails>({
    queryKey: ['pokemon', name],
    queryFn: () => fetchPokemonByName(name as string),
    enabled: !!name,
    staleTime: STALE_30_MIN,
  });

  const { data: species } = useQuery<SpeciesData>({
    queryKey: ['species', name],
    queryFn: () =>
      fetch(`https://pokeapi.co/api/v2/pokemon-species/${name}`).then((r) => {
        if (!r.ok) throw new Error('species not found');
        return r.json();
      }),
    enabled: !!name,
    staleTime: STALE_30_MIN,
    retry: false,
  });

  const flavorResult = useMemo(() => {
    if (!species) return null;
    const engEntries = species.flavor_text_entries.filter((e) => e.language.name === 'en');
    if (engEntries.length === 0) return null;

    if (activeGame && !forceLatest) {
      const gameOption = GAME_OPTIONS.find((g) => g.value === activeGame);
      const gameVersions = gameOption?.versionNames ?? [];
      const match = engEntries.find((e) => gameVersions.includes(e.version.name));
      if (match) {
        return { text: cleanFlavorText(match.flavor_text), version: match.version.name, found: true as const };
      }
      return { text: '', version: '', found: false as const };
    }

    for (const vname of VERSION_RECENCY_ORDER) {
      const match = engEntries.find((e) => e.version.name === vname);
      if (match) {
        return { text: cleanFlavorText(match.flavor_text), version: match.version.name, found: true as const };
      }
    }

    const last = engEntries[engEntries.length - 1];
    return last
      ? { text: cleanFlavorText(last.flavor_text), version: last.version.name, found: true as const }
      : null;
  }, [species, activeGame, forceLatest]);

  const activeGameLabel = activeGame
    ? GAME_OPTIONS.find((g) => g.value === activeGame)?.label
    : null;

  return (
    <div className="min-h-screen bg-[#f6f8fc] font-sans">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-10">
        {isLoading && (
          <div className="text-center text-xl font-semibold mt-10 text-slate-600 animate-pulse">
            Carregando dados do Pokémon…
          </div>
        )}
        {(isError || (!isLoading && !pokemon)) && (
          <div className="text-center text-xl font-semibold mt-10 text-red-500">
            Pokémon não encontrado!
          </div>
        )}

        {pokemon && (
          <>
            <Link
              to="/"
              className="inline-block text-red-500 font-bold hover:text-red-600 transition-colors mb-6"
            >
              ← Voltar para a Pokédex
            </Link>

            <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100">
              {/* Cabeçalho */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-5 mb-8">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 capitalize tracking-tight">
                    {pokemon.name}
                  </h1>
                  <FavoriteButton
                    pokemonId={pokemon.id}
                    pokemonName={pokemon.name}
                    className="text-2xl"
                  />
                </div>
                <span className="text-2xl font-black text-slate-300">
                  Nº {String(pokemon.id).padStart(3, '0')}
                </span>
              </div>

              {/* Sprite + Estatísticas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Esquerda: sprite + tipos + medidas */}
                <div className="flex flex-col items-center">
                  <img
                    className="w-64 h-64 md:w-72 md:h-72 object-contain bg-slate-50 rounded-2xl p-6"
                    src={
                      pokemon.sprites.other['official-artwork'].front_default ??
                      pokemon.sprites.front_default ??
                      ''
                    }
                    alt={pokemon.name}
                  />

                  <div className="flex gap-2 my-5">
                    {pokemon.types.map((t) => (
                      <TypeBadge key={t.type.name} type={t.type.name} />
                    ))}
                  </div>

                  <div className="flex gap-10 mt-2 text-center">
                    <div>
                      <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">
                        Altura
                      </span>
                      <strong className="text-slate-700 text-lg">{pokemon.height / 10} m</strong>
                    </div>
                    <div className="w-px bg-slate-100" />
                    <div>
                      <span className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">
                        Peso
                      </span>
                      <strong className="text-slate-700 text-lg">{pokemon.weight / 10} kg</strong>
                    </div>
                  </div>
                </div>

                {/* Direita: estatísticas */}
                <div className="flex flex-col justify-center">
                  <h2 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-2">
                    Estatísticas de Combate
                  </h2>
                  <div className="space-y-4">
                    {pokemon.stats?.map((s) => {
                      const pct = Math.min((s.base_stat / 150) * 100, 100);
                      return (
                        <div key={s.stat.name} className="flex items-center">
                          <span className="w-24 text-sm font-semibold text-slate-500">
                            {STAT_LABELS[s.stat.name] ?? s.stat.name}
                          </span>
                          <span className="w-12 text-sm font-bold text-slate-800 text-right pr-4">
                            {s.base_stat}
                          </span>
                          <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${STAT_COLORS[s.stat.name] ?? 'bg-slate-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Entrada da Pokédex (flavor text) */}
              {species && (
                <div className="mt-8 pt-7 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Pokédex
                    </h2>
                    {activeGameLabel && !forceLatest && flavorResult?.found && (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {activeGameLabel}
                      </span>
                    )}
                  </div>

                  {!flavorResult ? (
                    <p className="text-slate-400 text-sm italic">Descrição não disponível.</p>
                  ) : !flavorResult.found ? (
                    <div>
                      <p className="text-slate-400 text-sm italic mb-4">
                        Não há informação sobre o pokémon nessa versão
                      </p>
                      <button
                        onClick={() => setForceLatest(true)}
                        className="text-sm font-semibold text-red-500 hover:text-red-600 transition-colors underline underline-offset-2 cursor-pointer"
                      >
                        Mostrar a descrição da última versão
                      </button>
                    </div>
                  ) : (
                    <div>
                      {forceLatest && activeGame && (
                        <p className="text-[10px] text-slate-400 mb-3">
                          Exibindo descrição da versão mais recente disponível
                        </p>
                      )}
                      <p className="text-slate-700 text-sm leading-relaxed italic">
                        "{flavorResult.text}"
                      </p>
                      {flavorResult.version && (
                        <p className="text-[11px] text-slate-400 mt-2 text-right capitalize">
                          — {flavorResult.version.replace(/-/g, ' ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
