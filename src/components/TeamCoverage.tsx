import { useState } from 'react';
import { calculateTeamCoverage, calculateOffensiveCoverage } from '../utils/typeChart';
import TypeBadge from './TypeBadge';

interface TeamCoverageProps {
  teamTypes: string[][];
  teamMoveTypes?: string[];
}

type Tab = 'defensiva' | 'ofensiva';

export default function TeamCoverage({ teamTypes, teamMoveTypes = [] }: TeamCoverageProps) {
  const [tab, setTab] = useState<Tab>('defensiva');

  if (teamTypes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-3xl mb-3">🛡️</p>
        <p className="text-sm text-slate-400 font-medium">
          Adicione Pokémon ao time para ver a análise de cobertura de tipos.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Abas */}
      <div className="flex border-b border-slate-100 -mx-5 px-5 gap-4 mb-4">
        {(['defensiva', 'ofensiva'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-xs font-bold border-b-2 transition-colors cursor-pointer capitalize ${
              tab === t
                ? 'border-red-500 text-red-500'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {t === 'defensiva' ? '🛡 Defensiva' : '⚔️ Ofensiva'}
          </button>
        ))}
      </div>

      {tab === 'defensiva' && <DefensiveTab teamTypes={teamTypes} />}
      {tab === 'ofensiva' && <OffensiveTab teamMoveTypes={teamMoveTypes ?? []} />}
    </div>
  );
}

// ── Aba Defensiva ─────────────────────────────────────────────────────────────

function DefensiveTab({ teamTypes }: { teamTypes: string[][] }) {
  const coverage = calculateTeamCoverage(teamTypes);

  return (
    <div>
      <div className="flex items-center justify-end gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 pr-1">
        <span className="w-14 text-center">Fraqueza</span>
        <span className="w-14 text-center">Resist.</span>
      </div>

      <div className="space-y-1.5">
        {coverage.map(({ type, weakCount, resistCount, immuneCount }) => {
          const totalResist = resistCount + immuneCount;

          const weakStyle =
            weakCount >= 3 ? 'bg-red-500 text-white' :
            weakCount === 2 ? 'bg-orange-400 text-white' :
            weakCount === 1 ? 'bg-yellow-100 text-yellow-700' :
            'bg-slate-100 text-slate-300';

          const resistStyle =
            totalResist >= 3 ? 'bg-green-500 text-white' :
            totalResist >= 1 ? 'bg-emerald-100 text-emerald-700' :
            'bg-slate-100 text-slate-300';

          return (
            <div key={type} className="flex items-center gap-2">
              <div className="w-20 shrink-0">
                <TypeBadge type={type} size="sm" />
              </div>

              <span className={`w-14 text-center text-[11px] font-bold rounded-md py-0.5 transition-colors ${weakStyle}`}>
                {weakCount > 0 ? `✗ ×${weakCount}` : '—'}
              </span>

              <span className={`w-14 text-center text-[11px] font-bold rounded-md py-0.5 transition-colors ${resistStyle}`}>
                {totalResist > 0 ? `✓ ×${totalResist}` : '—'}
              </span>

              {immuneCount > 0 && (
                <span className="text-purple-500 text-[10px] font-black" title="Imune">
                  0×{immuneCount}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-[10px] text-slate-400">
        <p><span className="inline-block w-2.5 h-2.5 rounded bg-red-500 mr-1.5 align-middle"></span>≥3 fraquezas — vulnerabilidade crítica</p>
        <p><span className="inline-block w-2.5 h-2.5 rounded bg-green-500 mr-1.5 align-middle"></span>≥3 resistências — boa cobertura</p>
        <p><span className="text-purple-500 font-black mr-1.5">0×</span>Imunidade completa</p>
      </div>
    </div>
  );
}

// ── Aba Ofensiva ──────────────────────────────────────────────────────────────

function OffensiveTab({ teamMoveTypes }: { teamMoveTypes: string[] }) {
  if (teamMoveTypes.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-2xl mb-2">⚔️</p>
        <p className="text-xs text-slate-400 font-medium">
          Selecione movimentos nos slots do time para ver a cobertura ofensiva.
        </p>
      </div>
    );
  }

  const coverage = calculateOffensiveCoverage(teamMoveTypes);
  const gaps = coverage.filter((e) => e.maxMult < 2).length;

  return (
    <div>
      {gaps > 0 && (
        <p className="text-[10px] font-semibold text-orange-500 mb-2 text-right">
          {gaps} tipo{gaps > 1 ? 's' : ''} sem cobertura super-efetiva
        </p>
      )}

      <div className="flex items-center justify-end mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider pr-1">
        <span className="w-16 text-center">Máx. Dano</span>
      </div>

      <div className="space-y-1.5">
        {coverage.map(({ type, maxMult }) => {
          const isSuper = maxMult >= 2;
          const isGap   = maxMult < 2 && maxMult >= 1;
          const isWeak  = maxMult < 1 && maxMult > 0;
          const isImmune = maxMult === 0;

          const multStyle =
            isSuper  ? 'bg-green-500 text-white' :
            isGap    ? 'bg-yellow-100 text-yellow-700' :
            isWeak   ? 'bg-orange-100 text-orange-600' :
            isImmune ? 'bg-slate-200 text-slate-400' :
            'bg-slate-100 text-slate-300';

          const label =
            isImmune ? '0×' :
            maxMult === 0.5 ? '½×' :
            maxMult === 0.25 ? '¼×' :
            maxMult === 2 ? '×2' :
            maxMult === 4 ? '×4' :
            '×1';

          return (
            <div key={type} className="flex items-center gap-2">
              <div className="w-20 shrink-0">
                <TypeBadge type={type} size="sm" />
              </div>
              <span className={`w-16 text-center text-[11px] font-bold rounded-md py-0.5 ${multStyle}`}>
                {label}
              </span>
              {!isSuper && !isImmune && (
                <span className="text-[9px] text-orange-400 font-bold">Lacuna</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-[10px] text-slate-400">
        <p><span className="inline-block w-2.5 h-2.5 rounded bg-green-500 mr-1.5 align-middle"></span>×2 ou mais — tipo coberto</p>
        <p><span className="inline-block w-2.5 h-2.5 rounded bg-yellow-100 border border-yellow-200 mr-1.5 align-middle"></span>×1 — nenhum golpe super-efetivo (Lacuna)</p>
        <p><span className="inline-block w-2.5 h-2.5 rounded bg-orange-100 border border-orange-200 mr-1.5 align-middle"></span>Resistido ou imune</p>
      </div>
    </div>
  );
}
