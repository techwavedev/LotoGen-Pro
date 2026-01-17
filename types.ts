export type LotteryNumber = number;

export type Game = LotteryNumber[];

export type LotteryId = 'lotofacil' | 'megasena' | 'quina' | 'lotomania' | 'duplasena' | 'timemania' | 'diadesorte' | 'maismilionaria';

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
  // Initial support for "Extras" (Trevos)
  hasExtras?: boolean;
  extrasTotalNumbers?: number; // Ex: 6 for Trevos
  extrasGameSize?: number; // Ex: 2 for Trevos
  extrasDrawSize?: number; // Ex: 2 for Trevos
  extrasOffset?: number; // Ex: 100 (to store in same array)
  extrasName?: string; // Ex: "Trevos"
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
  },
  duplasena: {
    id: 'duplasena',
    name: 'Dupla Sena',
    totalNumbers: 50,
    gameSize: 6,
    maxGameSize: 15,
    drawSize: 6,
    cols: 10,
    visualCols: 5,
    color: '#A61324',
    colorName: 'red',
    downloadParam: 'ds',
    basePrice: 3.00
  },
  timemania: {
    id: 'timemania',
    name: 'Timemania',
    totalNumbers: 80,
    gameSize: 7,
    maxGameSize: 10,
    drawSize: 7,
    cols: 10,
    visualCols: 5,
    color: '#3EA86D',
    colorName: 'green',
    downloadParam: 'tm',
    basePrice: 3.50
  },
  diadesorte: {
    id: 'diadesorte',
    name: 'Dia de Sorte',
    totalNumbers: 31,
    gameSize: 7,
    maxGameSize: 15,
    drawSize: 7,
    cols: 7,
    visualCols: 5,
    color: '#FFAB00',
    colorName: 'amber',
    downloadParam: 'dd',
    basePrice: 2.50
  },
  maismilionaria: {
    id: 'maismilionaria',
    name: '+Milionária',
    totalNumbers: 50,
    gameSize: 6,
    maxGameSize: 12, // Permite apostar até 12 números
    drawSize: 6,
    cols: 10,
    visualCols: 10,
    color: '#1e293b', // Slate 800 - Elegant Dark
    colorName: 'slate',
    downloadParam: 'mm', // Guessing 'mm'
    basePrice: 6.00,
    hasExtras: true,
    extrasTotalNumbers: 6,
    extrasGameSize: 2,
    extrasDrawSize: 2,
    extrasOffset: 100,
    extrasName: 'Trevos'
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
  exclude15Hits: false,
  exclude14Hits: false,
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
    primes: { min: 2, max: 10, hint: "Em média 5 ou 6 primos (2-10 aceitável)" },
    decades: { min: 2, total: 2, hint: "Cubra as 5 linhas" },
    edges: { min: 4, max: 15, hint: "8 a 11 comum (4-15 aceitável)" },
    spread: { min: 1, hint: "Evite aglomerados (min 1)" },
    fibonacci: { min: 0, available: 5, hint: "2 a 5 (0 min para flexibilidade)" }
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
  },
  duplasena: {
    primes: { min: 1, max: 3, hint: "1 a 3 primos (similar à Mega-Sena)" },
    decades: { min: 3, total: 5, hint: "Distribua em 3+ décadas" },
    edges: { min: 2, max: 4, hint: "Equilíbrio centro/borda" },
    spread: { min: 4, hint: "Espalhe bem os números" },
    fibonacci: { min: 0, available: 8, hint: "0 a 2" }
  },
  timemania: {
    primes: { min: 1, max: 4, hint: "1 a 4 primos (em 7 números)" },
    decades: { min: 3, total: 8, hint: "Distribua em 3+ décadas" },
    edges: { min: 2, max: 5, hint: "2 a 5 na borda" },
    spread: { min: 4, hint: "Espalhe bem os números" },
    fibonacci: { min: 0, available: 10, hint: "0 a 2" }
  },
  diadesorte: {
    primes: { min: 1, max: 4, hint: "1 a 4 primos (em 7 números)" },
    decades: { min: 2, total: 4, hint: "Distribua em 2+ décadas (1-10, 11-20, 21-30, 31)" },
    edges: { min: 2, max: 5, hint: "2 a 5 na borda" },
    spread: { min: 3, hint: "Espalhe bem os números" },
    fibonacci: { min: 0, available: 6, hint: "0 a 2 (1,2,3,5,8,13,21)" }
  },
  maismilionaria: {
    primes: { min: 1, max: 3, hint: "1 a 3 primos (em 6 números)" },
    decades: { min: 3, total: 5, hint: "Distribua em 3+ décadas" },
    edges: { min: 2, max: 4, hint: "Equilíbrio borda" },
    spread: { min: 4, hint: "Espalhe bem os números" },
    fibonacci: { min: 0, available: 7, hint: "0 a 2" }
  }
};

// ============ COVERING DESIGNS & ABBREVIATED WHEELS ============

// Tipo de Wheel/Fechamento
export type WheelType = 'full' | 'abbreviated' | 'balanced';

// Níveis de garantia para Abbreviated Wheels
export type GuaranteeLevel = 
  | '3-if-4'   // 3 acertos garantidos se 4 números sorteados estiverem no pool
  | '4-if-5'   // 4 acertos se 5 números sorteados  
  | '3-if-5'   // 3 acertos se 5 números sorteados
  | '5-if-6'   // 5 acertos se 6 números sorteados
  | '4-if-6'   // 4 acertos se 6 números sorteados
  | '3-if-6'   // 3 acertos se 6 números sorteados
  | 'custom';  // Personalizado

// Configuração do Covering Design
export interface CoveringDesignConfig {
  wheelType: WheelType;
  guaranteeLevel: GuaranteeLevel;
  // Para garantia customizada
  customGuarantee?: {
    mustMatch: number;    // Quantos números devem ser sorteados do pool
    guaranteed: number;   // Quantos acertos são garantidos
  };
}

// Resultado do gerador com estatísticas
export interface CoveringDesignResult {
  games: Game[];
  stats: {
    fullWheelCount: number;      // Quantos jogos teria no fechamento total
    abbreviatedCount: number;    // Quantos jogos foram gerados
    savingsPercent: number;      // % de economia
    guaranteeDescription: string; // Descrição legível da garantia
    coverageScore: number;       // 0-100 score de cobertura
  };
}

// Defaults para Covering Design
export const DEFAULT_COVERING_CONFIG: CoveringDesignConfig = {
  wheelType: 'full',
  guaranteeLevel: '4-if-5',
};

// Descrições das garantias para UI
export const GUARANTEE_DESCRIPTIONS: Record<GuaranteeLevel, string> = {
  '3-if-4': 'Garante 3 acertos se 4 números sorteados estiverem no seu grupo',
  '4-if-5': 'Garante 4 acertos se 5 números sorteados estiverem no seu grupo',
  '3-if-5': 'Garante 3 acertos se 5 números sorteados estiverem no seu grupo',
  '5-if-6': 'Garante 5 acertos se 6 números sorteados estiverem no seu grupo',
  '4-if-6': 'Garante 4 acertos se 6 números sorteados estiverem no seu grupo',
  '3-if-6': 'Garante 3 acertos se 6 números sorteados estiverem no seu grupo',
  'custom': 'Definir garantia personalizada',
};