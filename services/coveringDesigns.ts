/**
 * Covering Designs & Abbreviated Wheels Service
 * 
 * Implementa algoritmos matemáticos estudados para geração otimizada de fechamentos:
 * - Greedy Covering: Seleciona jogos que maximizam cobertura de t-subconjuntos
 * - Abbreviated Wheels: Garante prêmio mínimo com menos jogos que fechamento total
 * 
 * Referências:
 * - La Jolla Covering Repository (dmgordon.org)
 * - Combinatorial Covering Design Theory
 */

import { 
  Game, 
  LotteryDefinition, 
  GuaranteeLevel, 
  CoveringDesignConfig, 
  CoveringDesignResult,
  WheelType
} from '../types';

// ============ UTILITY FUNCTIONS ============

/**
 * Gera todas as k-combinações de um array
 */
export function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  
  const [first, ...rest] = arr;
  
  const withFirst = getCombinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = getCombinations(rest, k);
  
  return [...withFirst, ...withoutFirst];
}

/**
 * Calcula C(n, k) - número de combinações
 */
function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  if (k > n - k) k = n - k;
  
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }
  return Math.round(result);
}

/**
 * Converte um subset em uma chave string para usar como key em Map/Set
 */
function subsetKey(subset: number[]): string {
  return subset.slice().sort((a, b) => a - b).join(',');
}

/**
 * Parse guarantee level para extrair t e m
 * Formato: "m-if-t" significa "garantir m acertos se t números do pool forem sorteados"
 */
function parseGuarantee(level: GuaranteeLevel): { mustMatch: number; guaranteed: number } {
  if (level === 'custom') {
    return { mustMatch: 5, guaranteed: 4 }; // Default for custom
  }
  
  const parts = level.split('-');
  // Format: "4-if-5" -> guaranteed=4, mustMatch=5
  return {
    guaranteed: parseInt(parts[0]),
    mustMatch: parseInt(parts[2])
  };
}

// ============ COVERAGE CALCULATION ============

/**
 * Calcula quais t-subconjuntos de um pool são cobertos por um conjunto de jogos.
 * 
 * Um t-subset é "coberto" por um jogo se o jogo contém pelo menos 'guaranteed' números do t-subset.
 * 
 * @param games Lista de jogos
 * @param pool Pool original de números selecionados
 * @param t Números do pool que precisam estar no sorteio (mustMatch)
 * @param guaranteed Mínimo de acertos garantidos
 */
export function calculateCoverage(
  games: Game[],
  pool: number[],
  t: number,
  guaranteed: number
): { covered: number; total: number; percent: number } {
  // Gera todos os t-subconjuntos do pool
  const tSubsets = getCombinations(pool, t);
  const total = tSubsets.length;
  
  // Para cada t-subset, verifica se existe um jogo que cobre ele
  const coveredSubsets = new Set<string>();
  
  for (const tSubset of tSubsets) {
    const tSet = new Set(tSubset);
    
    // Um jogo cobre este t-subset se contém pelo menos 'guaranteed' números dele
    for (const game of games) {
      let matchCount = 0;
      for (const num of game) {
        if (tSet.has(num)) matchCount++;
      }
      
      if (matchCount >= guaranteed) {
        coveredSubsets.add(subsetKey(tSubset));
        break; // Este t-subset está coberto, próximo
      }
    }
  }
  
  return {
    covered: coveredSubsets.size,
    total,
    percent: total > 0 ? Math.round((coveredSubsets.size / total) * 100) : 0
  };
}

// ============ GREEDY COVERING ALGORITHM ============

/**
 * Algoritmo Greedy para Covering Design.
 * 
 * Seleciona iterativamente o jogo que cobre o maior número de t-subsets ainda não cobertos.
 * Continua até que todos os t-subsets estejam cobertos ou não haja mais jogos para adicionar.
 * 
 * @param pool Números selecionados pelo usuário
 * @param gameSize Tamanho de cada jogo (lottery.gameSize)
 * @param t Números que devem estar no sorteio para garantia
 * @param guaranteed Mínimo de acertos garantidos
 * @param maxGames Limite máximo de jogos para evitar loops infinitos
 */
export function greedyCoveringGenerator(
  pool: number[],
  gameSize: number,
  t: number,
  guaranteed: number,
  maxGames: number = 5000
): Game[] {
  // Gerar todos os t-subsets que precisam ser cobertos
  const tSubsets = getCombinations(pool, t);
  const uncoveredSubsets = new Map<string, number[]>();
  
  for (const subset of tSubsets) {
    uncoveredSubsets.set(subsetKey(subset), subset);
  }
  
  // Gerar todos os possíveis jogos (k-subsets do pool)
  const allGames = getCombinations(pool, gameSize);
  
  // Limite de segurança
  if (allGames.length > 100000) {
    throw new Error(`Pool muito grande: ${allGames.length.toLocaleString()} combinações possíveis. Use um grupo menor ou escolha "Balanceado" que é mais eficiente.`);
  }
  
  const selectedGames: Game[] = [];
  const usedGameKeys = new Set<string>();
  
  // Loop greedy
  while (uncoveredSubsets.size > 0 && selectedGames.length < maxGames) {
    let bestGame: Game | null = null;
    let bestCoverCount = 0;
    let bestCoveredKeys: string[] = [];
    
    // Encontrar o jogo que cobre mais t-subsets não cobertos
    for (const game of allGames) {
      const gameKey = subsetKey(game);
      if (usedGameKeys.has(gameKey)) continue;
      
      const gameSet = new Set(game);
      const coveredKeys: string[] = [];
      
      // Verificar quantos t-subsets não cobertos este jogo cobre
      for (const [key, subset] of uncoveredSubsets) {
        let matchCount = 0;
        for (const num of subset) {
          if (gameSet.has(num)) matchCount++;
        }
        if (matchCount >= guaranteed) {
          coveredKeys.push(key);
        }
      }
      
      if (coveredKeys.length > bestCoverCount) {
        bestGame = game;
        bestCoverCount = coveredKeys.length;
        bestCoveredKeys = coveredKeys;
      }
    }
    
    // Se não encontrou jogo que cobre algo novo, saímos
    if (!bestGame || bestCoverCount === 0) {
      break;
    }
    
    // Adicionar o melhor jogo e remover os t-subsets cobertos
    selectedGames.push(bestGame.sort((a, b) => a - b));
    usedGameKeys.add(subsetKey(bestGame));
    
    for (const key of bestCoveredKeys) {
      uncoveredSubsets.delete(key);
    }
  }
  
  return selectedGames;
}

// ============ ABBREVIATED WHEEL GENERATOR ============

/**
 * Gera um Abbreviated Wheel com a garantia especificada.
 * 
 * Usa o algoritmo greedy para minimizar o número de jogos mantendo a garantia.
 * 
 * @param pool Números selecionados
 * @param lottery Definição da loteria
 * @param config Configuração do covering design
 */
export function generateAbbreviatedWheel(
  pool: number[],
  lottery: LotteryDefinition,
  config: CoveringDesignConfig
): CoveringDesignResult {
  const { wheelType, guaranteeLevel, customGuarantee } = config;
  
  // Se for fechamento total (full wheel), usa método tradicional
  if (wheelType === 'full') {
    return generateFullWheel(pool, lottery);
  }
  
  // Parse da garantia
  const guarantee = guaranteeLevel === 'custom' && customGuarantee
    ? customGuarantee
    : parseGuarantee(guaranteeLevel);
  
  const { mustMatch, guaranteed } = guarantee;
  
  // Validações
  if (pool.length < lottery.gameSize) {
    throw new Error(`Selecione pelo menos ${lottery.gameSize} números.`);
  }
  
  if (mustMatch > pool.length) {
    throw new Error(`Pool (${pool.length}) menor que números necessários para garantia (${mustMatch}).`);
  }
  
  if (guaranteed > lottery.gameSize) {
    throw new Error(`Garantia (${guaranteed}) maior que tamanho do jogo (${lottery.gameSize}).`);
  }
  
  // Calcular número de jogos do fechamento total para comparação
  const fullWheelCount = binomial(pool.length, lottery.gameSize);
  
  // Limitar para evitar travamento
  const maxTSubsets = binomial(pool.length, mustMatch);
  if (maxTSubsets > 50000) {
    throw new Error(`Muitos subconjuntos para verificar (${maxTSubsets.toLocaleString()}). Tente reduzir o pool ou escolher um nível de garantia mais simples (ex: 3-if-4).`);
  }
  
  // Gerar wheel abreviado usando greedy
  const games = greedyCoveringGenerator(
    pool,
    lottery.gameSize,
    mustMatch,
    guaranteed
  );
  
  // Verificar cobertura final
  const coverage = calculateCoverage(games, pool, mustMatch, guaranteed);
  
  // Estatísticas
  const savingsPercent = fullWheelCount > 0 
    ? Math.round((1 - games.length / fullWheelCount) * 100) 
    : 0;
  
  const guaranteeDescParts = guaranteeLevel === 'custom' && customGuarantee
    ? `${customGuarantee.guaranteed}-if-${customGuarantee.mustMatch}`
    : guaranteeLevel;
  
  const guaranteeDescription = `Garante ${guaranteed} acertos se ${mustMatch} números do pool forem sorteados`;
  
  return {
    games,
    stats: {
      fullWheelCount,
      abbreviatedCount: games.length,
      savingsPercent,
      guaranteeDescription,
      coverageScore: coverage.percent
    }
  };
}

// ============ FULL WHEEL (ORIGINAL) ============

/**
 * Gera o fechamento total (todas as combinações) - comportamento original.
 */
export function generateFullWheel(
  pool: number[],
  lottery: LotteryDefinition
): CoveringDesignResult {
  const n = pool.length;
  const k = lottery.gameSize;
  
  if (n < k) {
    return {
      games: [],
      stats: {
        fullWheelCount: 0,
        abbreviatedCount: 0,
        savingsPercent: 0,
        guaranteeDescription: 'Fechamento Total (todas combinações)',
        coverageScore: 100
      }
    };
  }
  
  const fullWheelCount = binomial(n, k);
  
  // Limite de segurança
  const MAX_COMBINATIONS = lottery.gameSize >= 50 ? 500 : 50000;
  if (fullWheelCount > MAX_COMBINATIONS) {
    throw new Error(`O fechamento total geraria ${fullWheelCount.toLocaleString()} jogos (máximo: ${MAX_COMBINATIONS.toLocaleString()}). Use o modo "Otimizado" ou "Balanceado" para mais números!`);
  }
  
  const games = getCombinations(pool, k).map(g => g.sort((a, b) => a - b));
  
  return {
    games,
    stats: {
      fullWheelCount,
      abbreviatedCount: games.length,
      savingsPercent: 0,
      guaranteeDescription: 'Fechamento Total - Garante o prêmio máximo se todos os números sorteados estiverem no pool',
      coverageScore: 100
    }
  };
}

// ============ BALANCED DESIGN (BIBD-INSPIRED) ============

/**
 * Gera um design "balanceado" onde cada par de números aparece 
 * aproximadamente o mesmo número de vezes.
 * 
 * Inspirado em BIBD (Balanced Incomplete Block Design).
 * Usa heurística combinando greedy com penalização de pares repetidos.
 */
export function generateBalancedWheel(
  pool: number[],
  lottery: LotteryDefinition,
  targetGames: number
): CoveringDesignResult {
  const gameSize = lottery.gameSize;
  const fullWheelCount = binomial(pool.length, gameSize);
  
  // Se target é maior que full, usa full
  if (targetGames >= fullWheelCount) {
    return generateFullWheel(pool, lottery);
  }
  
  // Track de quantas vezes cada par aparece
  const pairCount = new Map<string, number>();
  
  function getPairKey(a: number, b: number): string {
    return a < b ? `${a},${b}` : `${b},${a}`;
  }
  
  function getGameScore(game: number[]): number {
    // Score = soma inversa das contagens de pares (quanto menor a contagem, maior o score)
    let score = 0;
    for (let i = 0; i < game.length; i++) {
      for (let j = i + 1; j < game.length; j++) {
        const key = getPairKey(game[i], game[j]);
        const count = pairCount.get(key) || 0;
        score += 1 / (count + 1); // Inverso para favorecer pares menos usados
      }
    }
    return score;
  }
  
  function updatePairCounts(game: number[]) {
    for (let i = 0; i < game.length; i++) {
      for (let j = i + 1; j < game.length; j++) {
        const key = getPairKey(game[i], game[j]);
        pairCount.set(key, (pairCount.get(key) || 0) + 1);
      }
    }
  }
  
  // Gerar todos os jogos possíveis
  const allGames = getCombinations(pool, gameSize);
  const selectedGames: Game[] = [];
  const usedKeys = new Set<string>();
  
  // Selecionar jogos balanceados
  for (let i = 0; i < targetGames && allGames.length > 0; i++) {
    let bestGame: Game | null = null;
    let bestScore = -1;
    let bestIdx = -1;
    
    // Amostragem para performance (não verificar todos se muitos)
    const sampleSize = Math.min(allGames.length, 1000);
    const indices = new Set<number>();
    while (indices.size < sampleSize) {
      indices.add(Math.floor(Math.random() * allGames.length));
    }
    
    for (const idx of indices) {
      const game = allGames[idx];
      const key = subsetKey(game);
      
      if (usedKeys.has(key)) continue;
      
      const score = getGameScore(game);
      if (score > bestScore) {
        bestGame = game;
        bestScore = score;
        bestIdx = idx;
      }
    }
    
    if (bestGame) {
      selectedGames.push(bestGame.sort((a, b) => a - b));
      usedKeys.add(subsetKey(bestGame));
      updatePairCounts(bestGame);
    }
  }
  
  // Calcular score de balanceamento
  const allPairCounts = Array.from(pairCount.values());
  const avgCount = allPairCounts.reduce((a, b) => a + b, 0) / Math.max(allPairCounts.length, 1);
  const variance = allPairCounts.reduce((a, b) => a + Math.pow(b - avgCount, 2), 0) / Math.max(allPairCounts.length, 1);
  const stdDev = Math.sqrt(variance);
  
  // Score de balanceamento: quanto menor o desvio, mais balanceado (0 = perfeito)
  // Convertemos para 0-100 onde 100 = bem balanceado
  const balanceScore = Math.max(0, Math.min(100, Math.round(100 - stdDev * 20)));
  
  return {
    games: selectedGames,
    stats: {
      fullWheelCount,
      abbreviatedCount: selectedGames.length,
      savingsPercent: Math.round((1 - selectedGames.length / fullWheelCount) * 100),
      guaranteeDescription: `Design Balanceado - Cada par de números aparece ~${avgCount.toFixed(1)} vezes`,
      coverageScore: balanceScore
    }
  };
}

// ============ MAIN EXPORT ============

/**
 * Função principal que escolhe e executa o algoritmo correto
 * baseado na configuração do usuário.
 */
export function generateCoveringDesign(
  pool: number[],
  lottery: LotteryDefinition,
  config: CoveringDesignConfig
): CoveringDesignResult {
  switch (config.wheelType) {
    case 'full':
      return generateFullWheel(pool, lottery);
    
    case 'abbreviated':
      return generateAbbreviatedWheel(pool, lottery, config);
    
    case 'balanced':
      // Para balanceado, usamos ~50% do fechamento total ou 200 jogos, o que for menor
      const fullCount = binomial(pool.length, lottery.gameSize);
      const targetGames = Math.min(200, Math.ceil(fullCount * 0.5));
      return generateBalancedWheel(pool, lottery, targetGames);
    
    default:
      return generateFullWheel(pool, lottery);
  }
}
