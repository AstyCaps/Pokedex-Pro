// ---------------------------------------------------------------------------
// Mapeamento de jogos → Pokédex local e limite da Pokédex Nacional
// ---------------------------------------------------------------------------

export interface GameOption {
  label: string;
  value: string;
  pokedexNames: string[];   // endpoint(s) /api/v2/pokedex/{nome} para a lista local
  nationalLimit?: number;   // ID nacional máximo suportado pelo jogo (undefined = sem toggle nacional)
  versionNames: string[];   // nomes de versão da PokéAPI para busca de flavor text
}

export const GAME_OPTIONS: GameOption[] = [
  { label: 'Todos os Pokémon',                   value: 'all',  pokedexNames: [],                                                                versionNames: [] },

  // Kanto
  { label: 'Red / Blue / Yellow',                value: 'rby',  pokedexNames: ['kanto'],                                        nationalLimit: undefined, versionNames: ['red', 'blue', 'yellow'] },
  { label: 'FireRed / LeafGreen',                value: 'frlg', pokedexNames: ['kanto'],                                        nationalLimit: 386,       versionNames: ['firered', 'leafgreen'] },
  { label: "Let's Go! Pikachu / Eevee",          value: 'lgpe', pokedexNames: ['letsgo-kanto'],                                 nationalLimit: undefined, versionNames: ['lets-go-pikachu', 'lets-go-eevee'] },

  // Johto
  { label: 'Gold / Silver / Crystal',            value: 'gsc',  pokedexNames: ['original-johto'],                               nationalLimit: undefined, versionNames: ['gold', 'silver', 'crystal'] },
  { label: 'HeartGold / SoulSilver',             value: 'hgss', pokedexNames: ['updated-johto'],                                nationalLimit: 493,       versionNames: ['heartgold', 'soulsilver'] },

  // Hoenn
  { label: 'Ruby / Sapphire / Emerald',          value: 'rse',  pokedexNames: ['hoenn'],                                        nationalLimit: 386,       versionNames: ['ruby', 'sapphire', 'emerald'] },
  { label: 'Omega Ruby / Alpha Sapphire',        value: 'oras', pokedexNames: ['updated-hoenn'],                                nationalLimit: 721,       versionNames: ['omega-ruby', 'alpha-sapphire'] },

  // Sinnoh
  { label: 'Diamond / Pearl',                    value: 'dp',   pokedexNames: ['original-sinnoh'],                              nationalLimit: 493,       versionNames: ['diamond', 'pearl'] },
  { label: 'Platinum',                           value: 'pt',   pokedexNames: ['extended-sinnoh'],                              nationalLimit: 493,       versionNames: ['platinum'] },
  { label: 'Brilliant Diamond / Shining Pearl',  value: 'bdsp', pokedexNames: ['original-sinnoh'],                              nationalLimit: 493,       versionNames: ['brilliant-diamond', 'shining-pearl'] },
  { label: 'Legends: Arceus',                    value: 'pla',  pokedexNames: ['hisui'],                                        nationalLimit: undefined, versionNames: ['legends-arceus'] },

  // Unova
  { label: 'Black / White',                      value: 'bw',   pokedexNames: ['original-unova'],                               nationalLimit: 649,       versionNames: ['black', 'white'] },
  { label: 'Black 2 / White 2',                  value: 'b2w2', pokedexNames: ['updated-unova'],                                nationalLimit: 649,       versionNames: ['black-2', 'white-2'] },

  // Kalos — três sub-Pokédex regionais
  { label: 'X / Y',                              value: 'xy',   pokedexNames: ['kalos-central', 'kalos-coastal', 'kalos-mountain'], nationalLimit: 721,   versionNames: ['x', 'y'] },

  // Alola
  { label: 'Sun / Moon',                         value: 'sm',   pokedexNames: ['original-alola'],                               nationalLimit: 802,       versionNames: ['sun', 'moon'] },
  { label: 'Ultra Sun / Ultra Moon',             value: 'usum', pokedexNames: ['updated-alola'],                                nationalLimit: 807,       versionNames: ['ultra-sun', 'ultra-moon'] },

  // Galar
  { label: 'Sword / Shield',                     value: 'swsh', pokedexNames: ['galar'],                                        nationalLimit: 905,       versionNames: ['sword', 'shield'] },

  // Paldea
  { label: 'Scarlet / Violet',                   value: 'sv',   pokedexNames: ['paldea'],                                       nationalLimit: 1025,      versionNames: ['scarlet', 'violet'] },
];

// Ordem de prioridade para escolher a descrição "mais recente" — do mais novo ao mais antigo
export const VERSION_RECENCY_ORDER: readonly string[] = [
  'scarlet', 'violet',
  'legends-arceus', 'brilliant-diamond', 'shining-pearl',
  'sword', 'shield',
  'lets-go-pikachu', 'lets-go-eevee',
  'ultra-sun', 'ultra-moon', 'sun', 'moon',
  'x', 'y', 'omega-ruby', 'alpha-sapphire',
  'black-2', 'white-2', 'black', 'white',
  'heartgold', 'soulsilver', 'platinum', 'diamond', 'pearl',
  'firered', 'leafgreen', 'emerald', 'ruby', 'sapphire',
  'gold', 'silver', 'crystal',
  'red', 'blue', 'yellow',
];

// ---------------------------------------------------------------------------
// Pool de requisições com concorrência limitada — preserva a ordem do input
// ---------------------------------------------------------------------------
async function fetchWithConcurrency(urls: string[], concurrency = 30): Promise<any[]> {
  const results: any[] = new Array(urls.length).fill(null);
  let idx = 0;

  const worker = async () => {
    while (idx < urls.length) {
      const i = idx++;
      try {
        results[i] = await fetch(urls[i]).then((r) => r.json());
      } catch {
        results[i] = null;
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, worker);
  await Promise.all(workers);
  return results.filter(Boolean);
}

// ---------------------------------------------------------------------------
// Funções de busca exportadas
// ---------------------------------------------------------------------------

/**
 * Busca todos os Pokémon da Pokédex Nacional (Gerações 1–9, até #1025).
 * Retorna a lista em ordem nacional crescente de ID.
 */
export async function fetchAllPokemons(): Promise<any[]> {
  const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025&offset=0');
  if (!res.ok) throw new Error('Erro ao buscar a lista de Pokémon.');
  const data = await res.json();
  const urls: string[] = data.results.map((p: { url: string }) => p.url);
  return fetchWithConcurrency(urls, 30);
}

/**
 * Busca os Pokémon de um jogo específico, ordenados pelo número LOCAL da
 * Pokédex regional (entry_number), não pelo número nacional.
 *
 * Para jogos com múltiplas sub-Pokédex (ex.: X/Y), as sub-listas são
 * concatenadas na ordem das Pokédex e os duplicados são eliminados.
 */
export async function fetchPokemonsByGame(pokedexNames: string[]): Promise<any[]> {
  if (pokedexNames.length === 0) return [];

  // 1. Busca todas as Pokédex do jogo em paralelo
  const pokedexDataList = await Promise.all(
    pokedexNames.map((name) =>
      fetch(`https://pokeapi.co/api/v2/pokedex/${name}`).then((r) => {
        if (!r.ok) throw new Error(`Pokédex "${name}" não encontrada na PokéAPI.`);
        return r.json();
      }),
    ),
  );

  // 2. Constrói a lista de nomes na ordem LOCAL (entry_number) com dedup entre sub-Pokédex
  const seen = new Set<string>();
  const orderedNames: string[] = [];

  for (const dex of pokedexDataList) {
    const entries = (
      dex.pokemon_entries as Array<{ entry_number: number; pokemon_species: { name: string } }>
    ).sort((a, b) => a.entry_number - b.entry_number);

    for (const entry of entries) {
      const speciesName = entry.pokemon_species.name;
      if (!seen.has(speciesName)) {
        seen.add(speciesName);
        orderedNames.push(speciesName);
      }
    }
  }

  // 3. Busca os dados completos — fetchWithConcurrency preserva a ordem do input
  //    Resultado: array na ordem da Pokédex LOCAL, sem ordenação por ID nacional
  const urls = orderedNames.map((name) => `https://pokeapi.co/api/v2/pokemon/${name}`);
  return fetchWithConcurrency(urls, 30);
}

/** Busca um único Pokémon pelo nome ou ID na PokéAPI. */
export async function fetchPokemonByName(name: string): Promise<any> {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`);
  if (!res.ok) throw new Error(`Pokémon não encontrado: ${name}`);
  return res.json();
}
