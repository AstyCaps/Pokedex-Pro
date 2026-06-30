import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import TypeBadge from './TypeBadge';
import {
  STAT_NAMES, STAT_LABELS,
  NATURE_NAMES, NATURE_LABELS,
  DEFAULT_IVS, DEFAULT_EVS,
} from '../types';
import type { TeamMember, NatureName, StatName, SelectedMove, LearnMethod } from '../types';

interface SlotEditorProps {
  member: TeamMember;
  pokemonData?: any;
  onUpdate: (updated: TeamMember) => void;
  onClose: () => void;
}

const LEARN_METHOD_MAP: Record<string, LearnMethod> = {
  'level-up': 'Level Up',
  machine: 'TMs',
  egg: 'Egg Moves',
  tutor: 'Tutor',
};

const METHOD_ORDER: LearnMethod[] = ['Level Up', 'TMs', 'Egg Moves', 'Tutor'];

type GroupedMoves = Record<LearnMethod, string[]>;

function groupMoves(pokemonData: any): GroupedMoves {
  const groups: Record<LearnMethod, Set<string>> = {
    'Level Up': new Set(),
    TMs: new Set(),
    'Egg Moves': new Set(),
    Tutor: new Set(),
  };
  for (const entry of (pokemonData?.moves ?? [])) {
    const moveName: string = entry.move.name;
    for (const detail of entry.version_group_details) {
      const method = LEARN_METHOD_MAP[detail.move_learn_method.name as string];
      if (method) groups[method].add(moveName);
    }
  }
  return {
    'Level Up': [...groups['Level Up']].sort(),
    TMs: [...groups.TMs].sort(),
    'Egg Moves': [...groups['Egg Moves']].sort(),
    Tutor: [...groups.Tutor].sort(),
  };
}

export default function SlotEditor({ member, pokemonData, onUpdate, onClose }: SlotEditorProps) {
  const [local, setLocal] = useState<TeamMember>(member);
  const moveTypeCache = useRef<Record<string, string>>({});

  const { data: fullData } = useQuery({
    queryKey: ['pokemon', member.name],
    queryFn: () =>
      fetch(`https://pokeapi.co/api/v2/pokemon/${member.name}`).then((r) => r.json()),
    staleTime: 1000 * 60 * 30,
    initialData: pokemonData ?? undefined,
  });

  const groupedMoves: GroupedMoves | null = fullData ? groupMoves(fullData) : null;

  const fetchMoveType = async (moveName: string): Promise<string> => {
    if (moveTypeCache.current[moveName]) return moveTypeCache.current[moveName];
    try {
      const data = await fetch(`https://pokeapi.co/api/v2/move/${moveName}`).then((r) => r.json());
      const type: string = data.type?.name ?? 'normal';
      moveTypeCache.current[moveName] = type;
      return type;
    } catch {
      return 'normal';
    }
  };

  const setIv = (stat: StatName, raw: string) => {
    const val = Math.max(0, Math.min(31, parseInt(raw) || 0));
    setLocal((prev) => ({ ...prev, ivs: { ...prev.ivs, [stat]: val } }));
  };

  const setEv = (stat: StatName, raw: string) => {
    const clamped = Math.max(0, Math.min(252, parseInt(raw) || 0));
    setLocal((prev) => {
      const otherTotal = STAT_NAMES.reduce(
        (sum, s) => (s === stat ? sum : sum + (prev.evs[s] ?? 0)),
        0,
      );
      const allowed = Math.min(clamped, Math.max(0, 510 - otherTotal));
      return { ...prev, evs: { ...prev.evs, [stat]: allowed } };
    });
  };

  const handleMoveChange = async (slotIdx: number, moveName: string) => {
    if (!moveName) {
      setLocal((prev) => {
        const moves = [...prev.moves] as (SelectedMove | null)[];
        moves[slotIdx] = null;
        return { ...prev, moves };
      });
      return;
    }
    let learnMethod: LearnMethod = 'Level Up';
    if (groupedMoves) {
      for (const method of METHOD_ORDER) {
        if (groupedMoves[method].includes(moveName)) { learnMethod = method; break; }
      }
    }
    const type = await fetchMoveType(moveName);
    setLocal((prev) => {
      const moves = [...prev.moves] as (SelectedMove | null)[];
      moves[slotIdx] = { name: moveName, type, learnMethod };
      return { ...prev, moves };
    });
  };

  const totalEvs = STAT_NAMES.reduce((sum, s) => sum + (local.evs[s] ?? 0), 0);
  const displaySprite = local.isShiny ? local.shinySprite : local.sprite;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <img src={displaySprite} alt={local.name} className="w-14 h-14 object-contain" />
            <div>
              <h2 className="text-base font-bold text-slate-800 capitalize">{local.name}</h2>
              <div className="flex gap-1 mt-0.5">
                {local.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-red-500 text-xl font-bold transition-colors cursor-pointer"
            aria-label="Fechar editor"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* ── Shiny ── */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={local.isShiny}
              onClick={() => setLocal((p) => ({ ...p, isShiny: !p.isShiny }))}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                local.isShiny ? 'bg-yellow-400' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  local.isShiny ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-sm font-semibold text-slate-700">
              {local.isShiny ? '✨ Shiny' : 'Shiny'}
            </span>
          </div>

          {/* ── Nature ── */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Nature
            </label>
            <select
              value={local.nature}
              onChange={(e) => setLocal((p) => ({ ...p, nature: e.target.value as NatureName }))}
              className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-xl outline-none focus:border-red-500 bg-white cursor-pointer"
            >
              {NATURE_NAMES.map((n) => (
                <option key={n} value={n}>{NATURE_LABELS[n]}</option>
              ))}
            </select>
          </div>

          {/* ── IVs / EVs ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                IVs / EVs
              </span>
              <span className={`text-xs font-bold ${totalEvs > 510 ? 'text-red-500' : 'text-slate-400'}`}>
                EVs: {totalEvs} / 510
              </span>
            </div>

            <div className="grid grid-cols-[1fr_52px_52px] gap-x-2 mb-1 text-[10px] font-bold uppercase tracking-wider">
              <span className="text-slate-400">Estatística</span>
              <span className="text-center text-blue-400">IV</span>
              <span className="text-center text-purple-400">EV</span>
            </div>

            <div className="space-y-1.5">
              {STAT_NAMES.map((stat) => (
                <div key={stat} className="grid grid-cols-[1fr_52px_52px] gap-x-2 items-center">
                  <span className="text-xs font-semibold text-slate-600">{STAT_LABELS[stat]}</span>
                  <input
                    type="number" min={0} max={31}
                    value={local.ivs[stat] ?? DEFAULT_IVS[stat]}
                    onChange={(e) => setIv(stat, e.target.value)}
                    className="w-full px-1 py-1.5 text-xs text-center border-2 border-blue-200 rounded-lg outline-none focus:border-blue-400 bg-blue-50"
                  />
                  <input
                    type="number" min={0} max={252}
                    value={local.evs[stat] ?? DEFAULT_EVS[stat]}
                    onChange={(e) => setEv(stat, e.target.value)}
                    className="w-full px-1 py-1.5 text-xs text-center border-2 border-purple-200 rounded-lg outline-none focus:border-purple-400 bg-purple-50"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Moves ── */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Moves (up to 4)
            </label>

            {!groupedMoves ? (
              <p className="text-xs text-slate-400 text-center py-4 animate-pulse">
                Carregando movimentos disponíveis…
              </p>
            ) : (
              <div className="space-y-2">
                {([0, 1, 2, 3] as const).map((i) => {
                  const currentMove = local.moves[i];
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 w-3 shrink-0 text-center">
                        {i + 1}
                      </span>
                      <select
                        value={currentMove?.name ?? ''}
                        onChange={(e) => handleMoveChange(i, e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs border-2 border-slate-200 rounded-xl outline-none focus:border-red-500 bg-white cursor-pointer capitalize"
                      >
                        <option value="">— None —</option>
                        {METHOD_ORDER.map((method) =>
                          groupedMoves[method].length > 0 ? (
                            <optgroup key={method} label={method}>
                              {groupedMoves[method].map((m) => (
                                <option key={m} value={m} className="capitalize">
                                  {m.replace(/-/g, ' ')}
                                </option>
                              ))}
                            </optgroup>
                          ) : null,
                        )}
                      </select>
                      {currentMove && (
                        <TypeBadge type={currentMove.type} size="sm" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex justify-end gap-2 p-5 border-t border-slate-100 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={() => { onUpdate(local); onClose(); }}
            className="px-5 py-2 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors cursor-pointer"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
