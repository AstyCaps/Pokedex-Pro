import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '../components/Navbar';
import PokemonCard from '../components/PokemonCard';
import { ALL_TYPES } from '../utils/typeChart';
import { fetchAllPokemons, fetchPokemonsByGame, GAME_OPTIONS } from '../utils/pokemonApi';

const STALE_30_MIN = 1000 * 60 * 30;

export default function Home() {
  const [search, setSearch] = useState('');
  const [selectedGame, setSelectedGame] = useState('all');
  const [type1, setType1] = useState('all');
  const [type2, setType2] = useState('all');
  const [showNational, setShowNational] = useState(false);

  const currentGameOption = GAME_OPTIONS.find((g) => g.value === selectedGame)!;
  const gameSelected = selectedGame !== 'all';
  const hasNationalToggle = gameSelected && currentGameOption.nationalLimit !== undefined;
  const nationalViewActive = gameSelected && showNational;

  // ── Consulta 1: Pokédex Nacional completa ────────────────────────────────────
  // Habilitada tanto na visão "Todos" quanto quando o toggle Nacional estiver ON.
  const {
    data: allPokemons,
    isLoading: allLoading,
    isError: allError,
  } = useQuery({
    queryKey: ['pokemonsList'],
    queryFn: fetchAllPokemons,
    enabled: !gameSelected || nationalViewActive,
    staleTime: STALE_30_MIN,
  });

  // ── Consulta 2: Pokédex Local do jogo selecionado (ordem regional) ────────────
  const {
    data: gamePokemons,
    isLoading: gameLoading,
    isError: gameError,
  } = useQuery({
    queryKey: ['gamePokemons', selectedGame],
    queryFn: () => fetchPokemonsByGame(currentGameOption.pokedexNames),
    enabled: gameSelected,
    staleTime: STALE_30_MIN,
  });

  // ── Seleciona a fonte de dados conforme o modo ativo ─────────────────────────
  const pokemons: any[] = (() => {
    if (!gameSelected) return allPokemons ?? [];
    if (nationalViewActive) {
      const limit = currentGameOption.nationalLimit ?? 9999;
      return (allPokemons ?? []).filter((p: any) => p.id <= limit);
    }
    return gamePokemons ?? [];
  })();

  const isLoading = !gameSelected ? allLoading : nationalViewActive ? allLoading : gameLoading;
  const isError   = !gameSelected ? allError  : nationalViewActive ? allError  : gameError;

  // ── Filtragem client-side por nome e tipos ────────────────────────────────────
  const filtered = pokemons.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const types: string[] = p.types.map((t: any) => t.type.name);
    const matchesType1 = type1 === 'all' || types.includes(type1);
    const matchesType2 = type2 === 'all' || types.includes(type2);
    return matchesSearch && matchesType1 && matchesType2;
  });

  const loadingLabel = !gameSelected
    ? 'Carregando todos os Pokémon (Gerações 1–9)… Aguarde um momento.'
    : nationalViewActive
    ? `Carregando National Pokédex de ${currentGameOption.label}…`
    : `Carregando Pokédex local de ${currentGameOption.label}…`;

  const handleGameChange = (value: string) => {
    setSelectedGame(value);
    setShowNational(false);
    setType1('all');
    setType2('all');
    setSearch('');
  };

  return (
    <div className="min-h-screen bg-[#f6f8fc] font-sans">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-red-500 tracking-tight mb-1">Pokédex</h1>
          <p className="text-sm text-slate-400">
            {isLoading
              ? 'Carregando…'
              : `${filtered.length}${pokemons.length > 0 && filtered.length < pokemons.length ? ` de ${pokemons.length}` : ''} Pokémon`}
            {gameSelected && !nationalViewActive && !isLoading && (
              <span className="ml-2 text-slate-300">· ordem da Pokédex local</span>
            )}
            {gameSelected && nationalViewActive && !isLoading && (
              <span className="ml-2 text-slate-300">· National Pokédex</span>
            )}
          </p>
        </div>

        {/* Campo de busca */}
        <input
          type="text"
          className="w-full max-w-lg block mx-auto mb-6 px-5 py-3 text-base border-2 border-slate-200 rounded-full outline-none focus:border-red-500 transition-colors shadow-sm bg-white"
          placeholder="Buscar Pokémon por nome…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Filtros */}
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          {/* Filtro por Jogo */}
          <select
            value={selectedGame}
            onChange={(e) => handleGameChange(e.target.value)}
            className="px-4 py-2.5 font-semibold text-slate-700 border-2 border-slate-200 rounded-xl bg-white cursor-pointer outline-none focus:border-red-500 transition-colors"
          >
            {GAME_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>

          {/* Toggle National Pokédex — visível apenas quando um jogo está selecionado e tem limite nacional */}
          {hasNationalToggle && (
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <button
                type="button"
                role="switch"
                aria-checked={showNational}
                onClick={() => setShowNational((v) => !v)}
                className={`relative w-10 h-5.5 rounded-full transition-colors ${
                  showNational ? 'bg-red-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.75 left-0.75 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    showNational ? 'translate-x-4.5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-sm font-semibold text-slate-600">
                Habilitar National Pokédex
              </span>
            </label>
          )}

          {/* Filtro por Tipo Primário */}
          <select
            value={type1}
            onChange={(e) => setType1(e.target.value)}
            className="px-4 py-2.5 font-semibold text-slate-700 border-2 border-slate-200 rounded-xl bg-white cursor-pointer outline-none focus:border-red-500 transition-colors"
          >
            <option value="all">Tipo Primário (Todos)</option>
            {[...ALL_TYPES].map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>

          {/* Filtro por Tipo Secundário */}
          <select
            value={type2}
            onChange={(e) => setType2(e.target.value)}
            className="px-4 py-2.5 font-semibold text-slate-700 border-2 border-slate-200 rounded-xl bg-white cursor-pointer outline-none focus:border-red-500 transition-colors"
          >
            <option value="all">Tipo Secundário (Todos)</option>
            {[...ALL_TYPES].map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Estados de carregamento / erro */}
        {isLoading && (
          <div className="text-center py-16">
            <p className="text-lg font-semibold text-slate-500 animate-pulse">{loadingLabel}</p>
            {!gameSelected && (
              <p className="text-xs text-slate-400 mt-2">
                São mais de 1.000 Pokémon — o cache é salvo por 30 minutos após o primeiro carregamento.
              </p>
            )}
          </div>
        )}
        {isError && (
          <div className="text-center py-16 text-red-500 font-semibold">
            Erro ao carregar os dados. Verifique sua conexão e tente novamente.
          </div>
        )}

        {/* Grade de cards */}
        {!isLoading && !isError && (
          <>
            {filtered.length === 0 ? (
              <div className="text-center font-medium text-slate-500 py-16">
                Nenhum Pokémon encontrado com essa combinação de filtros.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filtered.map((pokemon: any) => (
                  <PokemonCard key={pokemon.id} pokemon={pokemon} game={selectedGame} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
