export type LotteryNumber = number;

export type Game = LotteryNumber[];

export type LotteryId = 'lotofacil' | 'megasena' | 'quina' | 'lotomania';

export interface LotteryDefinition {
  id: LotteryId;
  name: string;
  totalNumbers: number; // Ex: 25, 60, 80, 100
  gameSize: number; // Tamanho da Aposta (Ex: 15, 6, 5, 50)
  maxGameSize: number; // Máximo permitido (Ex: 20 para Lotofacil)
  drawSize: number; // Tamanho do Sorteio Histórico (Ex: 15, 6, 5, 20)
  cols: number; // Colunas LÓGICAS (para filtros de Linha/Coluna baseados no volante de papel)
  visualCols?: number; // Colunas VISUAIS (para o layout do app, geralmente 5 em mobile)
  color: string; // Hex color for UI
  colorName: string; // Tailwind color name approx
  downloadParam: string; // Parameter for asloterias.com.br download (l=XX)
  basePrice: number; // Preço da aposta mínima (R$)
}

export const LOTTERIES: Record<LotteryId, LotteryDefinition> = {
  lotofacil: {
    id: 'lotofacil',
    name: 'Lotofácil',
    totalNumbers: 25,
    gameSize: 15,
    maxGameSize: 20,
    drawSize: 15,
    cols: 5,
    visualCols: 5,
    color: '#930089',
    colorName: 'purple',
    downloadParam: 'lf',
    basePrice: 3.50
  },
  megasena: {
    id: 'megasena',
    name: 'Mega-Sena',
    totalNumbers: 60,
    gameSize: 6,
    maxGameSize: 20,
    drawSize: 6,
    cols: 10, // Filtros consideram linhas de 01-10
    visualCols: 5, // App mostra linhas de 01-05 (conforme print)
    color: '#209869',
    colorName: 'green',
    downloadParam: 'ms',
    basePrice: 6.00
  },
  quina: {
    id: 'quina',
    name: 'Quina',
    totalNumbers: 80,
    gameSize: 5,
    maxGameSize: 15,
    drawSize: 5,
    cols: 10,
    visualCols: 5,
    color: '#264987',
    colorName: 'blue',
    downloadParam: 'qi',
    basePrice: 3.00
  },
  lotomania: {
    id: 'lotomania',
    name: 'Lotomania',
    totalNumbers: 100,
    gameSize: 50,
    maxGameSize: 50, // Review this if Lotomania allows more
    drawSize: 20, // CORREÇÃO: Sorteiam-se 20, joga-se 50
    cols: 10,
    visualCols: 5,
    color: '#F78100',
    colorName: 'orange',
    downloadParam: 'lm',
    basePrice: 3.00
  }
};


export interface GenerationStats {
  totalAttempts: number;
  gamesGenerated: number;
  timeTaken: number;
}

export interface FilterConfig {
  exclude15Hits: boolean; // "15 Hits" aqui significa "Acerto Total do Sorteio Anterior"
  exclude14Hits: boolean; // "Acerto Total - 1"
  exclude13Hits: boolean; 
  exclude12Hits: boolean; 
  exclude11Hits: boolean; 
  excludeSequences: boolean;
  excludeAllEven: boolean;
  excludeAllOdd: boolean;
  excludeAllPrimes: boolean;
  excludeFullLines: boolean; 
  excludeFullColumns: boolean; 
  excludeAlternatingLines: boolean; 
  excludeAlternatingColumns: boolean;
  // New Hot/Cold Filters
  useHotColdFilter: boolean;
  minHotNumbers: number;
  maxHotNumbers: number;
}

export const DEFAULT_CONFIG: FilterConfig = {
  exclude15Hits: true,
  exclude14Hits: true,
  exclude13Hits: false,
  exclude12Hits: false,
  exclude11Hits: false,
  excludeSequences: true,
  excludeAllEven: true,
  excludeAllOdd: true,
  excludeAllPrimes: true,
  excludeFullLines: true,
  excludeFullColumns: true,
  excludeAlternatingLines: true,
  excludeAlternatingColumns: true,
  useHotColdFilter: false,
  minHotNumbers: 0,
  maxHotNumbers: 0,
};

export interface NumberStat {
  number: number;
  count: number;
  percentage: string;
}

export interface BalanceStat {
  hotCount: number;
  coldCount: number;
  occurrences: number;
  percentage: string;
}

export interface RepetitionStats {
  duplicates: number; // Total match
  nearMiss1: number; // gameSize - 1 match
  nearMiss2: number; // gameSize - 2 match
}

export interface HistoryAnalysis {
  totalGames: number;
  mostFrequent: NumberStat[]; // Ordered Descending
  leastFrequent: NumberStat[]; // Ordered Ascending
  allStats: NumberStat[]; // Ordered 1-Total for Heatmap
  hotNumbers: number[]; // The top N numbers
  balanceStats: BalanceStat[]; // Distribution of Hot vs Cold in history
  repetitionStats: RepetitionStats; // New repetition stats
}

// ============ ADVANCED STATISTICAL ANALYSIS TYPES ============

// Análise de Atraso (Delay Analysis)
export interface DelayStats {
  number: number;
  lastSeen: number;      // Último concurso onde apareceu (1 = mais recente)
  delay: number;         // Quantos sorteios atrasado
  maxDelay: number;      // Maior atraso histórico
  avgDelay: number;      // Média de atraso
}

// Análise de Soma
export interface SumRangeStats {
  min: number;           // Soma mínima histórica
  max: number;           // Soma máxima histórica
  average: number;       // Soma média
  stdDev: number;        // Desvio padrão
  mostCommonRange: [number, number]; // Faixa mais comum (P25-P75)
}

// Análise de Consecutivos
export interface ConsecutiveStats {
  distribution: Record<number, number>; // {0: 150, 1: 200, 2: 50, 3: 5}
  avgPairs: number;
  mostCommon: number;
}

// Análise de Tendência
export interface TrendStats {
  recentHot: number[];   // Top 10 últimos N sorteios
  recentCold: number[];  // Bottom 10 últimos N sorteios
  emerging: number[];    // Subindo de frequência
  declining: number[];   // Caindo de frequência
}

// Análise de Ciclos
export interface CycleStats {
  missingNumbers: number[];
  currentCycleLength: number;
  lastCycleLength?: number;
}

// Análise de Repetição entre Sorteios
export interface RepeatBetweenDrawsStats {
  avgRepeats: number;    // Média de repetições do sorteio anterior
  distribution: Record<number, number>; // {0: 10, 1: 50, 2: 100, 3: 40}
}

// Estatísticas por Quadrante/Grupo
export interface QuadrantStats {
  groups: { range: string; expected: number; actual: number }[];
}

// Análise Estendida com todas as novas métricas
export interface ExtendedHistoryAnalysis extends HistoryAnalysis {
  delayStats: DelayStats[];
  sumRangeStats: SumRangeStats;
  consecutiveStats: ConsecutiveStats;
  trendStats: TrendStats;
  repeatBetweenDrawsStats: RepeatBetweenDrawsStats;
  quadrantStats: QuadrantStats;
  cycleStats?: CycleStats;
  
  // Mandel Stats (Opcionais pois dependem da implementação de análise)
  primeDistributionStats?: {
    avgPrimesPerGame: number;
    recommendedRange: [number, number];
  };
  decadeDistributionStats?: {
    avgDecadesCovered: number;
  };
  edgeNumberStats?: {
    avgEdgesPerGame: number;
    recommendedRange: [number, number];
  };
  spreadStats?: {
    avgSpread: number;
    recommendedMinSpread: number;
  };
  sumStats?: {
    averageSum: number;
  };
  fibonacciStats?: {
    avgFibonacciPerGame: number;
    recommendedRange: [number, number];
  };
}

// Configuração de Filtros Estendida
export interface ExtendedFilterConfig extends FilterConfig {
  // Delay Filter - Números Atrasados
  useDelayFilter: boolean;
  minDelayedNumbers: number;  // Mínimo de números "atrasados" no jogo
  delayThreshold: number;     // Considerar atrasado se > N sorteios
  
  // Sum Range Filter - Faixa de Soma
  useSumFilter: boolean;
  minSum: number;
  maxSum: number;
  
  // Consecutive Filter - Consecutivos
  useConsecutiveFilter: boolean;
  maxConsecutivePairs: number;
  
  // Trend Filter - Tendência
  useTrendFilter: boolean;
  minTrendingHot: number;     // Mínimo de números em tendência de alta
  
  // Repeat Filter - Repetição do Último Sorteio
  useRepeatFilter: boolean;
  minRepeatsFromLast: number;
  maxRepeatsFromLast: number;
  
  // Interleaving Filter - Intercalamento
  useInterleavingFilter: boolean;
  balanceGroups: boolean;     // Equilibrar dezenas baixas/altas

  // Mandel Strategy Filters
  usePrimeCountFilter: boolean;
  minPrimes: number;
  maxPrimes: number;
  
  useDecadeBalanceFilter: boolean;
  minDecadesRepresented: number;
  
  useEdgeFilter: boolean;
  minEdgeNumbers: number;
  maxEdgeNumbers: number;
  
  useSpreadFilter: boolean;
  minAverageSpread: number;

  useFibonacciFilter: boolean;
  minFibonacciNumbers: number;

  // Cycle Strategy
  useCycleFilter: boolean; // Force missing cycle numbers
}

// Default para novos filtros
export const DEFAULT_EXTENDED_CONFIG: ExtendedFilterConfig = {
  ...DEFAULT_CONFIG,
  useDelayFilter: false,
  minDelayedNumbers: 2,
  delayThreshold: 10,
  useSumFilter: false,
  minSum: 0,
  maxSum: 999,
  useConsecutiveFilter: false,
  maxConsecutivePairs: 3,
  useTrendFilter: false,
  minTrendingHot: 3,
  useRepeatFilter: false,
  minRepeatsFromLast: 1,
  maxRepeatsFromLast: 5,
  useInterleavingFilter: false,
  balanceGroups: true,
  
  // Mandel Defaults
  usePrimeCountFilter: true,
  minPrimes: 0,
  maxPrimes: 15,
  useDecadeBalanceFilter: true,
  minDecadesRepresented: 2,
  useEdgeFilter: true,
  minEdgeNumbers: 0,
  maxEdgeNumbers: 15,
  useSpreadFilter: true,
  minAverageSpread: 2,
  useFibonacciFilter: true,
  minFibonacciNumbers: 1,
  useCycleFilter: false,
};

export const LOTTERY_MANDEL_RECOMMENDATIONS: Record<LotteryId, any> = {
  lotofacil: {
    primes: { min: 2, max: 9, hint: "Em média 5 ou 6 primos (2-9 seguro)" },
    decades: { min: 2, total: 2, hint: "Cubra as 5 linhas" },
    edges: { min: 5, max: 14, hint: "8 a 11 comum (5-14 seguro)" },
    spread: { min: 1, hint: "Evite aglomerados (min 1)" },
    fibonacci: { min: 1, available: 5, hint: "3 a 5 (1 min)" }
  },
  megasena: {
    primes: { min: 1, max: 3, hint: "1 a 3 primos" },
    decades: { min: 4, total: 6, hint: "Distribua em 4+ décadas" },
    edges: { min: 2, max: 4, hint: "Equilíbrio centro/borda" },
    spread: { min: 5, hint: "Espalhe bem os números" },
    fibonacci: { min: 0, available: 7, hint: "0 a 2" }
  },
  quina: {
    primes: { min: 1, max: 3, hint: "1 a 3 primos" },
    decades: { min: 3, total: 8, hint: "Distribua em 3+ décadas" },
    edges: { min: 2, max: 4, hint: "Equilíbrio borda" },
    spread: { min: 4, hint: "Espalhe bem" },
    fibonacci: { min: 0, available: 10, hint: "0 a 2" }
  },
  lotomania: {
    primes: { min: 8, max: 18, hint: "Média 12-13 primos (em 50 números)" },
    decades: { min: 7, total: 10, hint: "Cubra a maioria das décadas" },
    edges: { min: 12, max: 24, hint: "12 a 24 na borda (Média 18)" },
    spread: { min: 0.5, hint: "Espalhe" },
    fibonacci: { min: 2, available: 16, hint: "3 a 8" }
  }
};