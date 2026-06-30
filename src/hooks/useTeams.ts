import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { TeamRow, TeamMember } from '../types';

export function useTeams() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Consulta: lista todos os times do usuário ─────────────────────────────
  const { data: teams = [], isLoading: teamsLoading } = useQuery<TeamRow[]>({
    queryKey: ['teams', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id, name, created_at,
          team_pokemons(pokemon_id, pokemon_name, slot, is_shiny, nature, moves, ivs, evs)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as TeamRow[];
    },
    enabled: !!user,
  });

  // ── Mutação: salvar novo time ─────────────────────────────────────────────
  const saveTeamMutation = useMutation({
    mutationFn: async ({ name, members }: { name: string; members: TeamMember[] }) => {
      if (!user) throw new Error('Usuário não autenticado.');

      // 1. Cria o registro do time
      const teamName = name.trim() || 'Meu Time';

      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({ user_id: user.id, name: teamName })
        .select('id')
        .single();

      if (teamError) {
        console.error('Erro ao criar time — detalhes completos:', {
          message: teamError.message,
          code:    teamError.code,
          details: teamError.details,
          hint:    teamError.hint,
          userId:  user.id,
        });
        throw teamError;
      }

      // 2. Insere os Pokémon do time.
      //    Upsert por (team_id, slot) garante idempotência e evita conflitos
      //    de slot, mesmo que o código seja chamado mais de uma vez com o
      //    mesmo team_id no futuro.
      const rows = members.map((m, i) => ({
        team_id:      team.id,
        pokemon_id:   m.id,
        pokemon_name: m.name,
        slot:         i,
        is_shiny:     m.isShiny,
        nature:       m.nature,
        moves:        m.moves,
        ivs:          m.ivs,
        evs:          m.evs,
      }));

      const { error: pokeError } = await supabase
        .from('team_pokemons')
        .upsert(rows, { onConflict: 'team_id,slot' });

      if (pokeError) {
        console.error('Erro ao inserir pokémons do time — detalhes completos:', {
          message: pokeError.message,
          code:    pokeError.code,
          details: pokeError.details,
          hint:    pokeError.hint,
          rows,
        });
        // Limpa o time órfão para evitar registros sem Pokémon
        await supabase.from('teams').delete().eq('id', team.id);
        throw pokeError;
      }

      return { id: team.id, name: teamName };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams', user?.id] }),
  });

  // ── Mutação: excluir time ─────────────────────────────────────────────────
  // ON DELETE CASCADE remove os team_pokemons automaticamente.
  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase.from('teams').delete().eq('id', teamId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams', user?.id] }),
  });

  return {
    teams,
    teamsLoading,
    saveTeam:  (name: string, members: TeamMember[]) =>
      saveTeamMutation.mutateAsync({ name, members }),
    deleteTeam: (teamId: string) => deleteTeamMutation.mutateAsync(teamId),
    isSaving:   saveTeamMutation.isPending,
    isDeleting: deleteTeamMutation.isPending,
  };
}
