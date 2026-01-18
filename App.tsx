import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Download, Trash2, Clover, AlertCircle, FileSpreadsheet, Plus, Copy, Dna, Grid, CheckCircle2, CircleDot, CloudDownload, X } from 'lucide-react';
import { Game, DEFAULT_EXTENDED_CONFIG, ExtendedFilterConfig, ExtendedHistoryAnalysis, LOTTERIES, LotteryDefinition, LotteryId, LOTTERY_MANDEL_RECOMMENDATIONS, CoveringDesignConfig, DEFAULT_COVERING_CONFIG, CoveringDesignResult, HistoryEntry } from './types';
import { parseHistoryFile, generateGamesExtended, analyzeHistoryExtended, generateCombinatorialGames } from './services/lotteryService';
import { generateCoveringDesign, getCombinations } from './services/coveringDesigns';
import * as analytics from './utils/analytics';
import GameTicket from './components/GameTicket';
import SettingsPanel from './components/SettingsPanel';
import CombinatorialPanel from './components/CombinatorialPanel';
import BetTypeSelector, { BetType } from './components/BetTypeSelector';
import StatisticsPanel from './components/StatisticsPanel';
import FilterExamplesModal from './components/FilterExamplesModal';
import CookieConsent from './components/CookieConsent';
import { initializeGAAfterConsent } from './hooks/useAnalytics';
import { useLotteryData } from './hooks/useLotteryData';
import { useSEO } from './hooks/useSEO';

import clsx from 'clsx';
import { utils, writeFile } from 'xlsx';
import UserMenu from './components/UserMenu';
import UserDashboard from './components/UserDashboard';
import { useAuth } from './hooks/AuthContext';
import { BookmarkPlus, BookmarkCheck } from 'lucide-react';

function App() {
  const [currentLotteryId, setCurrentLotteryId] = useState<LotteryId>('lotofacil');
  const lottery = LOTTERIES[currentLotteryId];
  const apiUrl = import.meta.env.VITE_API_URL;

  // Use the custom hook for lottery data management
  const {
    history,
    analysis,
    latestResult,
    isLoading: isDataLoading,
    loadingMessage: dataLoadingMessage,
    isSyncing,
    error: dataError,
    clearError,
    setHistory,
    setAnalysis
  } = useLotteryData({
    lotteryId: currentLotteryId,
    lottery,
    apiUrl
  });

  // Local state for UI operations
  const [generatedGames, setGeneratedGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Init Deep Linking: Read URL param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gameParam = params.get('game');
    if (gameParam && LOTTERIES[gameParam as LotteryId]) {
      setCurrentLotteryId(gameParam as LotteryId);
    }
    // Track initial page view with correct parameters
    const url = new URL(window.location.href);
    if (gameParam && LOTTERIES[gameParam as LotteryId]) {
      // If we are redirecting/setting state, tracking will happen in the effect below? 
      // Actually simpler to just track here or rely on the effect below if it triggers on mount.
      // But trackPageView is safe to call.
    }
  }, []);

  // Update URL and Track PageView when lottery changes
  useEffect(() => {
    // Deep Linking: Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('game', currentLotteryId);
    window.history.pushState({}, '', url);

    // Track Virtual Page View
    // trackPageView(window.location.pathname + window.location.search, `LotoGen Pro - ${lottery.name}`);
  }, [currentLotteryId, lottery.name]);

  // Local state for UI operations

  const [config, setConfig] = useState<ExtendedFilterConfig>(DEFAULT_EXTENDED_CONFIG);
  const [gamesCount, setGamesCount] = useState<number>(5);
  const [mode, setMode] = useState<'smart' | 'combinatorial'>('smart');
  const [combinatorialSelection, setCombinatorialSelection] = useState<number[]>([]);
  const [trevosSelection, setTrevosSelection] = useState<number[]>([]);
  const [exclusionMode, setExclusionMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [winnersCount, setWinnersCount] = useState<number>(0);
  const [coveringConfig, setCoveringConfig] = useState<CoveringDesignConfig>(DEFAULT_COVERING_CONFIG);

  const [coveringResult, setCoveringResult] = useState<CoveringDesignResult | null>(null);

  // User Dashboard State
  const [showDashboard, setShowDashboard] = useState(false);
  const { isAuthenticated, token } = useAuth();
  const [saveSuccess, setSaveSuccess] = useState<number | null>(null);

  // Listen for dashboard open event from UserMenu
  useEffect(() => {
    const handleOpenDashboard = () => setShowDashboard(true);
    window.addEventListener('open-dashboard', handleOpenDashboard);
    return () => window.removeEventListener('open-dashboard', handleOpenDashboard);
  }, []);

  // Progress tracking for long operations
  const [operationProgress, setOperationProgress] = useState(0);
  const [operationTotal, setOperationTotal] = useState(0);
  const [operationStep, setOperationStep] = useState('');
  const [showResultsSkeleton, setShowResultsSkeleton] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const downloadFormRef = useRef<HTMLFormElement>(null);

  // Fetch winners count on mount and track session
  useEffect(() => {
    analytics.trackSessionStart();
    analytics.trackVisit();
    if (apiUrl) {
      fetch(`${apiUrl}/api/stats/winners`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.totalWinners) {
            setWinnersCount(data.totalWinners);
          }
        })
        .catch(() => {});
    }
  }, [apiUrl]);

  // Adjust hot number defaults based on lottery size
  useEffect(() => {
    const idealHot = Math.floor(lottery.gameSize * 0.6); // Rule of thumb
    setConfig(prev => ({
        ...prev,
        minHotNumbers: Math.max(0, idealHot - 2),
        maxHotNumbers: idealHot + 2
    }));
  }, [currentLotteryId, lottery.gameSize]);

  const handleLotteryChange = (id: LotteryId) => {
    setCurrentLotteryId(id);
    setSelectedGameSize(LOTTERIES[id].gameSize);
    analytics.trackLotteryChange(id, LOTTERIES[id].name);
  };
  
  // Bet Type State
  const [betType, setBetType] = useState<BetType>('simple');
  const [selectedGameSize, setSelectedGameSize] = useState<number>(lottery.gameSize);

  // Sync game size when lottery changes
  useEffect(() => {
    const currentLottery = LOTTERIES[currentLotteryId];
    setSelectedGameSize(currentLottery.gameSize);
    // Auto-enable exclusion mode for Lotomania (gameSize >= 50)
    setExclusionMode(false); // Always reset to standard inclusion mode on lottery change
    setCombinatorialSelection([]); // Clear selection when lottery changes
    setTrevosSelection([]); // Clear trevos selection
    setCoveringResult(null); // Clear previous results
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLotteryId]);

  // Clear combinatorial result when selection changes to update estimates
  useEffect(() => {
    setCoveringResult(null);
  }, [combinatorialSelection, trevosSelection, coveringConfig]);

  // Auto-configure "Best Static Defaults" when lottery changes
  useEffect(() => {
    const rec = LOTTERY_MANDEL_RECOMMENDATIONS[currentLotteryId];
    if (rec) {
        setConfig(prev => ({
            ...prev,
            // Reset to defaults but ENABLE smart filters
            ...DEFAULT_EXTENDED_CONFIG,
            usePrimeCountFilter: true,
            minPrimes: rec.primes.min,
            maxPrimes: rec.primes.max,
            
            useDecadeBalanceFilter: true,
            minDecadesRepresented: rec.decades.min,
            
            useEdgeFilter: true,
            minEdgeNumbers: rec.edges.min,
            maxEdgeNumbers: rec.edges.max,
            
            useSpreadFilter: true,
            minAverageSpread: rec.spread.min,
            
            useFibonacciFilter: true,
            minFibonacciNumbers: rec.fibonacci.min
        }));
    }
  }, [currentLotteryId]);

  // Auto-optimize when Analysis loads
  useEffect(() => {
    if (analysis) {
        // Apply Optimized Defaults based on historical analysis
        setConfig(prev => ({
            ...prev,
            // Primes
            usePrimeCountFilter: true,
            minPrimes: analysis.primeDistributionStats?.recommendedRange[0] ?? prev.minPrimes,
            maxPrimes: analysis.primeDistributionStats?.recommendedRange[1] ?? prev.maxPrimes,
            
            // Decades
            useDecadeBalanceFilter: true,
            minDecadesRepresented: analysis.decadeDistributionStats?.avgDecadesCovered 
                ? Math.floor(analysis.decadeDistributionStats.avgDecadesCovered - 0.5) // Conservative floor
                : prev.minDecadesRepresented,
            
            // Edges
            useEdgeFilter: true,
            minEdgeNumbers: analysis.edgeNumberStats?.recommendedRange[0] ?? prev.minEdgeNumbers,
            maxEdgeNumbers: analysis.edgeNumberStats?.recommendedRange[1] ?? prev.maxEdgeNumbers,
            
            // Spread
            useSpreadFilter: true,
            minAverageSpread: analysis.spreadStats?.recommendedMinSpread ?? prev.minAverageSpread,
            
            // Fibonacci
            useFibonacciFilter: true,
            minFibonacciNumbers: analysis.fibonacciStats?.recommendedRange[0] ?? prev.minFibonacciNumbers,

            // Sum Range (P25-P75)
            useSumFilter: true,
            minSum: analysis.sumRangeStats?.mostCommonRange[0] ?? prev.minSum,
            maxSum: analysis.sumRangeStats?.mostCommonRange[1] ?? prev.maxSum,

            // Others
            useDelayFilter: true,
            useConsecutiveFilter: true
        }));
    }
  }, [analysis]);

  // Auto-fetch and load history from asloterias.com.br
  const handleDownloadHistory = async () => {
    setIsLoading(true);
    setError(null);
    setOperationStep('');
    setLoadingMessage(`Buscando resultados da ${lottery.name}...`);

    try {
      // Try to fetch via a CORS proxy or direct request
      setOperationStep('Conectando ao servidor de resultados...');
      const formData = new URLSearchParams();
      formData.append('l', lottery.downloadParam);
      formData.append('t', 't');
      formData.append('o', 's');

      const response = await fetch('https://asloterias.com.br/download_excel.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        throw new Error('Falha ao buscar resultados');
      }

      setOperationStep('Baixando arquivo de resultados...');
      const blob = await response.blob();
      const file = new File([blob], `${lottery.name}.xlsx`, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      setLoadingMessage(`Analisando histórico da ${lottery.name}...`);
      setOperationStep('Processando arquivo...');

      const data = await parseHistoryFile(file, lottery);
      if (data.length === 0) {
        throw new Error(`Nenhum jogo válido encontrado.`);
      }

      setOperationStep('Analisando padrões históricos...');
      setHistory(data);

      // Map to plain numbers for analysis
      const stats = analyzeHistoryExtended(data.map(h => h.numbers), lottery);
      setAnalysis(stats);
      setError(null);
      setOperationStep('');

    } catch (err: any) {
      console.error('Auto-fetch failed:', err);
      // If CORS blocks, fallback to manual download
      if (err.message.includes('fetch') || err.message.includes('CORS') || err.name === 'TypeError') {
        setError('Auto-carregamento bloqueado (CORS). Clique novamente para baixar manualmente.');
        // Fallback: open form in new tab
        if (downloadFormRef.current) {
          downloadFormRef.current.submit();
        }
      } else {
        setError('Erro: ' + (err.message || 'Falha ao carregar resultados'));
      }
      setOperationStep('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setOperationStep('');
    setLoadingMessage(`Analisando histórico da ${lottery.name}...`);

    try {
      setOperationStep('Lendo arquivo...');
      const data = await parseHistoryFile(file, lottery);
      if (data.length === 0) {
        throw new Error(`Nenhum jogo válido de ${lottery.gameSize} números encontrado.`);
      }

      setOperationStep('Analisando padrões históricos...');
      setHistory(data);

      // Map for analysis
      const stats = analyzeHistoryExtended(data.map(h => h.numbers), lottery);
      setAnalysis(stats);
      setOperationStep('');

    } catch (err: any) {
      console.error(err);
      setError('Erro ao ler arquivo: ' + (err.message || 'Formato inválido'));
      setOperationStep('');
    } finally {
      setIsLoading(false);
      // Reset input value to allow re-upload of same file if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Helper to append extras (like Trevos) to generated games if missing
  const ensureExtras = (games: Game[]) => {
      if (!lottery.hasExtras || !lottery.extrasTotalNumbers || !lottery.extrasGameSize) return games;
      const offset = lottery.extrasOffset || 100;
      
      return games.map(game => {
          // Check if game already has extras (numbers > 100)
          // Note: This check assumes extras are always > 100 which is true for our implementation
          const hasExtras = game.some(n => n > 100);
          if (hasExtras) return game;

          // Generate random extras
          const extras = new Set<number>();
          while (extras.size < (lottery.extrasGameSize || 0)) {
              extras.add(Math.floor(Math.random() * (lottery.extrasTotalNumbers || 0)) + 1);
          }
          
          const newGame = [...game]; // Copy
          extras.forEach(e => newGame.push(e + offset));
          return newGame;
      });
  };

  const handleGenerate = async (countOverride?: number) => {
    setIsLoading(true);
    setLoadingMessage('Processando...');
    setError(null);
    setGeneratedGames([]);
    setOperationProgress(0);
    setOperationStep('');

    // Show skeleton for results area when generating
    setShowResultsSkeleton(true);

    setTimeout(async () => {
      try {
        if (mode === 'combinatorial') {
           setLoadingMessage('Gerando fechamento combinatório...');
           setOperationStep('Calculando combinações...');

           // Combinatorial Mode
           // For exclusion mode: calculate active pool (all numbers EXCEPT selection)
           const numbersForGeneration = exclusionMode
               ? Array.from({ length: lottery.totalNumbers }, (_, i) => i + 1).filter(n => !combinatorialSelection.includes(n))
               : combinatorialSelection;

           setOperationTotal(numbersForGeneration.length);

           // Use the new covering design service based on config
           try {
             setOperationStep('Gerando fechamento matemático...');
             const result = generateCoveringDesign(numbersForGeneration, lottery, coveringConfig);
             setOperationProgress(numbersForGeneration.length);

             // Handle Trevos Distribution (Strategy: Round Robin of Combinations)
             setOperationStep('Adicionando trevos...');
             let gamesWithExtras = result.games;

             if (lottery.hasExtras && trevosSelection.length >= (lottery.extrasGameSize || 2)) {
                  const offset = lottery.extrasOffset || 100;
                  // Generate all combinations of the selected trevos
                  const trevosCombinations = getCombinations(trevosSelection, lottery.extrasGameSize || 2);

                  if (trevosCombinations.length > 0) {
                      gamesWithExtras = result.games.map((game, idx) => {
                          const pair = trevosCombinations[idx % trevosCombinations.length];
                          // Sort main numbers and add trevos (with offset)
                          return [...game.sort((a,b) => a - b), ...pair.map(n => n + offset)];
                      });
                  } else {
                      gamesWithExtras = ensureExtras(result.games);
                  }
             } else {
                 gamesWithExtras = ensureExtras(result.games);
             }

             setOperationStep('Finalizando...');
             setGeneratedGames(gamesWithExtras);
             setCoveringResult({ ...result, games: gamesWithExtras });
             setLoadingMessage('');
             setOperationStep('');
             setShowResultsSkeleton(false);
             analytics.trackGenerateGames({
               lottery: lottery.id,
               mode: 'combinatorial',
               count: result.games.length,
               wheelType: coveringConfig.wheelType
             });
           } catch (coveringError: any) {
             // Fallback to original if new service fails
             console.warn('Covering design failed, falling back:', coveringError.message);
             setOperationStep('Usando método alternativo...');
             const games = generateCombinatorialGames(numbersForGeneration, lottery);
             const gamesWithExtras = ensureExtras(games);
             setGeneratedGames(gamesWithExtras);
             setCoveringResult(null);
             setLoadingMessage('');
             setOperationStep('');
             setShowResultsSkeleton(false);
             analytics.trackGenerateGames({ lottery: lottery.id, mode: 'combinatorial', count: games.length });
           }
        } else {
            // Smart/Simple/Multiple Mode
            const targetCount = typeof countOverride === 'number' ? countOverride : gamesCount;
            setLoadingMessage(targetCount === 1 ? 'Gerando 1 palpite...' : 'Gerando combinações...');
            setOperationStep('Analisando histórico...');
            setOperationTotal(targetCount);

            const hotNumbers = analysis ? analysis.hotNumbers : [];

            // For Surpresinha, we use minimal config (random)
            // For Multiple, we pass the selectedGameSize
            const effectiveConfig = betType === 'surpresinha' ? DEFAULT_EXTENDED_CONFIG : config;
            const effectiveSize = betType === 'multiple' ? selectedGameSize : lottery.gameSize;

            // Pass ONLY the game arrays to generateGamesExtended
            const gamesHistory = history.map(h => h.numbers);

            setOperationStep('Gerando jogos otimizados...');
            const games = await generateGamesExtended(
                targetCount, gamesHistory, effectiveConfig, lottery, hotNumbers, analysis || undefined, effectiveSize
            );

            setOperationProgress(targetCount);
            setOperationStep('Adicionando números extras...');
            const gamesWithExtras = ensureExtras(games);

            setOperationStep('Finalizando...');
            setGeneratedGames(gamesWithExtras);
            setOperationStep('');
            setShowResultsSkeleton(false);

            analytics.trackGenerateGames({ lottery: lottery.id, mode: 'smart', count: games.length, betType });
            if (games.length < targetCount) {
             setError(`Conseguimos gerar apenas ${games.length} jogos com esses filtros restritivos.`);
            }
        }

        // Track games (fire and forget)
        // Note: we can't access 'games' here easily without refactoring, so we skip tracking for now or do it inside the if blocks
        // For simplicity, tracking is omitted for this iteration.

      } catch (e: any) {
        setError(e.message || 'Erro na geração.');
        setShowResultsSkeleton(false);
        setOperationStep('');
      } finally {
        setIsLoading(false);
        setOperationProgress(0);
        setOperationTotal(0);
      }
    }, 100);
  };

  const handleDownload = () => {
    if (generatedGames.length === 0) return;

    const ws = utils.aoa_to_sheet(generatedGames);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Jogos Gerados");
    writeFile(wb, `Jogos_${lottery.name}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const copyToClipboard = () => {
    const text = generatedGames.map(g => g.map(n => n.toString().padStart(2, '0')).join(' ')).join('\n');
    navigator.clipboard.writeText(text);
    alert('Jogos copiados para a área de transferência!');
  };

  const handleSaveGames = async () => {
    if (!isAuthenticated) {
      // Trigger the auth modal globally
      window.dispatchEvent(new CustomEvent('open-auth-modal'));
      return;
    }

    try {
      setIsLoading(true);
      setLoadingMessage('Salvando jogos...');
      
      const response = await fetch(`${apiUrl}/api/user/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lottery_type: currentLotteryId,
          numbers: generatedGames,
          note: `Gerado em ${new Date().toLocaleString()}`
        })
      });

      if (!response.ok) throw new Error('Erro ao salvar');
      
      setSaveSuccess(Date.now());
      setTimeout(() => setSaveSuccess(null), 3000);
      
    } catch (err: any) {
      setError('Falha ao salvar jogos: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-gray-900 selection:bg-gray-200">
      <FilterExamplesModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <CookieConsent onAccept={initializeGAAfterConsent} />

      {/* Full-Screen Loading Overlay */}
      {(isLoading || isDataLoading) && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Progress Bar at the very top */}
          <div className="w-full h-1.5 bg-gray-200 overflow-hidden">
            {operationTotal > 0 ? (
              <div
                className="h-full transition-all duration-300 ease-out"
                style={{
                  backgroundColor: lottery.color,
                  width: `${Math.min((operationProgress / operationTotal) * 100, 100)}%`
                }}
              />
            ) : (
              <div
                className="h-full w-1/3 rounded-full"
                style={{
                  backgroundColor: lottery.color,
                  animation: 'shimmer 1.2s ease-in-out infinite'
                }}
              />
            )}
          </div>

          {/* CSS for shimmer animation */}
          <style>{`
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(400%); }
            }
          `}</style>

          {/* Overlay Content */}
          <div className="flex-1 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center px-4">
            {/* Logo and Spinner */}
            <div className="relative mb-8">
              <div
                className="w-20 h-20 rounded-full border-4 border-gray-100 animate-spin"
                style={{ borderTopColor: lottery.color, borderRightColor: lottery.color + '40' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Clover className="w-8 h-8 text-gray-300" />
              </div>
            </div>

            {/* Main Loading Message - prioritize local loading, fall back to data loading */}
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 text-center mb-3">
              {loadingMessage || dataLoadingMessage || 'A processar...'}
            </h2>

            {/* Step Description */}
            {operationStep && (
              <p className="text-gray-500 text-center text-sm md:text-base mb-4 max-w-md">
                {operationStep}
              </p>
            )}

            {/* Progress Info */}
            {operationTotal > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-full">
                <span className="font-bold" style={{ color: lottery.color }}>
                  {operationProgress}
                </span>
                <span>de</span>
                <span className="font-bold">{operationTotal}</span>
              </div>
            )}

            {/* Syncing specific message */}
            {isSyncing && (
              <div className="mt-4 flex items-center gap-2 text-blue-600 text-sm bg-blue-50 px-4 py-2 rounded-lg">
                <CloudDownload className="w-4 h-4 animate-bounce" />
                <span>Sincronizando com a Caixa Econômica Federal...</span>
              </div>
            )}

            {/* Friendly message */}
            <p className="text-gray-400 text-xs mt-8 text-center max-w-xs">
              Por favor, aguarde enquanto preparamos tudo para si.
            </p>
          </div>
        </div>
      )}

      {/* Hero / Header Section */}
      <header 
        className="bg-gray-900 text-white pb-12 pt-8 px-4 shadow-lg transition-colors duration-500"
        style={{ backgroundColor: lottery.color }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  <Clover className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">LotoGen Pro</h1>
              </div>
              <p className="text-white/80 text-sm md:text-base font-medium max-w-md">
                Algoritmos avançados para geração de jogos da {lottery.name} baseados em padrões históricos e matemáticos.
              </p>
              
              <div className="flex flex-wrap gap-3 mt-4">
                 <UserMenu />
                 {winnersCount > 0 && (
                  <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-400/30 text-green-100 px-4 py-2 rounded-lg backdrop-blur-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-semibold">
                      {winnersCount.toLocaleString()} vencedores!
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Lottery Selector Tabs */}
            <div className="bg-white/10 p-1.5 rounded-xl backdrop-blur-md flex flex-wrap gap-1 max-w-full">
              {Object.values(LOTTERIES).map((l) => (
                <button
                  key={l.id}
                  onClick={() => handleLotteryChange(l.id)}
                  className={clsx(
                    "px-5 py-2.5 rounded-lg font-bold text-sm md:text-base transition-all whitespace-nowrap flex items-center justify-center gap-2 min-h-[44px]",
                    currentLotteryId === l.id
                      ? "bg-white shadow-lg scale-105"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                  style={{ color: currentLotteryId === l.id ? l.color : undefined }}
                >
                  {currentLotteryId === l.id && <CircleDot className="w-4 h-4" />}
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 -mt-8">
        
        {/* User Dashboard Overlay */}
        {showDashboard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative animate-scale-in">
               <button 
                  onClick={() => setShowDashboard(false)}
                  className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
               <UserDashboard />
            </div>
          </div>
        )}
        
        {/* Beta Testing Banner for New Lotteries */}
        {['duplasena', 'timemania', 'diadesorte'].includes(currentLotteryId) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-semibold text-amber-800 mb-1">🧪 Recurso em Fase de Testes</h4>
                <p className="text-sm text-amber-700">
                  Os geradores para <strong>Dupla Sena</strong>, <strong>Timemania</strong> e <strong>Dia de Sorte</strong> foram recentemente adicionados e estão em fase de testes.
                  Algumas funcionalidades podem não estar totalmente disponíveis. Estamos trabalhando para melhorar continuamente!
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* +Milionária Feature Banner */}
        {currentLotteryId === 'maismilionaria' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Clover className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-semibold text-emerald-800 mb-1">🍀 +Milionária - Dois Sorteios em Um!</h4>
                <p className="text-sm text-emerald-700">
                  A <strong>+Milionária</strong> possui dois sorteios independentes: <strong>6 números</strong> de 1 a 50 + <strong>2 trevos</strong> de 1 a 6.
                  O sistema agora oferece <strong>estatísticas avançadas</strong> e <strong>filtros específicos</strong> para os trevos, incluindo análise de atrasos, 
                  pares mais frequentes, tendências e muito mais!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Syncing Banner */}
        {isSyncing && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full animate-spin">
                <CircleDot className="w-5 h-5 text-blue-600 border-t-transparent" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-0.5">Sincronizando Resultados...</h4>
                <p className="text-sm text-blue-700">
                  Estamos baixando os resultados oficiais da Caixa para {lottery.name}.
                  Isso pode levar alguns instantes. Os dados aparecerão automaticamente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Operation Progress Banner */}
        {isLoading && operationStep && (
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4 mb-4 animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-full">
                <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-violet-800 mb-1">{loadingMessage}</h4>
                <p className="text-sm text-violet-700">{operationStep}</p>

                {/* Indeterminate progress bar for file operations */}
                {!showResultsSkeleton && operationTotal === 0 && (
                  <div className="mt-3 bg-violet-200 rounded-full h-2 overflow-hidden relative">
                    <div className="absolute inset-0 bg-violet-600 rounded-full animate-pulse origin-left"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Latest Result Card */}
        {latestResult && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 mb-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: lottery.color + '20' }}>
                  <Dna className="w-5 h-5" style={{ color: lottery.color }} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    Último Resultado - Concurso {latestResult.draw_number}
                    {latestResult.draw_date && <span className="ml-2 text-xs">({latestResult.draw_date})</span>}
                  </p>
                  {/* Números Principais */}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {latestResult.numbers
                      .filter(num => parseInt(String(num)) <= lottery.totalNumbers)
                      .map((num, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center justify-center w-8 h-8 text-sm font-bold rounded-full text-white"
                        style={{ backgroundColor: lottery.color }}
                      >
                        {String(num).padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                  {/* Trevos para +Milionária */}
                  {lottery.hasExtras && (
                    <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                          <Clover className="w-3 h-3" />
                          {lottery.extrasName || 'Trevos'}:
                        </span>
                        <div className="flex gap-1">
                          {(() => {
                            const offset = lottery.extrasOffset || 100;
                            // Trevos são números > offset (ex: 101-106 para offset 100)
                            const trevos = latestResult.numbers
                              .map(num => parseInt(String(num)))
                              .filter(n => n > offset)
                              .slice(0, lottery.extrasGameSize || 2);
                            
                            if (trevos.length > 0) {
                              return trevos.map((num, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-full text-white bg-emerald-500"
                                >
                                  {num - offset}
                                </span>
                              ));
                            }
                            
                            // Fallback: se não houver trevos com offset, mostra os últimos números
                            if (latestResult.numbers.length > lottery.drawSize) {
                              return latestResult.numbers.slice(lottery.drawSize).map((num, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-full text-white bg-emerald-500"
                                >
                                  {num}
                                </span>
                              ));
                            }
                            
                            return <span className="text-xs text-gray-400 italic">Não disponível</span>;
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Control Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8 animate-slide-up">
          
          {/* File Upload Section */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-8 border-b border-gray-100">
            <div className="flex-1 w-full">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-gray-400" />
                1. Carregar Resultados ({lottery.name})
              </label>
              <div className="flex gap-2">
                 <div className="relative flex-1 group">
                    <input 
                      type="file" 
                      accept=".xlsx, .xls, .csv" 
                      onChange={handleFileUpload}
                      ref={fileInputRef}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={clsx(
                      "flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed transition-all",
                      history.length > 0 
                        ? "border-green-300 bg-green-50" 
                        : "border-gray-300 bg-gray-50 group-hover:border-gray-400"
                    )}>
                      <div className={clsx("p-2 rounded-full", history.length > 0 ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-500")}>
                        {history.length > 0 ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {history.length > 0 ? `${history.length} concursos carregados` : "Clique para selecionar arquivo"}
                        </p>
                        <p className="text-xs text-gray-500">Suporta Excel (.xlsx) ou CSV</p>
                      </div>
                    </div>
                 </div>
                 <button 
                   onClick={handleDownloadHistory}
                   className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl border border-blue-200 hover:border-blue-300 transition-colors"
                   title={`Baixar resultados da ${lottery.name}`}
                 >
                   <CloudDownload className="w-5 h-5" />
                 </button>
                 {history.length > 0 && (
                   <button 
                    onClick={() => {
                      setHistory([]);
                      setAnalysis(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-colors"
                    title="Limpar histórico"
                   >
                     <Trash2 className="w-5 h-5" />
                   </button>
                 )}
              </div>
              {/* Hidden form for downloading results from asloterias.com.br */}
              <form 
                ref={downloadFormRef}
                action="https://asloterias.com.br/download_excel.php" 
                method="POST" 
                target="_blank"
                className="hidden"
              >
                <input type="hidden" name="l" value={lottery.downloadParam} />
                <input type="hidden" name="t" value="t" />
                <input type="hidden" name="o" value="s" />
              </form>
            </div>

            {/* Only show Quantity Input if NOT in Combinatorial Mode */}
            {mode !== 'combinatorial' && (
                <div className="w-full md:w-auto flex flex-col items-stretch md:items-end">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    2. Quantidade de Jogos
                </label>
                <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 p-1">
                    <button 
                    onClick={() => setGamesCount(Math.max(1, gamesCount - 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-gray-600 transition-all"
                    >
                    -
                    </button>
                    <input 
                    type="number" 
                    value={gamesCount}
                    onChange={(e) => setGamesCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center bg-transparent font-bold text-gray-800 outline-none"
                    />
                    <button 
                    onClick={() => setGamesCount(gamesCount + 1)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-gray-600 transition-all"
                    >
                    <Plus className="w-4 h-4" />
                    </button>
                </div>
                </div>
            )}
          </div>

          {/* MODE SELECTOR */}
          <div className="flex gap-4 mb-6 border-b border-gray-200 pb-6">
              <button 
                 onClick={() => setMode('smart')}
                 className={clsx(
                    "flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                    mode === 'smart' 
                      ? "bg-gray-900 text-white shadow-lg" 
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                 )}
              >
                  <Clover className="w-5 h-5" />
                  Gerador Inteligente
              </button>
              <button 
                 onClick={() => setMode('combinatorial')}
                 disabled={lottery.gameSize >= 50}
                 title={lottery.gameSize >= 50 ? 'Não disponível para Lotomania (50 números por jogo)' : undefined}
                 className={clsx(
                    "flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                    mode === 'combinatorial' 
                      ? "text-white shadow-lg" 
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                    lottery.gameSize >= 50 && "opacity-50 cursor-not-allowed"
                 )}
                 style={mode === 'combinatorial' ? { backgroundColor: lottery.color } : {}}
              >
                  <Grid className="w-5 h-5" />
                  Fechamentos (Matemática Pura)
              </button>
          </div>

          {/* CONTENT BASED ON MODE */}
          {mode === 'smart' ? (
             <>
                {/* Statistics Summary (if loaded) */}
                <StatisticsPanel analysis={analysis} lottery={lottery} />
      
                {/* Bet Type Selector */}
                <BetTypeSelector 
                    currentType={betType}
                    onTypeChange={setBetType}
                    lottery={lottery}
                    selectedGameSize={selectedGameSize}
                    onGameSizeChange={setSelectedGameSize}
                    gamesCount={gamesCount}
                />

                {/* Settings Section (Hidden for Surpresinha?) */}
                {betType !== 'surpresinha' && (
                  <SettingsPanel 
                    config={config} 
                    setConfig={setConfig} 
                    historyCount={history.length}
                    onOpenExamples={() => setIsModalOpen(true)}
                    lottery={lottery}
                    extendedAnalysis={analysis}
                    isMultipleBet={betType === 'multiple'}
                  />
                )}
             </>
          ) : (
             <CombinatorialPanel 
                lottery={lottery} 
                selection={combinatorialSelection}
                setSelection={setCombinatorialSelection}
                analysis={analysis}
                exclusionMode={exclusionMode}
                setExclusionMode={setExclusionMode}
                coveringConfig={coveringConfig}
                setCoveringConfig={setCoveringConfig}
                abbreviatedStats={coveringResult ? coveringResult.stats : null}
                trevosSelection={trevosSelection}
                setTrevosSelection={setTrevosSelection}
             />
          )}

          {/* Action Button */}
          <div className="mt-8">
            <button
              onClick={() => handleGenerate()}
              disabled={isLoading}
              className="w-full relative group overflow-hidden rounded-xl p-4 transition-all shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ backgroundColor: lottery.color }}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <div className="relative flex items-center justify-center gap-3 text-white font-bold text-lg">
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{loadingMessage}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 fill-current" />
                    {mode === 'combinatorial' ? (
                        <span>Gerar Fechamento {coveringResult ? `(Recalcular)` : ''}</span>
                    ) : (
                        <span>Gerar {gamesCount} {gamesCount === 1 ? 'Jogo Otimizado' : 'Jogos Otimizados'}</span>
                    )}
                  </>
                )}
              </div>

              {/* Progress bar for operation progress */}
              {isLoading && operationTotal > 0 && (
                <div className="mt-3 bg-white/20 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-white h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(100, (operationProgress / operationTotal) * 100)}%` }}
                  />
                </div>
              )}

              {/* Current step indicator */}
              {isLoading && operationStep && (
                <div className="mt-2 text-center text-white/90 text-sm font-medium">
                  {operationStep}
                </div>
              )}
            </button>
            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100 animate-fade-in">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {(generatedGames.length > 0 || showResultsSkeleton) && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Dna className="w-6 h-6" style={{ color: lottery.color }} />
                Jogos Gerados
                {!showResultsSkeleton && (
                  <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {generatedGames.length}
                  </span>
                )}
                {showResultsSkeleton && (
                  <span className="text-sm font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded-full animate-pulse">
                    Gerando...
                  </span>
                )}
              </h2>
              {!showResultsSkeleton && (
                <div className="flex gap-2">
                  <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-bold rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm"
                >
                  <Copy className="w-5 h-5" />
                  Copiar
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-bold rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm"
                >
                  <Download className="w-5 h-5" />
                  Excel
                </button>
                
                <button
                  onClick={handleSaveGames}
                  disabled={!!saveSuccess}
                  className={`
                    flex items-center gap-2 px-6 py-3 font-bold rounded-xl shadow-lg transition-all text-white
                    ${saveSuccess 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : !isAuthenticated 
                        ? 'bg-gray-800 hover:bg-gray-900 ring-2 ring-white/20' 
                        : 'bg-gray-900 hover:bg-gray-800'
                    }
                  `}
                  style={{ backgroundColor: saveSuccess || !isAuthenticated ? undefined : lottery.color }}
                >
                  {saveSuccess ? <BookmarkCheck className="w-5 h-5" /> : <BookmarkPlus className="w-5 h-5" />}
                  {saveSuccess ? 'Salvo!' : !isAuthenticated ? 'Entrar para Salvar' : 'Salvar Jogos'}
                </button>
              </div>
              )}
            </div>

            {/* Skeleton Loader */}
            {showResultsSkeleton && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-5 bg-gray-200 rounded w-20"></div>
                      <div className="h-6 bg-gray-200 rounded-full w-8"></div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {[...Array(15)].map((_, i) => (
                        <div key={i} className="h-8 w-8 bg-gray-200 rounded-full"></div>
                      ))}
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Actual Results */}
            {!showResultsSkeleton && generatedGames.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedGames.map((game, idx) => (
                  <GameTicket key={idx} game={game} index={idx} lottery={lottery} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
