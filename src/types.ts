export interface BasePokemon {
  name: string;
  url: string;
}

export interface PokemonDetails {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprites: {
    front_default: string;
    front_shiny: string;
    other: {
      'official-artwork': {
        front_default: string;
      };
    };
  };
  types: { type: { name: string } }[];
  stats: {
    base_stat: number;
    effort: number;
    stat: { name: string; url: string };
  }[];
}

// ── Estatísticas ─────────────────────────────────────────────────────────────

export const STAT_NAMES = [
  'hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed',
] as const;
export type StatName = (typeof STAT_NAMES)[number];

export const STAT_LABELS: Record<StatName, string> = {
  hp: 'HP',
  attack: 'Ataque',
  defense: 'Defesa',
  'special-attack': 'Atq. Esp.',
  'special-defense': 'Def. Esp.',
  speed: 'Velocidade',
};

export const DEFAULT_IVS: Record<StatName, number> = {
  hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31,
};

export const DEFAULT_EVS: Record<StatName, number> = {
  hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0,
};

// ── Naturezas ─────────────────────────────────────────────────────────────────

export const NATURE_NAMES = [
  'hardy', 'lonely', 'brave', 'adamant', 'naughty',
  'bold', 'docile', 'relaxed', 'impish', 'lax',
  'timid', 'hasty', 'serious', 'jolly', 'naive',
  'modest', 'mild', 'quiet', 'bashful', 'rash',
  'calm', 'gentle', 'sassy', 'careful', 'quirky',
] as const;
export type NatureName = (typeof NATURE_NAMES)[number];

export const NATURE_LABELS: Record<NatureName, string> = {
  hardy: 'Hardy',    lonely: 'Lonely',  brave: 'Brave',    adamant: 'Adamant', naughty: 'Naughty',
  bold: 'Bold',      docile: 'Docile',  relaxed: 'Relaxed', impish: 'Impish',  lax: 'Lax',
  timid: 'Timid',    hasty: 'Hasty',    serious: 'Serious', jolly: 'Jolly',    naive: 'Naive',
  modest: 'Modest',  mild: 'Mild',      quiet: 'Quiet',     bashful: 'Bashful', rash: 'Rash',
  calm: 'Calm',      gentle: 'Gentle',  sassy: 'Sassy',     careful: 'Careful', quirky: 'Quirky',
};

// ── Movimentos ────────────────────────────────────────────────────────────────

export type LearnMethod = 'Level Up' | 'TMs' | 'Egg Moves' | 'Tutor';

export interface SelectedMove {
  name: string;
  type: string;
  learnMethod: LearnMethod;
}

// ── Supabase rows ─────────────────────────────────────────────────────────────

export interface FavoriteRow {
  pokemon_id: number;
  pokemon_name: string;
}

export interface TeamPokemonRow {
  pokemon_id: number;
  pokemon_name: string;
  slot: number;
  is_shiny?: boolean;
  nature?: string;
  moves?: (SelectedMove | null)[] | null;
  ivs?: Record<string, number> | null;
  evs?: Record<string, number> | null;
}

export interface TeamRow {
  id: string;
  name: string;
  created_at: string;
  team_pokemons: TeamPokemonRow[];
}

// ── Membro do time (estado local) ────────────────────────────────────────────

export interface TeamMember {
  id: number;
  name: string;
  sprite: string;
  shinySprite: string;
  types: string[];
  isShiny: boolean;
  nature: NatureName;
  ivs: Record<StatName, number>;
  evs: Record<StatName, number>;
  moves: (SelectedMove | null)[];
}
