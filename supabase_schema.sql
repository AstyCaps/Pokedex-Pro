-- ============================================================
-- Execute no Supabase SQL Editor: Dashboard > SQL Editor > New Query
-- Seguro para rodar múltiplas vezes (IF NOT EXISTS / OR REPLACE).
-- ============================================================


-- 1. TABELA favorites
-- Guarda um par (usuário, pokémon) por favorito.
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pokemon_id   INTEGER     NOT NULL,
  pokemon_name TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, pokemon_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own favorites"
  ON favorites FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 2. TABELA teams
-- Um registro por time salvo. Não armazena IDs de Pokémon diretamente;
-- os membros do time vivem na tabela team_pokemons.
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL DEFAULT 'Meu Time',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own teams"
  ON teams FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 3. TABELA team_pokemons
-- Até 6 Pokémon por time, com atributos competitivos completos.
-- A restrição UNIQUE (team_id, slot) garante um Pokémon por slot,
-- mas permite a mesma espécie em slots distintos (times competitivos válidos).
-- ============================================================
CREATE TABLE IF NOT EXISTS team_pokemons (
  id           UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id      UUID    NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  pokemon_id   INTEGER NOT NULL,
  pokemon_name TEXT    NOT NULL,
  slot         INTEGER NOT NULL CHECK (slot >= 0 AND slot < 6),

  -- Atributos competitivos
  is_shiny     BOOLEAN NOT NULL DEFAULT FALSE,
  nature       TEXT    NOT NULL DEFAULT 'hardy',
  moves        JSONB,          -- array de até 4 movimentos: (SelectedMove | null)[]
  ivs          JSONB,          -- { hp, attack, defense, special-attack, special-defense, speed } — valores 0–31
  evs          JSONB,          -- { hp, attack, defense, special-attack, special-defense, speed } — valores 0–252

  UNIQUE (team_id, slot)
);

ALTER TABLE team_pokemons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their team pokemons"
  ON team_pokemons FOR ALL
  USING  (auth.uid() = (SELECT user_id FROM teams WHERE id = team_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM teams WHERE id = team_id));


-- ============================================================
-- MIGRAÇÕES (bancos já existentes)
-- Execute este bloco se as tabelas acima já existem e precisam
-- ser atualizadas para a arquitetura atual.
-- ============================================================

-- 2a. Remove coluna legada da tabela teams.
--     Versões anteriores armazenavam IDs de Pokémon diretamente em
--     teams.pokemon_ids (TEXT[] NOT NULL), o que causava violação de
--     restrição NOT NULL ao inserir com a nova arquitetura normalizada.
ALTER TABLE teams DROP COLUMN IF EXISTS pokemon_ids;

-- 2b. Adiciona atributos competitivos à tabela team_pokemons, caso
--     a tabela tenha sido criada antes desta versão do schema.
ALTER TABLE team_pokemons
  ADD COLUMN IF NOT EXISTS is_shiny  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nature    TEXT    NOT NULL DEFAULT 'hardy',
  ADD COLUMN IF NOT EXISTS moves     JSONB,
  ADD COLUMN IF NOT EXISTS ivs       JSONB,
  ADD COLUMN IF NOT EXISTS evs       JSONB;

-- 2c. Remove restrição de unicidade por espécie, que impedia adicionar
--     o mesmo Pokémon em slots diferentes dentro de um time.
ALTER TABLE team_pokemons
  DROP CONSTRAINT IF EXISTS team_pokemons_team_id_pokemon_id_key;

-- Recarrega o cache de schema do PostgREST após qualquer ALTER TABLE.
NOTIFY pgrst, 'reload schema';


-- ============================================================
-- VERIFICAÇÃO
-- Execute após as migrações para confirmar o estado final das tabelas.
-- ============================================================

-- Confirma que pokemon_ids não existe mais em teams
SELECT column_name
FROM   information_schema.columns
WHERE  table_name  = 'teams'
  AND  column_name = 'pokemon_ids';
-- Resultado esperado: 0 linhas

-- Confirma que as 5 colunas competitivas existem em team_pokemons
SELECT column_name, data_type, is_nullable, column_default
FROM   information_schema.columns
WHERE  table_name  = 'team_pokemons'
  AND  column_name IN ('is_shiny', 'nature', 'moves', 'ivs', 'evs')
ORDER  BY column_name;
-- Resultado esperado: 5 linhas
