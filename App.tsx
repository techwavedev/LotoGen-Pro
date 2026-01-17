import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Download, Trash2, Clover, AlertCircle, FileSpreadsheet, Plus, Copy, Dna, Grid, CheckCircle2, CircleDot, CloudDownload } from 'lucide-react';
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
import { initializeGA } from './index';
import clsx from 'clsx';
import { utils, writeFile } from 'xlsx';

function App() {
  const [currentLotteryId, setCurrentLotteryId] = useState<LotteryId>('lotofacil');
  const lottery = LOTTERIES[currentLotteryId];

  // History State now holds Rich Entries (with metadata)
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [analysis, setAnalysis] = useState<ExtendedHistoryAnalysis | null>(null);
  const [generatedGames, setGeneratedGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [config, setConfig] = useState<ExtendedFilterConfig>(DEFAULT_EXTENDED_CONFIG);
  const [gamesCount, setGamesCount] = useState<number>(5);
  const [mode, setMode] = useState<'smart' | 'combinatorial'>('smart');
  const [combinatorialSelection, setCombinatorialSelection] = useState<number[]>([]);
  const [trevosSelection, setTrevosSelection] = useState<number[]>([]);
  const [exclusionMode, setExclusionMode] = useState(false); // For Lotomania: select numbers to EXCLUDE
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [latestResult, setLatestResult] = useState<{ draw_number: number; numbers: string[]; draw_date: string } | null>(null);
  const [winnersCount, setWinnersCount] = useState<number>(0);
  // Covering Design state
  const [coveringConfig, setCoveringConfig] = useState<CoveringDesignConfig>(DEFAULT_COVERING_CONFIG);
  const [coveringResult, setCoveringResult] = useState<CoveringDesignResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const downloadFormRef = useRef<HTMLFormElement>(null);
  const apiUrl = import.meta.env.VITE_API_URL;

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

  // Helper: Check if history cache is valid
  const isHistoryCacheValid = (cacheDate: string) => {
    const cached = new Date(cacheDate);
    const now = new Date();
    
    // If it's the same day and before 17:00, cache is valid
    if (cached.toDateString() === now.toDateString()) {
      return now.getHours() < 17;
    }
    // If it's yesterday after 17:00 and now is before 17:00 today, cache is valid
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (cached.toDateString() === yesterday.toDateString() && now.getHours() < 17) {
      return true;
    }
    return false;
  };

  // Reset state and fetch latest result + full history when lottery changes
  useEffect(() => {
    setHistory([]);
    setAnalysis(null);
    setGeneratedGames([]);
    setError(null);
    setLatestResult(null);
    
    // Adjust hot number defaults based on lottery size
    const idealHot = Math.floor(lottery.gameSize * 0.6); // Rule of thumb
    setConfig(prev => ({
        ...prev,
        minHotNumbers: Math.max(0, idealHot - 2),
        maxHotNumbers: idealHot + 2
    }));

    // Check cache first (independent of API)
    const cacheKey = `history_${currentLotteryId}`;
    const cachedData = localStorage.getItem(cacheKey);
    const cachedDateKey = `history_${currentLotteryId}_date`;
    const cachedDate = localStorage.getItem(cachedDateKey);
    
    let loadedFromCache = false;

    if (cachedData && cachedDate && isHistoryCacheValid(cachedDate)) {
      // Use cached data
      try {
        const rawGames = JSON.parse(cachedData);
        if (Array.isArray(rawGames) && rawGames.length > 0) {
            // Check if it's already HistoryEntry[] or just Game[] (legacy cache)
            // Heuristic: check if element has 'numbers' prop
            const isRich = rawGames[0].numbers && Array.isArray(rawGames[0].numbers);
            const historyEntries: HistoryEntry[] = isRich 
                ? rawGames 
                : rawGames.map((g: any) => ({ numbers: g }));

            setHistory(historyEntries);
            const stats = analyzeHistoryExtended(historyEntries.map(h => h.numbers), lottery);
            setAnalysis(stats);
            loadedFromCache = true;
        }
      } catch (e) {
        console.error("Cache invalido", e);
      }
    }

    // Auto-fetch from API if available
    if (apiUrl) {
      // Fetch latest result
      fetch(`${apiUrl}/api/lottery/${currentLotteryId}/latest`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.numbers) {
            setLatestResult({
              draw_number: data.draw_number,
              numbers: data.numbers,
              draw_date: data.draw_date
            });
          }
        })
        .catch(() => {});

      if (!loadedFromCache) {
        // Fetch full history for analysis if not in cache
        const fetchHistory = () => {
          setIsLoading(true);
          // Don't overwrite message if already syncing
          if (!isSyncing) setLoadingMessage(`Carregando histórico da ${lottery.name}...`);
          
          fetch(`${apiUrl}/api/lottery/${currentLotteryId}/history`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              if (data) {
                if (data.syncing) {
                   setIsSyncing(true);
                   setLoadingMessage(`Sincronizando com a Caixa...`);
                   // If syncing, scheduling a retry in 5 seconds
                   setTimeout(fetchHistory, 5000);
                } else {
                   setIsSyncing(false);
                }

                if (data.games && data.games.length > 0) {
                  // API currently returns { games: Game[] } i.e. number[][]
                  // We must map to HistoryEntry[]
                  const entries: HistoryEntry[] = data.games.map((g: Game) => ({ numbers: g }));
                  
                  // Only update if we have MORE data or differ significantly
                  if (entries.length > history.length) {
                      setHistory(entries);
                      // Run analysis
                      const stats = analyzeHistoryExtended(entries.map(h => h.numbers), lottery);
                      setAnalysis(stats);
                      
                      localStorage.setItem(cacheKey, JSON.stringify(entries));
                      localStorage.setItem(cachedDateKey, new Date().toISOString());
                  }
                }
              }
            })
            .catch(() => {
              if (!isSyncing) setError('Falha ao carregar histórico. Tente o upload manual.');
            })
            .finally(() => {
              setIsLoading(false);
            });
        };

        fetchHistory();
      }
    }
  }, [currentLotteryId, lottery.gameSize, apiUrl, lottery]);

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
    setSelectedGameSize(lottery.gameSize);
    // Auto-enable exclusion mode for Lotomania (gameSize >= 50)
    setExclusionMode(false); // Always reset to standard inclusion mode on lottery change
    setCombinatorialSelection([]); // Clear selection when lottery changes
    setTrevosSelection([]); // Clear trevos selection
  }, [lottery]);

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
    setLoadingMessage(`Buscando resultados da ${lottery.name}...`);

    try {
      // Try to fetch via a CORS proxy or direct request
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

      const blob = await response.blob();
      const file = new File([blob], `${lottery.name}.xlsx`, { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      setLoadingMessage(`Analisando histórico da ${lottery.name}...`);
      
      const data = await parseHistoryFile(file, lottery);
      if (data.length === 0) {
        throw new Error(`Nenhum jogo válido encontrado.`);
      }
      setHistory(data);
      
      // Map to plain numbers for analysis
      const stats = analyzeHistoryExtended(data.map(h => h.numbers), lottery);
      setAnalysis(stats);
      setError(null);

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
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setLoadingMessage(`Analisando histórico da ${lottery.name}...`);

    try {
      const data = await parseHistoryFile(file, lottery);
      if (data.length === 0) {
        throw new Error(`Nenhum jogo válido de ${lottery.gameSize} números encontrado.`);
      }
      setHistory(data);
      
      // Map for analysis
      const stats = analyzeHistoryExtended(data.map(h => h.numbers), lottery);
      setAnalysis(stats);

    } catch (err: any) {
      console.error(err);
      setError('Erro ao ler arquivo: ' + (err.message || 'Formato inválido'));
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

    setTimeout(async () => {
      try {
        if (mode === 'combinatorial') {
           setLoadingMessage('Gerando fechamento combinatório...');
           // Combinatorial Mode
           // For exclusion mode: calculate active pool (all numbers EXCEPT selection)
           const numbersForGeneration = exclusionMode
               ? Array.from({ length: lottery.totalNumbers }, (_, i) => i + 1).filter(n => !combinatorialSelection.includes(n))
               : combinatorialSelection;
           
           // Use the new covering design service based on config
           try {
             const result = generateCoveringDesign(numbersForGeneration, lottery, coveringConfig);
             
             // Handle Trevos Distribution (Strategy: Round Robin of Combinations)
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

             setGeneratedGames(gamesWithExtras);
             setCoveringResult({ ...result, games: gamesWithExtras });
             setLoadingMessage('');
             analytics.trackGenerateGames({ 
               lottery: lottery.id, 
               mode: 'combinatorial', 
               count: result.games.length,
               wheelType: coveringConfig.wheelType 
             });
           } catch (coveringError: any) {
             // Fallback to original if new service fails
             console.warn('Covering design failed, falling back:', coveringError.message);
             const games = generateCombinatorialGames(numbersForGeneration, lottery);
             const gamesWithExtras = ensureExtras(games);
             setGeneratedGames(gamesWithExtras);
             setCoveringResult(null);
             setLoadingMessage('');
             analytics.trackGenerateGames({ lottery: lottery.id, mode: 'combinatorial', count: games.length });
           }
        } else {
            // Smart/Simple/Multiple Mode
            const targetCount = typeof countOverride === 'number' ? countOverride : gamesCount;
            setLoadingMessage(targetCount === 1 ? 'Gerando 1 palpite...' : 'Gerando combinações...');
            
            const hotNumbers = analysis ? analysis.hotNumbers : [];
            
            // For Surpresinha, we use minimal config (random)
            // For Multiple, we pass the selectedGameSize
            const effectiveConfig = betType === 'surpresinha' ? DEFAULT_EXTENDED_CONFIG : config;
            const effectiveSize = betType === 'multiple' ? selectedGameSize : lottery.gameSize;
            
            // Pass ONLY the game arrays to generateGamesExtended
            const gamesHistory = history.map(h => h.numbers);

            const games = await generateGamesExtended(
                targetCount, gamesHistory, effectiveConfig, lottery, hotNumbers, analysis || undefined, effectiveSize
            );
            
            const gamesWithExtras = ensureExtras(games);
            setGeneratedGames(gamesWithExtras);
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
      } finally {
        setIsLoading(false);
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-gray-900 selection:bg-gray-200">
      <FilterExamplesModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <CookieConsent onAccept={initializeGA} />

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
              {winnersCount > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 bg-green-500/20 border border-green-400/30 text-green-100 px-4 py-2 rounded-lg backdrop-blur-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">
                    Já geramos {winnersCount.toLocaleString()} combinações vencedoras desde 2026!
                  </span>
                </div>
              )}
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
                    {loadingMessage}
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 fill-current" />
                    Gerar {gamesCount} {gamesCount === 1 ? 'Jogo Otimizado' : 'Jogos Otimizados'}
                  </>
                )}
              </div>
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
        {generatedGames.length > 0 && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Dna className="w-6 h-6" style={{ color: lottery.color }} />
                Jogos Gerados
                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {generatedGames.length}
                </span>
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm shadow-sm"
                >
                  <Copy className="w-4 h-4" />
                  Copiar
                </button>
                <button 
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-opacity font-medium text-sm shadow-sm hover:opacity-90"
                  style={{ backgroundColor: lottery.color }}
                >
                  <Download className="w-4 h-4" />
                  Excel
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedGames.map((game, idx) => (
                <GameTicket key={idx} game={game} index={idx} lottery={lottery} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
