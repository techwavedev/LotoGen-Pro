import React, { useState, useEffect } from 'react';
import { 
  Trophy, Calendar, Trash2, CheckCircle2, 
  AlertCircle, Loader2, RefreshCw, Edit3, Save, X
} from 'lucide-react';
import { useAuth } from '../hooks/AuthContext';
import { LOTTERIES, LotteryId } from '../types';

interface SavedGame {
  id: number;
  lottery_type: string;
  numbers: number[][];  // Array of games, each game is an array of numbers
  note: string | null;
  is_played: boolean;
  draws_played: string | null;
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

// Number Badge Component - displays a single number as a styled circular badge
interface NumberBadgeProps {
  num: number;
  color: string;
  isExtra?: boolean;
}

const NumberBadge: React.FC<NumberBadgeProps> = ({ num, color, isExtra = false }) => {
  // For extras (trevos), display without offset
  const displayNum = isExtra ? num - 100 : num;
  
  return (
    <span
      className={`
        inline-flex items-center justify-center 
        w-8 h-8 md:w-9 md:h-9 
        text-xs md:text-sm font-bold text-white 
        rounded-full shadow-sm
        ${isExtra ? 'ring-2 ring-yellow-300' : ''}
      `}
      style={{ backgroundColor: isExtra ? '#10B981' : color }}
    >
      {displayNum.toString().padStart(2, '0')}
    </span>
  );
};

// Game Numbers Display - shows all games in a saved record as bulletin-style rows
interface GameNumbersDisplayProps {
  games: number[][];
  lottery: typeof LOTTERIES[LotteryId];
}

function GameNumbersDisplay({ games, lottery }: GameNumbersDisplayProps) {
  const color = lottery?.color || '#666';
  const extrasOffset = lottery?.extrasOffset || 100;
  
  return (
    <div className="space-y-3">
      {games.map((game, gameIdx) => {
        // Separate main numbers from extras (trevos)
        const mainNumbers = game.filter(n => n <= extrasOffset).sort((a, b) => a - b);
        const extraNumbers = game.filter(n => n > extrasOffset).sort((a, b) => a - b);
        
        return (
          <div key={gameIdx} className="flex flex-wrap items-center gap-1.5">
            {/* Game number label */}
            <span className="text-xs text-gray-400 font-medium mr-2">Jogo {gameIdx + 1}:</span>
            
            {/* Main numbers */}
            {mainNumbers.map((num, idx) => (
              <NumberBadge key={`main-${idx}`} num={num} color={color} />
            ))}
            
            {/* Extras (trevos) with separator */}
            {extraNumbers.length > 0 && (
              <>
                <span className="text-gray-300 mx-1">|</span>
                {extraNumbers.map((num, idx) => (
                  <NumberBadge key={`extra-${idx}`} num={num} color={color} isExtra />
                ))}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Game Card Component
interface GameCardProps {
  game: SavedGame;
  result: GameResult['bestMatch'] | null;
  onTogglePlayed: () => void;
  onUpdateDraws: (draws: string) => void;
  onDelete: () => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, result, onTogglePlayed, onUpdateDraws, onDelete }) => {
  const lottery = LOTTERIES[game.lottery_type as LotteryId];
  const color = lottery?.color || '#666';
  const [isEditingDraws, setIsEditingDraws] = useState(false);
  const [drawsInput, setDrawsInput] = useState(game.draws_played || '');

  const handleSaveDraws = () => {
    onUpdateDraws(drawsInput);
    setIsEditingDraws(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: color }}
      >
        <div className="flex items-center gap-2 text-white">
          <span className="font-bold text-sm uppercase">{lottery?.name || game.lottery_type}</span>
        </div>
        <div className="flex items-center gap-1 text-white/80 text-xs">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(game.created_at).toLocaleDateString()}
        </div>
      </div>

      {/* Games Display - Bulletin Style */}
      <div className="p-4 overflow-x-auto">
        <GameNumbersDisplay 
          games={game.numbers} 
          lottery={lottery}
        />
      </div>

      {/* Status Section */}
      <div className="px-4 pb-4 space-y-3">
        {/* Played Status & Draw Numbers */}
        <div className="flex items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePlayed}
              className={`
                p-2 rounded-lg transition-all font-medium text-sm flex items-center gap-2
                ${game.is_played 
                  ? 'bg-green-500 text-white shadow-sm' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }
              `}
            >
              <CheckCircle2 className="w-4 h-4" />
              {game.is_played ? 'Jogado' : 'Não jogado'}
            </button>
          </div>
          
          {/* Draw Numbers Input */}
          <div className="flex items-center gap-2">
            {isEditingDraws ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={drawsInput}
                  onChange={(e) => setDrawsInput(e.target.value)}
                  placeholder="Ex: 3120, 3121"
                  className="w-32 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button onClick={handleSaveDraws} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                  <Save className="w-4 h-4" />
                </button>
                <button onClick={() => setIsEditingDraws(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingDraws(true)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {game.draws_played ? `Conc. ${game.draws_played}` : 'Informar concurso'}
              </button>
            )}
          </div>
        </div>

        {/* Result Section */}
        {result && (
          <div className={`p-3 rounded-lg ${result.prize ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {result.prize ? (
                  <Trophy className="w-5 h-5 text-yellow-600" />
                ) : (
                  <span className="text-gray-400 text-sm">Resultado:</span>
                )}
                <span className={`font-bold ${result.prize ? 'text-yellow-700' : 'text-gray-600'}`}>
                  {result.prize || `${result.hits} acertos`}
                </span>
              </div>
              <span className="text-xs text-gray-500">Conc. {result.draw_number}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end">
          <button 
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Excluir jogo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const { token } = useAuth();
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

  const updateDrawsPlayed = async (gameId: number, draws: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/user/games/${gameId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ draws_played: draws, is_played: true })
      });

      if (res.ok) {
        setGames(games.map(g => 
          g.id === gameId ? { ...g, draws_played: draws, is_played: true } : g
        ));
      }
    } catch (err) {
      console.error('Error updating draws', err);
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
          <p className="text-gray-500 text-sm">Gerencie seus palpites no formato oficial do boletim</p>
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
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map(game => (
            <GameCard
              key={game.id}
              game={game}
              result={results[game.id]}
              onTogglePlayed={() => togglePlayed(game.id, game.is_played)}
              onUpdateDraws={(draws) => updateDrawsPlayed(game.id, draws)}
              onDelete={() => deleteGame(game.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
