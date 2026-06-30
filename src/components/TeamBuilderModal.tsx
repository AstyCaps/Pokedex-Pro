import { useState, useEffect } from 'react';

interface Pokemon {
  id: number;
  name: string;
  sprites?: { front_default: string };
}

interface TeamBuilderModalProps {
  onClose: () => void;
  favoritos: number[];
}

export default function TeamBuilderModal({ onClose, favoritos }: TeamBuilderModalProps) {
  const [team, setTeam] = useState<Pokemon[]>([]);
  const [favPokemons, setFavPokemons] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(false);

  // Carrega os dados dos Pokémon favoritados direto da PokeAPI
  useEffect(() => {
    const fetchFavorites = async () => {
      if (favoritos.length === 0) return;
      setLoading(true);
      try {
        const requests = favoritos.map(id =>
          fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(res => res.json())
        );
        const results = await Promise.all(requests);
        setFavPokemons(results);
      } catch (err) {
        console.error("Erro ao carregar favoritos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, [favoritos]);

  const addToTeam = (pokemon: Pokemon) => {
    if (team.length >= 6) return alert("Seu time já está cheio (máximo 6 Pokémon)!");
    if (team.some(p => p.id === pokemon.id)) return alert("Este Pokémon já está no seu time!");
    setTeam([...team, pokemon]);
  };

  const removeFromTeam = (id: number) => {
    setTeam(team.filter(p => p.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col text-gray-800">
        
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-red-600">🛠️ Team Builder</h2>
            <p className="text-sm text-gray-500">Monte o seu time ideal usando seus favoritos</p>
          </div>
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl transition font-medium">
            Fechar
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
          {/* Coluna do Time Atual (6 slots) */}
          <div className="md:col-span-2 border-r pr-0 md:pr-6">
            <h3 className="font-semibold text-lg mb-4 text-gray-700">Seu Time ({team.length}/6)</h3>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => {
                const poke = team[i];
                return (
                  <div key={i} className="border-2 border-dashed border-gray-200 rounded-xl h-32 flex flex-col items-center justify-center relative bg-gray-50">
                    {poke ? (
                      <>
                        <img src={poke.sprites?.front_default} alt={poke.name} className="w-16 h-16 object-contain" />
                        <span className="capitalize text-xs font-bold">{poke.name}</span>
                        <button 
                          onClick={() => removeFromTeam(poke.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium">Vazio</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna de Seleção por Favoritos */}
          <div className="overflow-y-auto max-h-[45vh] md:max-h-[60vh]">
            <h3 className="font-semibold text-lg mb-4 text-gray-700">⭐ Seus Favoritos</h3>
            {loading ? (
              <p className="text-sm text-gray-400">Carregando...</p>
            ) : favPokemons.length === 0 ? (
              <p className="text-xs text-gray-400">Favorite Pokémon na Pokédex para que eles apareçam aqui!</p>
            ) : (
              <div className="space-y-2">
                {favPokemons.map(poke => (
                  <div key={poke.id} className="flex items-center justify-between p-2 border rounded-xl hover:bg-gray-50 transition">
                    <div className="flex items-center gap-2">
                      <img src={poke.sprites?.front_default} alt={poke.name} className="w-10 h-10 object-contain" />
                      <span className="capitalize text-sm font-medium">{poke.name}</span>
                    </div>
                    <button 
                      onClick={() => addToTeam(poke)}
                      className="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-lg hover:bg-red-200 transition"
                    >
                      + Adicionar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}