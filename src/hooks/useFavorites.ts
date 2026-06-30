import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { FavoriteRow } from '../types';

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery<FavoriteRow[]>({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('pokemon_id, pokemon_name')
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data ?? []) as FavoriteRow[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const favoriteIds = favorites.map((f) => f.pokemon_id);

  const toggleMutation = useMutation({
    mutationFn: async ({ pokemonId, pokemonName }: { pokemonId: number; pokemonName: string }) => {
      if (!user) throw new Error('Not authenticated');
      const isFav = favoriteIds.includes(pokemonId);
      if (isFav) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('pokemon_id', pokemonId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, pokemon_id: pokemonId, pokemon_name: pokemonName });
        if (error) throw error;
      }
    },
    // Optimistic update for instant UI feedback
    onMutate: async ({ pokemonId, pokemonName }) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', user?.id] });
      const previous = queryClient.getQueryData<FavoriteRow[]>(['favorites', user?.id]);
      queryClient.setQueryData<FavoriteRow[]>(['favorites', user?.id], (old = []) => {
        const isFav = old.some((f) => f.pokemon_id === pokemonId);
        return isFav
          ? old.filter((f) => f.pokemon_id !== pokemonId)
          : [...old, { pokemon_id: pokemonId, pokemon_name: pokemonName }];
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(['favorites', user?.id], ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
    },
  });

  return {
    favorites,
    favoriteIds,
    isLoading,
    isFavorite: (id: number) => favoriteIds.includes(id),
    toggleFavorite: (pokemonId: number, pokemonName: string) =>
      toggleMutation.mutate({ pokemonId, pokemonName }),
  };
}
