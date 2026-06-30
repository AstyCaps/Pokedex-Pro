import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useTeams } from '../hooks/useTeams';
import { useFavorites } from '../hooks/useFavorites';
import { fetchAllPokemons, fetchPokemonsByGame, fetchPokemonByName, GAME_OPTIONS } from '../utils/pokemonApi';
import { ALL_TYPES } from '../utils/typeChart';
import Navbar from '../components/Navbar';
import TypeBadge from '../components/TypeBadge';
import TeamCoverage from '../components/TeamCoverage';
import SlotEditor from '../components/SlotEditor';
import { DEFAULT_IVS, DEFAULT_EVS, NATURE_LABELS } from '../types';
import type { TeamMember, TeamRow, NatureName, StatName, SelectedMove } from '../types';

const STALE_30_MIN = 1000 * 60 * 30;

function resolveSprite(p: any): string {
  return (
    p.sprites?.other?.['official-artwork']?.front_default ??
    p.sprites?.front_default ??
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`
  );
}

function resolveShinySprite(p: any): string {
  return (
    p.sprites?.front_shiny ??
    resolveSprite(p)
  );
}

function makeMember(pokemon: any): TeamMember {
  return {
    id: pokemon.id,
    name: pokemon.name,
    sprite: resolveSprite(pokemon),
    shinySprite: resolveShinySprite(pokemon),
    types: pokemon.types.map((t: any) => t.type.name),
    isShiny: false,
    nature: 'hardy',
    ivs: { ...DEFAULT_IVS },
    evs: { ...DEFAULT_EVS },
    moves: [null, null, null, null],
  };
}

export default function TeamBuilderPage() {
  const { user, openAuthModal } = useAuth();
  const { teams, saveTeam, deleteTeam, isSaving, isDeleting } = useTeams();
  const { favorites, favoriteIds } = useFavorites();

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamName, setTeamName] = useState('Meu Time');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedGame, setSelectedGame] = useState('all');
  const [activeTab, setActiveTab] = useState<'search' | 'favorites'>('search');
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loadingTeamId, setLoadingTeamId] = useState<string | null>(null);
  const [editingSlotIdx, setEditingSlotIdx] = useState<number | null>(null);

  const currentGameOption = GAME_OPTIONS.find((g) => g.value === selectedGame)!;

  const { data: allPokemons, isLoading: allLoading, isError: allError } = useQuery({
    queryKey: ['pokemonsList'],
    queryFn: fetchAllPokemons,
    enabled: selectedGame === 'all',
    staleTime: STALE_30_MIN,
  });

  const { data: gamePokemons, isLoading: gameLoading, isError: gameError } = useQuery({
    queryKey: ['gamePokemons', selectedGame],
    queryFn: () => fetchPokemonsByGame(currentGameOption.pokedexNames),
    enabled: selectedGame !== 'all',
    staleTime: STALE_30_MIN,
  });

  const availablePokemons: any[] = (selectedGame === 'all' ? allPokemons : gamePokemons) ?? [];
  const isLoading = selectedGame === 'all' ? allLoading : gameLoading;
  const isError = selectedGame === 'all' ? allError : gameError;

  const filtered = availablePokemons.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || p.types.some((t: any) => t.type.name === filterType);
    return matchesSearch && matchesType;
  });

  const favPokemons = availablePokemons.filter((p: any) => favoriteIds.includes(p.id));

  // ── Ações do time ─────────────────────────────────────────────────────────

  const addToTeam = (pokemon: any) => {
    if (team.length >= 6 || team.some((m) => m.id === pokemon.id)) return;
    setTeam((prev) => [...prev, makeMember(pokemon)]);
  };

  const removeFromTeam = (id: number) => setTeam((prev) => prev.filter((m) => m.id !== id));

  const updateMember = (idx: number, updated: TeamMember) =>
    setTeam((prev) => prev.map((m, i) => (i === idx ? updated : m)));

  const clearTeam = () => { setTeam([]); setTeamName('Meu Time'); };

  const loadSavedTeam = async (teamRow: TeamRow) => {
    setLoadingTeamId(teamRow.id);
    try {
      const sorted = [...teamRow.team_pokemons].sort((a, b) => a.slot - b.slot);
      const members: TeamMember[] = await Promise.all(
        sorted.map(async (tp) => {
          const cached = availablePokemons.find((p: any) => p.name === tp.pokemon_name);
          const data = cached ?? await fetchPokemonByName(tp.pokemon_name);

          const savedMoves = (tp.moves ?? []) as (SelectedMove | null)[];
          const moves: (SelectedMove | null)[] = [null, null, null, null];
          savedMoves.forEach((m, i) => { if (i < 4) moves[i] = m; });

          return {
            id: data.id,
            name: data.name,
            sprite: resolveSprite(data),
            shinySprite: resolveShinySprite(data),
            types: data.types.map((t: any) => t.type.name),
            isShiny: tp.is_shiny ?? false,
            nature: ((tp.nature ?? 'hardy') as NatureName),
            ivs: (tp.ivs as Record<StatName, number>) ?? { ...DEFAULT_IVS },
            evs: (tp.evs as Record<StatName, number>) ?? { ...DEFAULT_EVS },
            moves,
          };
        }),
      );
      setTeam(members);
      setTeamName(teamRow.name);
    } finally {
      setLoadingTeamId(null);
    }
  };

  const handleSave = async () => {
    if (!user) { openAuthModal(); return; }
    if (team.length === 0) {
      setStatusMsg({ text: 'Adicione pelo menos 1 Pokémon ao time antes de salvar!', ok: false });
      setTimeout(() => setStatusMsg(null), 3000);
      return;
    }
    try {
      await saveTeam(teamName, team);
      setStatusMsg({ text: 'Time salvo com sucesso!', ok: true });
    } catch {
      setStatusMsg({ text: 'Erro ao salvar o time. Tente novamente.', ok: false });
    }
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleDelete = async (teamId: string) => {
    if (!confirm('Tem certeza que deseja excluir este time?')) return;
    await deleteTeam(teamId);
  };

  const teamTypes = team.map((m) => m.types);
  const teamMoveTypes = team.flatMap((m) =>
    m.moves.filter(Boolean).map((mv) => (mv as SelectedMove).type),
  );
  const teamFull = team.length >= 6;
  const listSource = activeTab === 'favorites' ? favPokemons : filtered;

  return (
    <div className="min-h-screen bg-[#f6f8fc] font-sans">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Team Builder</h1>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Nome do time…"
              className="px-3 py-2 text-sm border-2 border-slate-200 rounded-xl outline-none focus:border-red-500 transition-colors bg-white w-40"
            />
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? 'Salvando…' : 'Salvar Time'}
            </button>
            <button
              onClick={clearTeam}
              className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Novo Time
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-semibold text-center border ${
            statusMsg.ok
              ? 'bg-green-50 text-green-700 border-green-100'
              : 'bg-red-50 text-red-600 border-red-100'
          }`}>
            {statusMsg.text}
          </div>
        )}

        {/* Times salvos */}
        {user && teams.length > 0 && (
          <div className="mb-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Times Salvos ({teams.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {teams.map((t) => (
                <div key={t.id} className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                  <button
                    onClick={() => loadSavedTeam(t)}
                    disabled={loadingTeamId === t.id}
                    className="text-xs font-semibold text-slate-700 hover:text-red-500 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loadingTeamId === t.id ? 'Carregando…' : t.name}
                    <span className="text-slate-400 font-normal ml-1">({t.team_pokemons.length})</span>
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={isDeleting}
                    className="text-slate-300 hover:text-red-400 text-xs font-bold transition-colors ml-1 cursor-pointer"
                    aria-label="Excluir time"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grade 3 colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ESQUERDA — Busca */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex border-b border-slate-100 -mx-5 px-5 gap-4">
              {(['search', 'favorites'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-2 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                    activeTab === tab
                      ? 'border-red-500 text-red-500'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab === 'search' ? 'Buscar' : `Favoritos (${favorites.length})`}
                </button>
              ))}
            </div>

            {activeTab === 'search' && (
              <>
                <input
                  type="text"
                  placeholder="Buscar por nome…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-3 py-2 text-sm border-2 border-slate-200 rounded-xl outline-none focus:border-red-500 transition-colors"
                />
                <div className="grid grid-cols-1 gap-2">
                  <select
                    value={selectedGame}
                    onChange={(e) => { setSelectedGame(e.target.value); setSearch(''); }}
                    className="px-3 py-2 text-xs font-semibold border-2 border-slate-200 rounded-xl outline-none focus:border-red-500 transition-colors bg-white cursor-pointer"
                  >
                    {GAME_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold border-2 border-slate-200 rounded-xl outline-none focus:border-red-500 transition-colors bg-white cursor-pointer"
                  >
                    <option value="all">Todos os Tipos</option>
                    {[...ALL_TYPES].map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {activeTab === 'favorites' && !user && (
              <p className="text-xs text-slate-400 text-center py-4">
                Faça login para ver seus Pokémon favoritos.
              </p>
            )}

            <div className="overflow-y-auto max-h-[52vh] -mx-1 px-1 space-y-1.5 mt-1">
              {isLoading && (
                <p className="text-sm text-slate-400 text-center py-6 animate-pulse">
                  {selectedGame === 'all'
                    ? 'Carregando todos os Pokémon…'
                    : `Carregando ${currentGameOption.label}…`}
                </p>
              )}
              {isError && (
                <p className="text-sm text-red-400 text-center py-6">Erro ao carregar os dados.</p>
              )}
              {!isLoading && listSource.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">
                  {activeTab === 'favorites'
                    ? 'Nenhum favorito disponível para este filtro.'
                    : 'Nenhum Pokémon encontrado.'}
                </p>
              )}
              {listSource.map((p: any) => {
                const inTeam = team.some((m) => m.id === p.id);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${
                      inTeam ? 'border-red-200 bg-red-50' : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={resolveSprite(p)}
                      alt={p.name}
                      className="w-10 h-10 object-contain shrink-0"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="capitalize text-xs font-bold text-slate-700 truncate">{p.name}</p>
                      <div className="flex gap-0.5 mt-0.5 flex-wrap">
                        {p.types.map((t: any) => (
                          <TypeBadge key={t.type.name} type={t.type.name} size="sm" />
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => addToTeam(p)}
                      disabled={inTeam || teamFull}
                      title={teamFull && !inTeam ? 'Time cheio (máx. 6 Pokémon)' : ''}
                      className={`shrink-0 text-xs font-bold w-7 h-7 rounded-lg transition-colors flex items-center justify-center ${
                        inTeam
                          ? 'bg-red-100 text-red-400 cursor-default'
                          : teamFull
                          ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                          : 'bg-red-100 text-red-600 hover:bg-red-200 cursor-pointer'
                      }`}
                    >
                      {inTeam ? '✓' : '+'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CENTRO — Slots */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-700">
                Seu Time
                <span className="ml-2 text-slate-400 font-normal text-sm">({team.length}/6)</span>
              </h2>
              {team.length > 0 && (
                <button
                  onClick={clearTeam}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => {
                const member = team[i];
                const displaySprite = member
                  ? (member.isShiny ? member.shinySprite : member.sprite)
                  : null;

                return (
                  <div
                    key={i}
                    className={`border-2 rounded-xl flex flex-col items-center justify-center relative transition-all ${
                      member
                        ? 'border-slate-200 bg-slate-50 pt-6 pb-3 px-2'
                        : 'border-dashed border-slate-200 bg-white h-36'
                    }`}
                  >
                    {member ? (
                      <>
                        {/* Remover */}
                        <button
                          onClick={() => removeFromTeam(member.id)}
                          className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold hover:bg-red-600 transition-colors cursor-pointer"
                          aria-label={`Remover ${member.name}`}
                        >
                          ✕
                        </button>

                        {/* Shiny badge */}
                        {member.isShiny && (
                          <span className="absolute top-1.5 left-1.5 text-[9px] font-bold text-yellow-500" title="Shiny">
                            ✨
                          </span>
                        )}

                        <img
                          src={displaySprite!}
                          alt={member.name}
                          className="w-14 h-14 object-contain"
                        />

                        <p className="capitalize text-[11px] font-bold text-slate-700 mt-1 truncate w-full text-center">
                          {member.name}
                        </p>

                        <div className="flex gap-0.5 mt-0.5 justify-center flex-wrap">
                          {member.types.map((t) => (
                            <TypeBadge key={t} type={t} size="sm" />
                          ))}
                        </div>

                        {/* Natureza + movimentos resumo */}
                        <p className="text-[9px] text-slate-400 mt-1 font-medium">
                          {NATURE_LABELS[member.nature]}
                          {member.moves.some(Boolean) && (
                            <span className="ml-1 text-indigo-400">
                              · {member.moves.filter(Boolean).length} mov.
                            </span>
                          )}
                        </p>

                        {/* Editar */}
                        <button
                          onClick={() => setEditingSlotIdx(i)}
                          className="mt-2 text-[10px] font-bold text-red-500 hover:text-red-600 border border-red-200 hover:border-red-400 rounded-lg px-2 py-0.5 transition-colors cursor-pointer"
                        >
                          Editar
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-300 font-medium">Slot {i + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {teamFull && (
              <p className="text-center text-xs text-slate-400 mt-4 font-medium">
                Time completo! Salve ou substitua membros.
              </p>
            )}
          </div>

          {/* DIREITA — Cobertura */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-base font-bold text-slate-700 mb-4">Cobertura de Tipos</h2>
            <TeamCoverage teamTypes={teamTypes} teamMoveTypes={teamMoveTypes} />
          </div>
        </div>
      </div>

      {/* Modal de edição do slot */}
      {editingSlotIdx !== null && team[editingSlotIdx] && (
        <SlotEditor
          member={team[editingSlotIdx]}
          pokemonData={availablePokemons.find((p: any) => p.name === team[editingSlotIdx].name)}
          onUpdate={(updated) => updateMember(editingSlotIdx, updated)}
          onClose={() => setEditingSlotIdx(null)}
        />
      )}
    </div>
  );
}
