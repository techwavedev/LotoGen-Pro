import React from "react";
import { ExtendedFilterConfig, LotteryDefinition, LOTTERY_MANDEL_RECOMMENDATIONS, ExtendedHistoryAnalysis } from "../types";
import { useFilterConflicts } from "../hooks/useFilterConflicts";
import {
  AlertTriangle,
  CheckCircle,
  Ban,
  Eye,
  Scale,
  Flame,
  Timer,
  Hash,
  TrendingUp,
  Repeat,
  RotateCcw,
  Snowflake,
} from "lucide-react";
import clsx from "clsx";

interface SettingsPanelProps {
  config: ExtendedFilterConfig;
  setConfig: React.Dispatch<React.SetStateAction<ExtendedFilterConfig>>;
  historyCount: number;
  onOpenExamples: () => void;
  lottery: LotteryDefinition;
  extendedAnalysis?: ExtendedHistoryAnalysis | null;
  isMultipleBet?: boolean; // True when user selects "Múltipla" bet type
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  setConfig,
  historyCount,
  onOpenExamples,
  lottery,
  extendedAnalysis,
  isMultipleBet = false,
}) => {
  // Integrate conflict resolution hook
  useFilterConflicts(config, setConfig, lottery);

  const toggle = (key: keyof ExtendedFilterConfig) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setNumber = (key: keyof ExtendedFilterConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const hasHistory = historyCount > 0;
  const isLotofacil = lottery.id === "lotofacil";

  // Compute dynamic defaults from historical analysis
  const staticRec = LOTTERY_MANDEL_RECOMMENDATIONS[lottery.id] || { 
    primes: { min: 0, max: lottery.gameSize, hint: "Padrão" }, 
    decades: { min: 1, total: 1, hint: "Padrão" }, 
    edges: { min: 0, max: lottery.gameSize, hint: "Padrão" }, 
    spread: { min: 1, hint: "Padrão" }, 
    fibonacci: { min: 0, available: 0, hint: "Padrão" } 
  };

  const statDefaults = React.useMemo(() => {
    const hasAnalysis = !!extendedAnalysis;
    
    // Heuristics for unsupported lotteries or no history
    // Calculate expected average sum mathematically: (N * (Total+1)) / 2
    const expectedSum = (lottery.gameSize * (lottery.totalNumbers + 1)) / 2;
    // Allow wide variance (±25%) for default safe range
    const baseSumMin = Math.floor(expectedSum * 0.75); 
    const baseSumMax = Math.ceil(expectedSum * 1.25);
    
    // Dynamic consecutive default: 
    // High density lotteries (Lotofacil 15/25, Lotomania 50/100) have varied needs.
    // Lotomania (50 numbers) basically guarantees consecutives, so filter should be very loose or permissive.
    // Lotofacil (15 numbers) also high density.
    const isHighDensity = (lottery.gameSize / lottery.totalNumbers) > 0.4;
    
    // For Lotomania (size 50), consecutive limit of 3 is impossible. Limit should be near gameSize.
    const safeConsecutive = isHighDensity ? (lottery.gameSize - 1) : 3;

    if (!extendedAnalysis) {
      return {
        hasAnalysis: false,
        sum: [baseSumMin, baseSumMax],
        consecutive: safeConsecutive, 
        delay: 10,
        repeat: [1, 5],
        primes: { min: staticRec.primes.min, max: staticRec.primes.max },
        decades: { min: staticRec.decades.min },
        edges: { min: staticRec.edges.min, max: staticRec.edges.max },
        spread: { min: staticRec.spread.min },
        fibonacci: { min: staticRec.fibonacci.min },
        hints: {
          sum: `Padrão: ${baseSumMin}-${baseSumMax}`,
          consecutive: `Padrão: Máx ${safeConsecutive}`,
          delay: "Padrão: >10 atrasos",
          repeat: "Padrão: 1-5 repetidos"
        }
      };
    }
    
    // Use actual historical analysis data
    // CRITICAL: Scale stats if gameSize > drawSize (e.g. Lotomania)
    const scaleRatio = lottery.gameSize / (lottery.drawSize || lottery.gameSize);
    
    // Primes - add buffer to make less restrictive
    const hPrimes = extendedAnalysis.primeDistributionStats?.recommendedRange || [staticRec.primes.min, staticRec.primes.max];
    const primeMin = Math.max(1, Math.floor(hPrimes[0] * scaleRatio) - 1); // -1 for flexibility
    const primeMax = Math.ceil(hPrimes[1] * scaleRatio) + 2; // +2 for flexibility

    // Edges - add buffer to make less restrictive
    const hEdges = extendedAnalysis.edgeNumberStats?.recommendedRange || [staticRec.edges.min, staticRec.edges.max];
    const edgeMin = Math.max(2, Math.floor(hEdges[0] * scaleRatio) - 2); // -2 for flexibility
    const edgeMax = Math.ceil(hEdges[1] * scaleRatio) + 2; // +2 for flexibility

    // Decades (Coverage tends to saturate, so don't scale linearly beyond total decades)
    const hDecadeAvg = extendedAnalysis.decadeDistributionStats?.avgDecadesCovered || staticRec.decades.min;
    // For Lotomania (50 picks), you almost always pick more decades than history (20 picks).
    // If history covers 8 decades (avg), 50 picks likely covers 10.
    // Heuristic: if scale > 1.5, assume near full coverage is safe.
    const decadeMin = scaleRatio > 1.5 ? Math.min(10, Math.floor(hDecadeAvg + 2)) : Math.floor(hDecadeAvg);

    // Spread (Avg distance decreases as you pick more numbers!)
    // If you pick 2.5x more numbers, the gap between them shrinks by 2.5x.
    const hSpreadAvg = extendedAnalysis.spreadStats?.recommendedMinSpread || staticRec.spread.min;
    const spreadMin = Math.max(0.5, hSpreadAvg / scaleRatio);

    // Fibonacci
    const hFib = extendedAnalysis.fibonacciStats?.recommendedRange || [staticRec.fibonacci.min, staticRec.fibonacci.min + 2];
    const fibMin = Math.floor(hFib[0] * scaleRatio);

    // Stats - widen sum range for more flexibility
    const sumAvgHist = extendedAnalysis.sumStats?.averageSum || expectedSum;
    const sumAvgScaled = sumAvgHist * scaleRatio;
    const sumMin = Math.floor(sumAvgScaled * 0.75); // Was 0.85, now 0.75 for more flexibility
    const sumMax = Math.ceil(sumAvgScaled * 1.25); // Was 1.15, now 1.25 for more flexibility
    
    // Consecutive
    const avgConsecutive = extendedAnalysis.consecutiveStats?.avgPairs || 0;
    // Pairs increase roughly linearly or quadratically?
    // Lotomania: 20 picks has few pairs. 50 picks has MANY.
    // Let's rely on the safeConsecutive heuristic if scale is large.
    const histConsecutiveScaled = Math.ceil(avgConsecutive * scaleRatio * scaleRatio); // Pairs scale quadratically approx
    // For high density lotteries (Lotofacil/Lotomania), always prefer the wider safe limit to avoid blocking generation
    const finalConsecutive = (scaleRatio > 1.5 || isHighDensity) ? safeConsecutive : (histConsecutiveScaled > 0 ? histConsecutiveScaled + 2 : safeConsecutive);

    // Historical Delay (applies to individual numbers, doesn't scale with game size)
    const avgDelay = extendedAnalysis.delayStats?.[0]?.avgDelay || 8;
    const safeDelay = Math.floor(avgDelay * 0.8);

    // Historical Repeats (Comparison with previous draw)
    // If matching against a previous draw of 20, and we have 50 numbers...
    // Expected intersection is higher.
    const avgRepeats = extendedAnalysis.repeatBetweenDrawsStats?.avgRepeats || 0;
    const avgRepeatsScaled = avgRepeats * scaleRatio;
    
    const minRep = Math.max(0, Math.floor(avgRepeatsScaled - 2));
    const maxRep = Math.ceil(avgRepeatsScaled + 3);

    return {
      hasAnalysis: true,
      sum: [sumMin, sumMax],
      consecutive: finalConsecutive, // Use calculated safe value
      delay: safeDelay > 2 ? safeDelay : 5, 
      repeat: [minRep, maxRep],
      
      primes: { min: primeMin, max: primeMax },
      decades: { min: decadeMin },
      edges: { min: edgeMin, max: edgeMax },
      spread: { min: spreadMin },
      fibonacci: { min: fibMin }, 
      
      hints: {
        sum: `Histórico (Ajustado): ~${sumAvgScaled.toFixed(0)}`,
        consecutive: `Padrão: Máx ${finalConsecutive}`,
        delay: `Histórico: média ${avgDelay.toFixed(1)} concursos`,
        repeat: `Histórico (Ajustado): ~${avgRepeatsScaled.toFixed(1)}`,
        cycle: `Faltam ${extendedAnalysis.cycleStats?.missingNumbers.length || '?'} números no ciclo atual`
      }
    };
  }, [extendedAnalysis, staticRec, lottery]);

  // Generate dynamic hints based on analysis
  const getHint = (type: 'primes' | 'decades' | 'edges' | 'spread' | 'fibonacci') => {
    const baseHint = staticRec[type].hint;
    if (!extendedAnalysis) return baseHint;
    
    switch (type) {
      case 'primes':
        return `Histórico: ${extendedAnalysis.primeDistributionStats?.avgPrimesPerGame?.toFixed(1) || '?'} primos/jogo. ${baseHint}`;
      case 'decades':
        return `Histórico: ${extendedAnalysis.decadeDistributionStats?.avgDecadesCovered?.toFixed(1) || '?'} dezenas/jogo. ${baseHint}`;
      case 'edges':
        return `Histórico: ${extendedAnalysis.edgeNumberStats?.avgEdgesPerGame?.toFixed(1) || '?'} bordas/jogo. ${baseHint}`;
      case 'spread':
        return `Histórico: gap médio ${extendedAnalysis.spreadStats?.avgSpread?.toFixed(1) || '?'}. ${baseHint}`;
      default:
        return baseHint;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Ban className="w-5 h-5 text-red-500" />
          Configuração de Filtros
        </h2>
        <button
          onClick={onOpenExamples}
          className="text-sm flex items-center gap-1.5 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors font-medium"
          style={{ color: lottery.color }}
        >
          <Eye className="w-4 h-4" />
          Visualizar Exemplos
        </button>
      </div>


      {/* Warning for Multiple Bet */}
      {isMultipleBet && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Aposta Múltipla Selecionada
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Alguns filtros foram ajustados automaticamente para jogos maiores.
              Se tiver dificuldades na geração, desative filtros avançados.
            </p>
          </div>
        </div>
      )}

      {/* Otimizar Tudo Button - Prominent at Top */}
      <button
        onClick={() => {
          const idealHotMin = Math.max(0, Math.floor(lottery.gameSize * 0.4));
          const idealHotMax = Math.ceil(lottery.gameSize * 0.7);
          
          setConfig(prev => ({
            ...prev,
            // Hot/Cold
            useHotColdFilter: true,
            minHotNumbers: idealHotMin,
            maxHotNumbers: idealHotMax,
            // Sum range
            useSumFilter: true,
            minSum: statDefaults.sum[0] || prev.minSum,
            maxSum: statDefaults.sum[1] || prev.maxSum,
            // Consecutive
            useConsecutiveFilter: true,
            maxConsecutivePairs: statDefaults.consecutive,
            // Delay
            useDelayFilter: true,
            minDelayedNumbers: 2,
            delayThreshold: statDefaults.delay,
            // Repeat
            useRepeatFilter: true,
            minRepeatsFromLast: statDefaults.repeat[0],
            maxRepeatsFromLast: statDefaults.repeat[1],
            // Interleaving & Trend
            useInterleavingFilter: true,
            useTrendFilter: true,
            minTrendingHot: 3,
            // Cycle - Force cycle completion
            useCycleFilter: true,
            // Mandel
            usePrimeCountFilter: true,
            minPrimes: statDefaults.primes.min,
            maxPrimes: statDefaults.primes.max,
            useDecadeBalanceFilter: true,
            minDecadesRepresented: statDefaults.decades.min,
            useEdgeFilter: true,
            minEdgeNumbers: statDefaults.edges.min,
            maxEdgeNumbers: statDefaults.edges.max,
            useSpreadFilter: true,
            minAverageSpread: statDefaults.spread.min,
            useFibonacciFilter: true,
            minFibonacciNumbers: statDefaults.fibonacci.min,
          }));
        }}
        className="w-full mb-4 py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl shadow-md hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
        title="Aplica todas as configurações recomendadas baseadas no histórico, incluindo fechamento de ciclo"
      >
        <CheckCircle className="w-5 h-5" />
        Otimizar Tudo (Recomendado)
        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">+ Forçar Ciclo</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Historical Filters */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Evitar Combinações Premiadas
          </h3>
          {hasHistory ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-2">
                Bloqueia jogos que teriam ganho prêmios em sorteios anteriores:
              </p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.exclude15Hits}
                  onChange={() => toggle("exclude15Hits")}
                  className="w-5 h-5 rounded focus:ring-offset-0"
                  style={{ color: lottery.color }}
                />
                <span className="text-gray-700">
                  🥇 1º Prêmio ({lottery.drawSize} acertos)
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.exclude14Hits}
                  onChange={() => toggle("exclude14Hits")}
                  className="w-5 h-5 rounded"
                  style={{ color: lottery.color }}
                />
                <span className="text-gray-700">
                  🥈 2º Prêmio ({lottery.drawSize - 1} acertos)
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.exclude13Hits}
                  onChange={() => toggle("exclude13Hits")}
                  className="w-5 h-5 rounded"
                  style={{ color: lottery.color }}
                />
                <span className="text-gray-700">
                  🥉 3º Prêmio ({lottery.drawSize - 2} acertos)
                </span>
              </label>

              {lottery.gameSize <= 20 && (
                <div className="pt-2 border-t border-gray-200 mt-2">
                  <p className="text-xs text-gray-500 mb-2">
                    Filtros Avançados (Mais lento)
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={config.exclude12Hits}
                      onChange={() => toggle("exclude12Hits")}
                      className="w-5 h-5 text-gray-400 rounded focus:ring-gray-500"
                    />
                    <span className="text-gray-600 text-sm">
                      4º Prêmio ({lottery.drawSize - 3} acertos)
                    </span>
                  </label>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-2 rounded">
              <AlertTriangle className="w-4 h-4" />
              Carregue o histórico primeiro.
            </div>
          )}
        </div>

        {/* Pattern Filters */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Padrões Básicos
          </h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.excludeSequences}
              onChange={() => toggle("excludeSequences")}
              className="w-5 h-5 rounded"
              style={{ color: lottery.color }}
            />
            <span className="text-gray-700">Bloquear Sequência Total</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.excludeAllEven}
              onChange={() => toggle("excludeAllEven")}
              className="w-5 h-5 rounded"
              style={{ color: lottery.color }}
            />
            <span className="text-gray-700">Bloquear Todos Pares</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.excludeAllOdd}
              onChange={() => toggle("excludeAllOdd")}
              className="w-5 h-5 rounded"
              style={{ color: lottery.color }}
            />
            <span className="text-gray-700">Bloquear Todos Ímpares</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.excludeAllPrimes}
              onChange={() => toggle("excludeAllPrimes")}
              className="w-5 h-5 rounded"
              style={{ color: lottery.color }}
            />
            <span className="text-gray-700">Bloquear Todos Primos</span>
          </label>
        </div>

        {/* Geometric Filters */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Geometria (Volante)
          </h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.excludeFullLines}
              onChange={() => toggle("excludeFullLines")}
              className="w-5 h-5 rounded"
              style={{ color: lottery.color }}
            />
            <span className="text-gray-700">Bloquear Linha Cheia</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.excludeFullColumns}
              onChange={() => toggle("excludeFullColumns")}
              className="w-5 h-5 rounded"
              style={{ color: lottery.color }}
            />
            <span className="text-gray-700">Bloquear Coluna Cheia</span>
          </label>

          {isLotofacil && (
            <>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.excludeAlternatingLines}
                  onChange={() => toggle("excludeAlternatingLines")}
                  className="w-5 h-5 rounded"
                  style={{ color: lottery.color }}
                />
                <span className="text-gray-700">
                  Bloquear Linhas Alternadas
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.excludeAlternatingColumns}
                  onChange={() => toggle("excludeAlternatingColumns")}
                  className="w-5 h-5 rounded"
                  style={{ color: lottery.color }}
                />
                <span className="text-gray-700">
                  Bloquear Colunas Alternadas
                </span>
              </label>
            </>
          )}
        </div>

        {/* Hot Numbers Strategy */}
        <div
          className="space-y-3 p-4 rounded-lg md:col-span-2 lg:col-span-3 border"
          style={{
            backgroundColor: `${lottery.color}0D`,
            borderColor: `${lottery.color}33`,
          }} // 0D = 5% opacity, 33 = 20%
        >
          <div className="flex items-center justify-between">
            <h3
              className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"
              style={{ color: lottery.color }}
            >
              <Flame className="w-4 h-4" />
              Estratégia de Quentes x Frias
            </h3>
            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
              <input
                type="checkbox"
                checked={config.useHotColdFilter}
                onChange={() => toggle("useHotColdFilter")}
                className="w-4 h-4 rounded"
                style={{ color: lottery.color }}
              />
              <span className="text-sm font-medium text-gray-700">
                Ativar Filtro
              </span>
            </label>
          </div>

          <div
            className={clsx(
              "grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 transition-opacity",
              !config.useHotColdFilter && "opacity-50 pointer-events-none"
            )}
          >
            {config.useHotColdFilter ? (
              <p className="text-sm text-gray-600 sm:col-span-2">
                ✅ <strong>Filtro ativo:</strong> Define quantos números do grupo dos "Top 40% mais sorteados" devem
                aparecer em cada jogo gerado.
                <br />
                <span className="text-xs text-gray-500">
                  Recomendado para {lottery.name}: entre{" "}
                  {Math.max(0, Math.floor(lottery.gameSize * 0.4))} e{" "}
                  {Math.floor(lottery.gameSize * 0.7)}.
                </span>
              </p>
            ) : (
              <p className="text-sm text-gray-500 sm:col-span-2">
                ⚪ <strong>Filtro desativado:</strong> Números são gerados de forma aleatória, sem considerar estatísticas de frequência.
                <br />
                <span className="text-xs text-gray-400">
                  Ative para forçar um equilíbrio entre números "quentes" e "frios".
                </span>
              </p>
            )}

            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Mínimo de Quentes:
              </span>
              <input
                type="number"
                min="0"
                max={lottery.gameSize}
                value={config.minHotNumbers}
                onChange={(e) =>
                  setNumber("minHotNumbers", parseInt(e.target.value))
                }
                className="w-full bg-white text-gray-900 border border-gray-300 rounded px-2 py-1 font-bold focus:ring-2 outline-none"
                style={{ caretColor: lottery.color }}
              />
            </div>

            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Máximo de Quentes:
              </span>
              <input
                type="number"
                min="0"
                max={lottery.gameSize}
                value={config.maxHotNumbers}
                onChange={(e) =>
                  setNumber("maxHotNumbers", parseInt(e.target.value))
                }
                className="w-full bg-white text-gray-900 border border-gray-300 rounded px-2 py-1 font-bold focus:ring-2 outline-none"
                style={{ caretColor: lottery.color }}
              />
            </div>
          </div>
        </div>

        {/* Advanced Statistical Filters */}
        <div
            className="space-y-4 p-4 rounded-lg md:col-span-2 lg:col-span-3 border bg-gradient-to-br from-blue-50 to-indigo-50"
            style={{ borderColor: `${lottery.color}33` }}
          >
            <div className="flex items-center justify-between">
              <h3
                className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"
                style={{ color: lottery.color }}
              >
                <TrendingUp className="w-4 h-4" />
                Filtros Estatísticos Avançados (Auto)
              </h3>
              
              <button
                onClick={() => {
                  const idealHotMin = Math.max(0, Math.floor(lottery.gameSize * 0.4));
                  const idealHotMax = Math.ceil(lottery.gameSize * 0.7);
                  
                  // Setup auto-adjust values
                  const newSettings: Partial<ExtendedFilterConfig> = {
                    // Hot/Cold
                    minHotNumbers: idealHotMin,
                    maxHotNumbers: idealHotMax,
                    // Sum range
                    useSumFilter: true,
                    minSum: statDefaults.sum[0] || config.minSum,
                    maxSum: statDefaults.sum[1] || config.maxSum,
                    // Consecutive
                    useConsecutiveFilter: true,
                    maxConsecutivePairs: statDefaults.consecutive,
                    // Delay
                    useDelayFilter: true,
                    minDelayedNumbers: 2,
                    delayThreshold: statDefaults.delay,
                    // Repeat
                    useRepeatFilter: true,
                    minRepeatsFromLast: statDefaults.repeat[0],
                    maxRepeatsFromLast: statDefaults.repeat[1],
                    // Interleaving & Trend
                    useInterleavingFilter: true,
                    useTrendFilter: true,
                    minTrendingHot: 3,
                    
                    // Mandel - Apply calculated defaults
                    usePrimeCountFilter: true,
                    minPrimes: statDefaults.primes.min,
                    maxPrimes: statDefaults.primes.max,
                    
                    useDecadeBalanceFilter: true,
                    minDecadesRepresented: statDefaults.decades.min,
                    
                    useEdgeFilter: true,
                    minEdgeNumbers: statDefaults.edges.min,
                    maxEdgeNumbers: statDefaults.edges.max,
                    
                    useSpreadFilter: true,
                    minAverageSpread: statDefaults.spread.min,
                    
                    useFibonacciFilter: true,
                    minFibonacciNumbers: statDefaults.fibonacci.min,
                  };

                  // Extras / Trevos (+Milionária) Logic
                  if (lottery.hasExtras && lottery.extrasTotalNumbers) {
                     // Check if specific recommendations exist in staticRec
                     const extrasRec = (staticRec as any).extras;
                     if (extrasRec) {
                        newSettings.useExtrasHotColdFilter = true;
                        newSettings.minHotExtras = extrasRec.hotCold.minHot;
                        newSettings.maxHotExtras = extrasRec.hotCold.maxHot;
                        
                        newSettings.useExtrasDelayFilter = true;
                        newSettings.extrasDelayThreshold = extrasRec.delay.threshold;
                        newSettings.minDelayedExtras = extrasRec.delay.minDelayed;
                        
                        newSettings.useExtrasRepeatFilter = true;
                        newSettings.minExtrasRepeats = extrasRec.repeat.min;
                        newSettings.maxExtrasRepeats = extrasRec.repeat.max;
                        
                        newSettings.excludeHotExtrasPair = extrasRec.avoidHotPairs;
                        newSettings.forceBalancedExtras = extrasRec.balance;
                     }
                  }

                  setConfig(prev => ({
                    ...prev,
                    ...newSettings
                  }));
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-blue-500 hover:bg-blue-600 text-white shadow-sm flex items-center gap-1"
              >
                ⚡ Aplicar Recomendados
                {!statDefaults.hasAnalysis && <span className="opacity-70 text-[10px]">(Padrão)</span>}
              </button>
            </div>
            <p className="text-xs text-gray-600 -mt-2">
              {statDefaults.hasAnalysis
                ? `📊 Valores calculados de ${extendedAnalysis?.totalGames} concursos carregados.`
                : `Valores otimizados para ${lottery.name} (Análise pendente).`}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Sum Filter */}
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={config.useSumFilter || false}
                    onChange={() => toggle("useSumFilter")}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: lottery.color }}
                  />
                  <Hash className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Faixa de Soma</span>
                </label>
                <div className={clsx("flex gap-2", !config.useSumFilter && "opacity-50 pointer-events-none")}>
                  <input
                    type="number"
                    placeholder="Min"
                    value={config.minSum || 0}
                    onChange={(e) => setNumber("minSum", parseInt(e.target.value) || 0)}
                    className="w-full text-sm border rounded px-2 py-1"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={config.maxSum || 999}
                    onChange={(e) => setNumber("maxSum", parseInt(e.target.value) || 999)}
                    className="w-full text-sm border rounded px-2 py-1"
                  />
                </div>
                <div className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {statDefaults.hints.sum}
                </div>
              </div>

              {/* Consecutive Filter */}
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={config.useConsecutiveFilter || false}
                    onChange={() => toggle("useConsecutiveFilter")}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: lottery.color }}
                  />
                  <span className="text-sm font-medium text-gray-700">Máx. Consecutivos</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={config.maxConsecutivePairs || 3}
                  onChange={(e) => setNumber("maxConsecutivePairs", parseInt(e.target.value) || 3)}
                  className={clsx("w-full text-sm border rounded px-2 py-1", !config.useConsecutiveFilter && "opacity-50")}
                  disabled={!config.useConsecutiveFilter}
                />
                <div className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                   <TrendingUp className="w-3 h-3" />
                   {statDefaults.hints.consecutive}
                </div>
              </div>

              {/* Delay Filter */}
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={config.useDelayFilter || false}
                    onChange={() => toggle("useDelayFilter")}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: lottery.color }}
                  />
                  <Timer className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">Números Atrasados</span>
                </label>
                <div className={clsx("text-xs text-gray-500", !config.useDelayFilter && "opacity-50")}>
                  Mín. {config.minDelayedNumbers || 2} números c/ {config.delayThreshold || 10}+ sorteios
                </div>
                <div className="text-[10px] text-orange-600 mt-1">
                  {statDefaults.hints.delay}
                </div>
              </div>

              {/* Repeat Filter */}
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={config.useRepeatFilter || false}
                    onChange={() => toggle("useRepeatFilter")}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: lottery.color }}
                  />
                  <Repeat className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700">Repetições</span>
                </label>
                <div className={clsx("flex gap-2", !config.useRepeatFilter && "opacity-50 pointer-events-none")}>
                  <input
                    type="number"
                    placeholder="Min"
                    min="0"
                    value={config.minRepeatsFromLast || 1}
                    onChange={(e) => setNumber("minRepeatsFromLast", parseInt(e.target.value) || 0)}
                    className="w-full text-sm border rounded px-2 py-1"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    min="0"
                    value={config.maxRepeatsFromLast || 5}
                    onChange={(e) => setNumber("maxRepeatsFromLast", parseInt(e.target.value) || 10)}
                    className="w-full text-sm border rounded px-2 py-1"
                  />
                </div>
                <div className="text-[10px] text-purple-600 mt-1">
                   {statDefaults.hints.repeat}
                </div>
              </div>

              {/* Interleaving Filter */}
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.useInterleavingFilter || false}
                    onChange={() => toggle("useInterleavingFilter")}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: lottery.color }}
                  />
                  <Scale className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700">Equilíbrio Baixas/Altas</span>
                </label>
              </div>

              {/* Trend Filter */}
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={config.useTrendFilter || false}
                    onChange={() => toggle("useTrendFilter")}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: lottery.color }}
                  />
                  <TrendingUp className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-medium text-gray-700">Tendência Alta</span>
                </label>
                <div className={clsx("text-xs text-gray-500", !config.useTrendFilter && "opacity-50")}>
                  Mín. {config.minTrendingHot || 3} números emergentes
                </div>
              </div>
            </div>
          </div>

        {/* Mandel Strategy Filters */}
          <div
            className="space-y-4 p-4 rounded-lg md:col-span-2 lg:col-span-3 border bg-gradient-to-br from-amber-50 to-orange-50"
            style={{ borderColor: `${lottery.color}33` }}
          >
            <div className="flex items-center justify-between">
              <h3
                className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"
                style={{ color: lottery.color }}
              >
                🎯 Estratégia Mandel (Avançado)
              </h3>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                {extendedAnalysis ? '📊 Baseado no Histórico' : 'Otimizado para ' + lottery.name}
              </span>
            </div>
            <p className="text-xs text-gray-600 -mt-2">
              Filtros baseados nas estratégias de Stefan Mandel, vencedor 14x em loterias mundiais. 
              <strong className="text-amber-700">
                {extendedAnalysis 
                  ? ` Valores calculados dos ${historyCount} concursos carregados.`
                  : ` Valores recomendados para ${lottery.name}.`}
              </strong>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Prime Count Filter */}
              <div className={clsx(
                "bg-white p-3 rounded-lg border shadow-sm transition-all",
                config.usePrimeCountFilter ? "border-amber-400 ring-1 ring-amber-200" : "border-gray-200"
              )}>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={config.usePrimeCountFilter || false}
                    onChange={() => toggle("usePrimeCountFilter")}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: lottery.color }}
                  />
                  <span className="text-sm font-medium text-gray-700">🔢 Primos Balanceados</span>
                  {config.usePrimeCountFilter && <span className="text-xs text-green-600">✓ Ativo</span>}
                </label>
                <div className={clsx("flex gap-2", !config.usePrimeCountFilter && "opacity-50 pointer-events-none")}>
                  <input
                    type="number"
                    placeholder="Min"
                    min="0"
                    value={config.minPrimes ?? statDefaults.primes.min}
                    onChange={(e) => setNumber("minPrimes", parseInt(e.target.value) || 0)}
                    className="w-full text-sm border rounded px-2 py-1"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    min="0"
                    value={config.maxPrimes ?? statDefaults.primes.max}
                    onChange={(e) => setNumber("maxPrimes", parseInt(e.target.value) || 10)}
                    className="w-full text-sm border rounded px-2 py-1"
                  />
                </div>
                <div className="text-xs text-amber-600 mt-2 bg-amber-50 p-1.5 rounded">
                  💡 {getHint('primes')}
                </div>
              </div>

              {/* Decade Balance Filter */}
              <div className={clsx(
                "bg-white p-3 rounded-lg border shadow-sm transition-all",
                config.useDecadeBalanceFilter ? "border-amber-400 ring-1 ring-amber-200" : "border-gray-200"
              )}>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={config.useDecadeBalanceFilter || false}
                    onChange={() => toggle("useDecadeBalanceFilter")}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: lottery.color }}
                  />
                  <span className="text-sm font-medium text-gray-700">📊 Cobertura de Dezenas</span>
                  {config.useDecadeBalanceFilter && <span className="text-xs text-green-600">✓ Ativo</span>}
                </label>
                <input
                  type="number"
                  min="1"
                  max={staticRec.decades.total}
                  value={config.minDecadesRepresented ?? statDefaults.decades.min}
                  onChange={(e) => setNumber("minDecadesRepresented", parseInt(e.target.value) || 3)}
                  className={clsx("w-full text-sm border rounded px-2 py-1", !config.useDecadeBalanceFilter && "opacity-50")}
                  disabled={!config.useDecadeBalanceFilter}
                />
                <div className="text-xs text-amber-600 mt-2 bg-amber-50 p-1.5 rounded">
                  💡 {getHint('decades')}
                </div>
              </div>

              {/* Edge Numbers Filter */}
              <div className={clsx(
                "bg-white p-3 rounded-lg border shadow-sm transition-all",
                config.useEdgeFilter ? "border-amber-400 ring-1 ring-amber-200" : "border-gray-200"
              )}>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={config.useEdgeFilter || false}
                    onChange={() => toggle("useEdgeFilter")}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: lottery.color }}
                  />
                  <span className="text-sm font-medium text-gray-700">↔️ Números de Borda</span>
                  {config.useEdgeFilter && <span className="text-xs text-green-600">✓ Ativo</span>}
                </label>
                <div className={clsx("flex gap-2", !config.useEdgeFilter && "opacity-50 pointer-events-none")}>
                  <input
                    type="number"
                    placeholder="Min"
                    min="0"
                    value={config.minEdgeNumbers ?? statDefaults.edges.min}
                    onChange={(e) => setNumber("minEdgeNumbers", parseInt(e.target.value) || 0)}
                    className="w-full text-sm border rounded px-2 py-1"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    min="0"
                    value={config.maxEdgeNumbers ?? statDefaults.edges.max}
                    onChange={(e) => setNumber("maxEdgeNumbers", parseInt(e.target.value) || 10)}
                    className="w-full text-sm border rounded px-2 py-1"
                  />
                </div>
                <div className="text-xs text-amber-600 mt-2 bg-amber-50 p-1.5 rounded">
                  💡 {getHint('edges')}
                </div>
              </div>

              {/* Number Spread Filter */}
              <div className={clsx(
                "bg-white p-3 rounded-lg border shadow-sm transition-all",
                config.useSpreadFilter ? "border-amber-400 ring-1 ring-amber-200" : "border-gray-200"
              )}>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={config.useSpreadFilter || false}
                    onChange={() => toggle("useSpreadFilter")}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: lottery.color }}
                  />
                  <span className="text-sm font-medium text-gray-700">📏 Dispersão Mínima</span>
                  {config.useSpreadFilter && <span className="text-xs text-green-600">✓ Ativo</span>}
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={config.minAverageSpread ?? statDefaults.spread.min}
                  onChange={(e) => setNumber("minAverageSpread", parseFloat(e.target.value) || 2)}
                  className={clsx("w-full text-sm border rounded px-2 py-1", !config.useSpreadFilter && "opacity-50")}
                  disabled={!config.useSpreadFilter}
                />
                <div className="text-xs text-amber-600 mt-2 bg-amber-50 p-1.5 rounded">
                  💡 {getHint('spread')}
                </div>
              </div>

              {/* Fibonacci Filter */}
              <div className={clsx(
                "bg-white p-3 rounded-lg border shadow-sm transition-all",
                config.useFibonacciFilter ? "border-amber-400 ring-1 ring-amber-200" : "border-gray-200"
              )}>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={config.useFibonacciFilter || false}
                    onChange={() => toggle("useFibonacciFilter")}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: lottery.color }}
                  />
                  <span className="text-sm font-medium text-gray-700">🌀 Fibonacci</span>
                  {config.useFibonacciFilter && <span className="text-xs text-green-600">✓ Ativo</span>}
                </label>
                <input
                  type="number"
                  min="0"
                  max={staticRec.fibonacci.available}
                  value={config.minFibonacciNumbers ?? statDefaults.fibonacci.min}
                  onChange={(e) => setNumber("minFibonacciNumbers", parseInt(e.target.value) || 1)}
                  className={clsx("w-full text-sm border rounded px-2 py-1", !config.useFibonacciFilter && "opacity-50")}
                  disabled={!config.useFibonacciFilter}
                />
                <div className="text-xs text-amber-600 mt-2 bg-amber-50 p-1.5 rounded">
                  💡 {getHint('fibonacci')}
                </div>
              </div>
            </div>

            {/* Quick action: Apply all recommended */}
            <div className="flex justify-end pt-2 border-t border-amber-200">
              <button
                onClick={() => {
                  setConfig(prev => ({
                    ...prev,
                    usePrimeCountFilter: true,
                    minPrimes: statDefaults.primes.min,
                    maxPrimes: statDefaults.primes.max,
                    useDecadeBalanceFilter: true,
                    minDecadesRepresented: statDefaults.decades.min,
                    useEdgeFilter: true,
                    minEdgeNumbers: statDefaults.edges.min,
                    maxEdgeNumbers: statDefaults.edges.max,
                    useSpreadFilter: true,
                    minAverageSpread: statDefaults.spread.min,
                    useFibonacciFilter: true,
                    minFibonacciNumbers: statDefaults.fibonacci.min,
                  }));
                }}
                className="text-sm font-medium px-4 py-2 rounded-lg transition-colors bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
              >
                ⚡ Aplicar Todos os Filtros Mandel Recomendados
              </button>
            </div>
          </div>

          {/* New Cycle Filter Section */}
          <div className="space-y-4 p-4 rounded-lg md:col-span-2 lg:col-span-3 border bg-pink-50 border-pink-100">
             <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-pink-700">
                   <RotateCcw className="w-4 h-4" />
                   Ciclo das Dezenas
                </h3>
             </div>
             
             <div className="bg-white p-3 rounded-lg border border-pink-200 shadow-sm flex items-center justify-between">
                <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.useCycleFilter || false}
                        onChange={() => toggle("useCycleFilter")}
                        disabled={!extendedAnalysis?.cycleStats || extendedAnalysis.cycleStats.missingNumbers.length === 0}
                        className="w-4 h-4 rounded text-pink-500 focus:ring-pink-500 disabled:opacity-50"
                        style={{ accentColor: lottery.color }}
                      />
                      <span className={clsx("text-sm font-medium", (!extendedAnalysis?.cycleStats || extendedAnalysis.cycleStats.missingNumbers.length === 0) ? "text-gray-400" : "text-gray-700")}>
                          Forçar Fechamento de Ciclo
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6 mt-1">
                      O gerador tentará incluir os números que faltam para fechar o ciclo atual.
                    </p>
                </div>
                {extendedAnalysis?.cycleStats && (
                  <div className="text-right">
                     {extendedAnalysis.cycleStats.missingNumbers.length > 0 ? (
                        <>
                            <div className="text-xs font-bold text-pink-700">
                                {extendedAnalysis.cycleStats.missingNumbers.length} números faltantes
                            </div>
                            <div className="text-[10px] text-pink-500">
                                {extendedAnalysis.cycleStats.missingNumbers.join(', ')}
                            </div>
                        </>
                     ) : (
                        <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                           ✓ Ciclo Fechado!
                           <span className="block font-normal text-[10px] text-green-500">Todos os números já saíram neste ciclo.</span>
                        </div>
                     )}
                  </div>
                )}
             </div>
          </div>

          {/* Filtros de Trevos (+Milionária) */}
          {lottery.hasExtras && (
            <div className="space-y-4 p-4 rounded-lg md:col-span-2 lg:col-span-3 border bg-emerald-50 border-emerald-200">
               <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-emerald-700">
                     <span className="text-lg">🍀</span>
                     Filtros de {lottery.extrasName || 'Trevos'} (Sorteio Separado)
                  </h3>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                    +Milionária
                  </span>
               </div>
               
               <p className="text-xs text-emerald-600 mb-3">
                 A +Milionária tem dois sorteios independentes: números principais (50) e trevos (6).
                 Configure filtros específicos para otimizar a seleção dos trevos.
               </p>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Hot/Cold Trevos */}
                  <div className={clsx(
                    "bg-white p-3 rounded-lg border shadow-sm transition-all",
                    config.useExtrasHotColdFilter ? "border-emerald-400 ring-1 ring-emerald-200" : "border-gray-200"
                  )}>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={config.useExtrasHotColdFilter || false}
                        onChange={() => toggle("useExtrasHotColdFilter")}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: '#10b981' }}
                      />
                      <span className="text-sm font-medium text-gray-700">🔥 Trevos Quentes/Frios</span>
                    </label>
                    <div className="flex gap-2">
                       <div className="flex-1">
                          <label className="text-xs text-gray-500">Mín Quentes</label>
                          <input
                            type="number"
                            min="0"
                            max={lottery.extrasGameSize || 2}
                            value={config.minHotExtras ?? 0}
                            onChange={(e) => setNumber("minHotExtras", parseInt(e.target.value) || 0)}
                            className={clsx("w-full text-sm border rounded px-2 py-1", !config.useExtrasHotColdFilter && "opacity-50")}
                            disabled={!config.useExtrasHotColdFilter}
                          />
                       </div>
                       <div className="flex-1">
                          <label className="text-xs text-gray-500">Máx Quentes</label>
                          <input
                            type="number"
                            min="0"
                            max={lottery.extrasGameSize || 2}
                            value={config.maxHotExtras ?? 2}
                            onChange={(e) => setNumber("maxHotExtras", parseInt(e.target.value) || 2)}
                            className={clsx("w-full text-sm border rounded px-2 py-1", !config.useExtrasHotColdFilter && "opacity-50")}
                            disabled={!config.useExtrasHotColdFilter}
                          />
                       </div>
                    </div>
                    {extendedAnalysis?.extrasStats?.hotExtras && (
                      <div className="text-[10px] text-emerald-600 mt-2 bg-emerald-50 p-1.5 rounded">
                        🔥 Quentes: {extendedAnalysis.extrasStats.hotExtras.join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Delay Trevos */}
                  <div className={clsx(
                    "bg-white p-3 rounded-lg border shadow-sm transition-all",
                    config.useExtrasDelayFilter ? "border-emerald-400 ring-1 ring-emerald-200" : "border-gray-200"
                  )}>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={config.useExtrasDelayFilter || false}
                        onChange={() => toggle("useExtrasDelayFilter")}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: '#10b981' }}
                      />
                      <span className="text-sm font-medium text-gray-700">⏰ Trevos Atrasados</span>
                    </label>
                    <div className="flex gap-2">
                       <div className="flex-1">
                          <label className="text-xs text-gray-500">Atraso &gt;</label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={config.extrasDelayThreshold ?? 5}
                            onChange={(e) => setNumber("extrasDelayThreshold", parseInt(e.target.value) || 5)}
                            className={clsx("w-full text-sm border rounded px-2 py-1", !config.useExtrasDelayFilter && "opacity-50")}
                            disabled={!config.useExtrasDelayFilter}
                          />
                       </div>
                       <div className="flex-1">
                          <label className="text-xs text-gray-500">Mín Atrasados</label>
                          <input
                            type="number"
                            min="0"
                            max={lottery.extrasGameSize || 2}
                            value={config.minDelayedExtras ?? 0}
                            onChange={(e) => setNumber("minDelayedExtras", parseInt(e.target.value) || 0)}
                            className={clsx("w-full text-sm border rounded px-2 py-1", !config.useExtrasDelayFilter && "opacity-50")}
                            disabled={!config.useExtrasDelayFilter}
                          />
                       </div>
                    </div>
                    {extendedAnalysis?.extrasStats?.delayStats && (
                      <div className="text-[10px] text-amber-600 mt-2 bg-amber-50 p-1.5 rounded">
                        ⏰ Mais atrasado: Trevo {extendedAnalysis.extrasStats.delayStats[0]?.number} ({extendedAnalysis.extrasStats.delayStats[0]?.delay} sorteios)
                      </div>
                    )}
                  </div>

                  {/* Repeat Trevos */}
                  <div className={clsx(
                    "bg-white p-3 rounded-lg border shadow-sm transition-all",
                    config.useExtrasRepeatFilter ? "border-emerald-400 ring-1 ring-emerald-200" : "border-gray-200"
                  )}>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={config.useExtrasRepeatFilter || false}
                        onChange={() => toggle("useExtrasRepeatFilter")}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: '#10b981' }}
                      />
                      <span className="text-sm font-medium text-gray-700">🔄 Repetir do Último</span>
                    </label>
                    <div className="flex gap-2">
                       <div className="flex-1">
                          <label className="text-xs text-gray-500">Mín</label>
                          <input
                            type="number"
                            min="0"
                            max={lottery.extrasGameSize || 2}
                            value={config.minExtrasRepeats ?? 0}
                            onChange={(e) => setNumber("minExtrasRepeats", parseInt(e.target.value) || 0)}
                            className={clsx("w-full text-sm border rounded px-2 py-1", !config.useExtrasRepeatFilter && "opacity-50")}
                            disabled={!config.useExtrasRepeatFilter}
                          />
                       </div>
                       <div className="flex-1">
                          <label className="text-xs text-gray-500">Máx</label>
                          <input
                            type="number"
                            min="0"
                            max={lottery.extrasGameSize || 2}
                            value={config.maxExtrasRepeats ?? 2}
                            onChange={(e) => setNumber("maxExtrasRepeats", parseInt(e.target.value) || 2)}
                            className={clsx("w-full text-sm border rounded px-2 py-1", !config.useExtrasRepeatFilter && "opacity-50")}
                            disabled={!config.useExtrasRepeatFilter}
                          />
                       </div>
                    </div>
                    {extendedAnalysis?.extrasStats?.repeatBetweenDraws && (
                      <div className="text-[10px] text-blue-600 mt-2 bg-blue-50 p-1.5 rounded">
                        📊 Média: {extendedAnalysis.extrasStats.repeatBetweenDraws.avgRepeats} trevos repetidos
                      </div>
                    )}
                  </div>

                  {/* Evitar Pares Frequentes */}
                  <div className={clsx(
                    "bg-white p-3 rounded-lg border shadow-sm transition-all",
                    config.excludeHotExtrasPair ? "border-emerald-400 ring-1 ring-emerald-200" : "border-gray-200"
                  )}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.excludeHotExtrasPair || false}
                        onChange={() => toggle("excludeHotExtrasPair")}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: '#10b981' }}
                      />
                      <span className="text-sm font-medium text-gray-700">🚫 Evitar Pares Frequentes</span>
                    </label>
                    <p className="text-[10px] text-gray-500 ml-6 mt-1">
                      Evita as 3 combinações de trevos mais comuns no histórico.
                    </p>
                    {extendedAnalysis?.extrasStats?.pairFrequency && (
                      <div className="text-[10px] text-red-600 mt-2 bg-red-50 p-1.5 rounded">
                        🚫 Top par: [{extendedAnalysis.extrasStats.pairFrequency[0]?.pair.join(', ')}] ({extendedAnalysis.extrasStats.pairFrequency[0]?.percentage}%)
                      </div>
                    )}
                  </div>

                  {/* Equilíbrio Trevos */}
                  <div className={clsx(
                    "bg-white p-3 rounded-lg border shadow-sm transition-all",
                    config.forceBalancedExtras ? "border-emerald-400 ring-1 ring-emerald-200" : "border-gray-200"
                  )}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.forceBalancedExtras || false}
                        onChange={() => toggle("forceBalancedExtras")}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: '#10b981' }}
                      />
                      <span className="text-sm font-medium text-gray-700">⚖️ Equilibrar Trevos</span>
                    </label>
                    <p className="text-[10px] text-gray-500 ml-6 mt-1">
                      Força pelo menos 1 trevo de cada metade (1-3 e 4-6).
                    </p>
                  </div>
               </div>

               {/* Ação rápida para trevos */}
               <div className="flex justify-end pt-2 border-t border-emerald-200">
                  <button
                    onClick={() => {
                      setConfig(prev => ({
                        ...prev,
                        useExtrasHotColdFilter: true,
                        minHotExtras: 0,
                        maxHotExtras: 2,
                        useExtrasDelayFilter: true,
                        extrasDelayThreshold: 5,
                        minDelayedExtras: 1,
                        useExtrasRepeatFilter: false,
                        excludeHotExtrasPair: true,
                        forceBalancedExtras: true,
                      }));
                    }}
                    className="text-sm font-medium px-4 py-2 rounded-lg transition-colors bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                  >
                    🍀 Aplicar Filtros Recomendados para Trevos
                  </button>
               </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default SettingsPanel;
