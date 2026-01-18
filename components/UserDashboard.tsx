import React, { useState, useEffect } from 'react';
import { 
  Trophy, Calendar, Trash2, CheckCircle2, XCircle, 
  AlertCircle, Loader2, RefreshCw, Eye, EyeOff 
} from 'lucide-react';
import { useAuth } from '../hooks/AuthContext';
import { LOTTERIES } from '../types';

interface SavedGame {
  id: number;
  lottery_type: string;
  numbers: number[];
  note: string | null;
  is_played: boolean;
  created_at: string;
}

interface GameResult {
  game_id: number;
  bestMatch: {
    draw_number: number;
    draw_date: string;
    hits: number;
    prize: string;
    matching_numbers: number[];
  } | null;
}

export default function UserDashboard() {
  const { user, token } = useAuth();
  const [games, setGames] = useState<SavedGame[]>([]);
  const [results, setResults] = useState<Record<number, GameResult['bestMatch']>>({});
  const [loading, setLoading] = useState(true);
  const [checkingResults, setCheckingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchGames = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/user/games`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch games');
      const data = await res.json();
      setGames(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkResults = async () => {
    try {
      setCheckingResults(true);
      const res = await fetch(`${apiUrl}/api/user/check-results`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to check results');
      
      const data: GameResult[] = await res.json();
      
      const resultsMap: Record<number, GameResult['bestMatch']> = {};
      data.forEach(item => {
        resultsMap[item.game_id] = item.bestMatch;
      });
      
      setResults(resultsMap);
    } catch (err: any) {
      setError('Erro ao verificar resultados: ' + err.message);
    } finally {
      setCheckingResults(false);
    }
  };

  const togglePlayed = async (gameId: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`${apiUrl}/api/user/games/${gameId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_played: !currentStatus })
      });

      if (res.ok) {
        setGames(games.map(g => 
          g.id === gameId ? { ...g, is_played: !currentStatus } : g
        ));
      }
    } catch (err) {
      console.error('Error toggling status', err);
    }
  };

  const deleteGame = async (gameId: number) => {
    if (!confirm('Tem certeza que deseja excluir este jogo?')) return;
    
    try {
      const res = await fetch(`${apiUrl}/api/user/games/${gameId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setGames(games.filter(g => g.id !== gameId));
      }
    } catch (err) {
      console.error('Error deleting game', err);
    }
  };

  useEffect(() => {
    fetchGames();
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slide-up">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Meus Jogos Salvos</h2>
          <p className="text-gray-500 text-sm">Gerencie seus palpites e confira se ganhou</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={checkResults}
            disabled={checkingResults}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl transition-colors font-medium border border-green-200"
          >
            {checkingResults ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
            Conferir Resultados
          </button>
          
          <button 
            onClick={fetchGames}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="m-6 mb-0 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {games.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <p className="text-lg mb-2">Você ainda não salvou nenhum jogo.</p>
          <p className="text-sm">Gere números na página principal e clique em "Salvar" para começar.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
                <th className="p-4 font-semibold">Data</th>
                <th className="p-4 font-semibold">Loteria</th>
                <th className="p-4 font-semibold">Números</th>
                <th className="p-4 font-semibold text-center">Jogado?</th>
                <th className="p-4 font-semibold text-center">Resultado</th>
                <th className="p-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {games.map(game => {
                const result = results[game.id];
                const lottery = LOTTERIES[game.lottery_type as keyof typeof LOTTERIES];
                const color = lottery ? lottery.color : '#666';
                
                return (
                  <tr key={game.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(game.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <span 
                        className="px-2 py-1 rounded-md text-xs font-bold text-white uppercase"
                        style={{ backgroundColor: color }}
                      >
                        {lottery ? lottery.name : game.lottery_type}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {game.numbers.map((n, i) => {
                          const isMatch = result?.matching_numbers.includes(n);
                          return (
                            <span 
                              key={i}
                              className={`
                                inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full 
                                ${isMatch ? 'bg-green-500 text-white shadow-sm scale-110' : 'bg-gray-100 text-gray-600'}
                              `}
                            >
                              {n}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => togglePlayed(game.id, game.is_played)}
                        title={game.is_played ? "Marcar como não jogado" : "Marcar como jogado"}
                        className={`
                          p-1.5 rounded-lg transition-colors
                          ${game.is_played ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'}
                        `}
                      >
                        {game.is_played ? <CheckCircle2 className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      {result ? (
                        <div className="flex flex-col items-center">
                          {result.prize ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-full border border-yellow-200">
                              <Trophy className="w-3 h-3" />
                              {result.prize}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">
                              {result.hits} acertos
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400 mt-1">
                            Conc. {result.draw_number}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => deleteGame(game.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
