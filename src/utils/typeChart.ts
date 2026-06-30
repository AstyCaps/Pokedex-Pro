export const ALL_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
] as const;

export type PokemonType = (typeof ALL_TYPES)[number];

export const TYPE_COLORS: Record<string, string> = {
  normal: 'bg-[#A8A77A]', fire: 'bg-[#EE8130]', water: 'bg-[#6390F0]',
  electric: 'bg-[#F7D02C]', grass: 'bg-[#7AC74C]', ice: 'bg-[#96D9D6]',
  fighting: 'bg-[#C22E28]', poison: 'bg-[#A33EA1]', ground: 'bg-[#E2BF65]',
  flying: 'bg-[#A98FF3]', psychic: 'bg-[#F95587]', bug: 'bg-[#A6B91A]',
  rock: 'bg-[#B6A136]', ghost: 'bg-[#735797]', dragon: 'bg-[#6F35FC]',
  dark: 'bg-[#705746]', steel: 'bg-[#B7B7CE]', fairy: 'bg-[#D685AD]',
};

// Damage multiplier when an [attackingType] move hits a Pokémon of [defendingType].
// Only entries that differ from 1× are listed; everything else is implicitly 1×.
// Gen 6+ chart (includes Fairy type and Steel's Poison/Ghost immunity).
const ATTACK_CHART: Record<string, Record<string, number>> = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5, bug: 2, steel: 2, grass: 2, ice: 2 },
  water:    { water: 0.5, grass: 0.5, dragon: 0.5, fire: 2, ground: 2, rock: 2 },
  electric: { electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0, flying: 2, water: 2 },
  grass:    { fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5, ground: 2, rock: 2, water: 2 },
  ice:      { water: 0.5, ice: 0.5, steel: 0.5, flying: 2, ground: 2, grass: 2, dragon: 2 },
  fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, bug: 0.5, psychic: 0.5, flying: 0.5, fairy: 0.5, ghost: 0 },
  poison:   { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground:   { fire: 2, electric: 2, poison: 2, rock: 2, steel: 2, grass: 0.5, bug: 0.5, flying: 0 },
  flying:   { fighting: 2, bug: 2, grass: 2, rock: 0.5, steel: 0.5, electric: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
  bug:      { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
  rock:     { flying: 2, bug: 2, fire: 2, ice: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
  ghost:    { psychic: 2, ghost: 2, normal: 0, dark: 0.5 },
  dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
  dark:     { psychic: 2, ghost: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 },
  steel:    { ice: 2, rock: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
  fairy:    { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
};

/** Returns a map of attackingType → damage multiplier for a Pokémon with the given type(s). */
export function getDefensiveEffectiveness(pokemonTypes: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const attackType of ALL_TYPES) {
    let multiplier = 1;
    for (const defType of pokemonTypes) {
      multiplier *= (ATTACK_CHART[attackType]?.[defType] ?? 1);
    }
    result[attackType] = multiplier;
  }
  return result;
}

export interface CoverageEntry {
  type: string;
  weakCount: number;
  resistCount: number;
  immuneCount: number;
}

/** Aggregates defensive coverage across every Pokémon type-set in the team. */
export function calculateTeamCoverage(teamTypes: string[][]): CoverageEntry[] {
  return ALL_TYPES.map((attackType) => {
    let weakCount = 0, resistCount = 0, immuneCount = 0;
    for (const types of teamTypes) {
      const eff = getDefensiveEffectiveness(types)[attackType];
      if (eff === 0) immuneCount++;
      else if (eff < 1) resistCount++;
      else if (eff > 1) weakCount++;
    }
    return { type: attackType, weakCount, resistCount, immuneCount };
  });
}

// ── Cobertura Ofensiva ────────────────────────────────────────────────────────

export interface OffensiveCoverageEntry {
  type: string;
  maxMult: number;
  coveredBy: string[];
}

/**
 * For each of the 18 defending types, returns the highest damage multiplier
 * achievable by any move in `moveTypes`, plus which move types reach it.
 */
export function calculateOffensiveCoverage(moveTypes: string[]): OffensiveCoverageEntry[] {
  return ALL_TYPES.map((defendingType) => {
    let maxMult = 0;
    const coveredBy: string[] = [];
    for (const mType of moveTypes) {
      const mult = ATTACK_CHART[mType]?.[defendingType] ?? 1;
      if (mult > maxMult) {
        maxMult = mult;
        coveredBy.length = 0;
        coveredBy.push(mType);
      } else if (mult === maxMult && mult > 1 && !coveredBy.includes(mType)) {
        coveredBy.push(mType);
      }
    }
    return { type: defendingType, maxMult, coveredBy };
  });
}
