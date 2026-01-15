import { read, utils } from 'xlsx';
import { 
  Game, FilterConfig, HistoryAnalysis, NumberStat, BalanceStat, RepetitionStats, LotteryDefinition,
  DelayStats, SumRangeStats, ConsecutiveStats, TrendStats, RepeatBetweenDrawsStats, QuadrantStats,
  ExtendedHistoryAnalysis, ExtendedFilterConfig, CycleStats
} from '../types';

// Cache for Primes to avoid recalculating
const PRIMES_SET = new Set([
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97
]);

// Helper to generate Lines and Columns based on lottery grid layout
const getGridStructure = (lottery: LotteryDefinition) => {
  const lines: number[][] = [];
  const columns: number[][] = [];
  
  const numRows = Math.ceil(lottery.totalNumbers / lottery.cols);

  // Generate Lines
  for (let r = 0; r < numRows; r++) {
    const line: number[] = [];
    for (let c = 0; c < lottery.cols; c++) {
      const num = r * lottery.cols + c + 1;
      if (num <= lottery.totalNumbers) {
        line.push(num);
      }
    }
    lines.push(line);
  }

  // Generate Columns
  for (let c = 0; c < lottery.cols; c++) {
    const col: number[] = [];
    for (let r = 0; r < numRows; r++) {
      const num = r * lottery.cols + c + 1;
      if (num <= lottery.totalNumbers) {
        col.push(num);
      }
    }
    columns.push(col);
  }

  return { lines, columns };
};

const parseCell = (cell: any): number | null => {
  if (typeof cell === 'number') return Math.round(cell);
  if (typeof cell === 'string') {
      // Enhanced safety: Reject strings that look like dates (common in lottery CSVs)
      if (cell.includes('/') || cell.includes(':') || (cell.includes('-') && cell.length > 4)) return null;
      
      const parsed = parseInt(cell.trim());
      return isNaN(parsed) ? null : parsed;
  }
  return null;
}

export const parseHistoryFile = async (file: File, lottery: LotteryDefinition): Promise<Game[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to array of arrays
        const json = utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        const validGames: Game[] = [];
        
        // --- 1. Header Detection Strategy (Aggressive) ---
        let ballIndices: number[] = [];
        let headerRowIndex = -1;

        // Patterns to look for in header row
        const patterns = [
            // Standard "Bola 1", "Bola1"
            `bola`, `dezena`, `sorteio`, `num`,
            // Short forms "d1", "b1", "1ª"
            `d`, `b`, `n`, `ª` 
        ];

        // Scan first 30 rows for headers
        for(let i=0; i<Math.min(json.length, 30); i++) {
            const row = json[i];
            const potentialIndices: number[] = [];

            // Check if this row has headers for balls 1..drawSize
            for(let b=1; b<=lottery.drawSize; b++) {
                 // Try to find a column for ball 'b'
                 const index = row.findIndex(cell => {
                    const str = String(cell).toLowerCase().trim()
                        .replace(/[°ºª]/g, '') // remove ordinal indicators
                        .replace(/\s+/g, '');  // remove spaces
                    
                    // Checks: "bola1", "dezena1", "1dezena", "1" (if strictly numeric header)
                    return (
                        str === `bola${b}` || 
                        str === `dezena${b}` || 
                        str === `${b}dezena` || 
                        str === `b${b}` || 
                        str === `d${b}` ||
                        str === `n${b}` ||
                        str === `num${b}` ||
                        str === `numero${b}` ||
                        str === `${b}` // Dangerous, but handled by context check below
                    );
                 });

                 if (index !== -1) {
                     potentialIndices.push(index);
                 }
            }
            
            // Only accept if we found exactly the number of balls needed, or close to it
            // (Sometimes files have extra columns, but we need at least distinct columns for 1..drawSize)
            const uniqueIndices = [...new Set(potentialIndices)];
            if (uniqueIndices.length === lottery.drawSize) {
                ballIndices = uniqueIndices;
                headerRowIndex = i;
                break;
            }
        }

        // --- 2. Fallback: Content-Based Detection ---
        // If headers failed, look for columns that LOOK like lottery numbers
        if (ballIndices.length === 0) {
            console.log("Header detection failed. Attempting content analysis...");
            const columnScores = new Map<number, number>();
            const startRow = Math.min(5, json.length - 1);
            const endRow = Math.min(25, json.length);

            // Scan a sample of rows
            for (let i = startRow; i < endRow; i++) {
                const row = json[i];
                if (!row) continue;
                row.forEach((cell, colIdx) => {
                    const val = parseCell(cell);
                    // Check if value is valid lottery number
                    if (val !== null && val >= 1 && val <= lottery.totalNumbers) {
                        columnScores.set(colIdx, (columnScores.get(colIdx) || 0) + 1);
                    }
                });
            }

            // Select columns that had valid numbers in > 80% of sampled rows
            const threshold = (endRow - startRow) * 0.8;
            const validCols = Array.from(columnScores.entries())
                .filter(([_, score]) => score >= threshold)
                .map(([colIdx]) => colIdx)
                .sort((a, b) => a - b); // simple sort

            // If we found enough columns, take the first N (where N is drawSize)
            if (validCols.length >= lottery.drawSize) {
                ballIndices = validCols.slice(0, lottery.drawSize);
                headerRowIndex = startRow - 1; // Start reading from sample start
            }
        }

        // --- 3. Process Rows ---
        const startIndex = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;

        for (let i = startIndex; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;

          let numbers: number[] = [];

          if (ballIndices.length > 0) {
              // STRICT MODE: Read only from identified columns
              numbers = ballIndices.map(idx => parseCell(row[idx])).filter((n): n is number => n !== null);
          } else {
              // FINAL FALLBACK: Read row loosely (risky but necessary if all else fails)
              numbers = row.map(cell => parseCell(cell)).filter((n): n is number => n !== null);
          }

          // --- LOTOMANIA FIX: Handle 0/00 ---
          if (lottery.id === 'lotomania') {
             numbers = numbers.map(n => n === 0 ? 100 : n);
          }

          // Filter for valid range
          const validNumbers = [...new Set(numbers.filter(n => n >= 1 && n <= lottery.totalNumbers))].sort((a, b) => a - b);

          // Check against drawSize (History size)
          if (validNumbers.length === lottery.drawSize) {
            validGames.push(validNumbers);
          }
        }

        resolve(validGames);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const analyzeHistory = (history: Game[], lottery: LotteryDefinition): HistoryAnalysis => {
  const totalGames = history.length;
  const counts = new Array(lottery.totalNumbers + 1).fill(0); 

  // Count occurrences
  history.forEach(game => {
    game.forEach(num => {
      if (num >= 1 && num <= lottery.totalNumbers) {
        counts[num]++;
      }
    });
  });

  const stats: NumberStat[] = [];
  for (let i = 1; i <= lottery.totalNumbers; i++) {
    stats.push({
      number: i,
      count: counts[i],
      percentage: ((counts[i] / totalGames) * 100).toFixed(2)
    });
  }

  // Clone for sorting
  const mostFrequent = [...stats].sort((a, b) => b.count - a.count);
  const leastFrequent = [...stats].sort((a, b) => a.count - b.count);

  // Identify Hot Numbers (Top ~20% of total numbers or fixed logic)
  const hotCountLimit = Math.max(10, Math.floor(lottery.totalNumbers * 0.4));
  const hotNumbersSet = new Set(mostFrequent.slice(0, hotCountLimit).map(s => s.number));
  const hotNumbers = Array.from(hotNumbersSet);

  // Analyze Balance (How many hot numbers appear per game)
  const balanceCounts: Record<number, number> = {};
  
  history.forEach(game => {
    let hotCount = 0;
    game.forEach(num => {
      if (hotNumbersSet.has(num)) hotCount++;
    });
    balanceCounts[hotCount] = (balanceCounts[hotCount] || 0) + 1;
  });

  const balanceStats: BalanceStat[] = Object.keys(balanceCounts)
    .map(key => {
      const hotCount = parseInt(key);
      const count = balanceCounts[hotCount];
      return {
        hotCount,
        coldCount: lottery.drawSize - hotCount, // Using drawSize here for balance stats context
        occurrences: count,
        percentage: ((count / totalGames) * 100).toFixed(1)
      };
    })
    .sort((a, b) => b.occurrences - a.occurrences);

  // Repetition Analysis (Sampling if history is huge)
  let duplicates = 0;
  let nearMiss1 = 0; 
  let nearMiss2 = 0; 

  // Updated limit to cover standard history sizes (Quina is ~6500, Mega ~2700) without sampling errors
  const limitAnalysis = history.length > 10000 ? 10000 : history.length;
  
  for (let i = 0; i < limitAnalysis; i++) {
    for (let j = i + 1; j < limitAnalysis; j++) {
      let matches = 0;
      let p1 = 0;
      let p2 = 0;
      const g1 = history[i];
      const g2 = history[j];
      
      while (p1 < g1.length && p2 < g2.length) {
        if (g1[p1] === g2[p2]) { matches++; p1++; p2++; }
        else if (g1[p1] < g2[p2]) { p1++; }
        else { p2++; }
      }

      if (matches === lottery.drawSize) duplicates++;
      else if (matches === lottery.drawSize - 1) nearMiss1++;
      else if (matches === lottery.drawSize - 2) nearMiss2++;
    }
  }

  if (limitAnalysis < history.length) {
    const ratio = (history.length * (history.length-1)) / (limitAnalysis * (limitAnalysis-1));
    duplicates = Math.round(duplicates * ratio);
    nearMiss1 = Math.round(nearMiss1 * ratio);
    nearMiss2 = Math.round(nearMiss2 * ratio);
  }

  return {
    totalGames,
    mostFrequent,
    leastFrequent,
    allStats: stats,
    hotNumbers,
    balanceStats,
    repetitionStats: {
      duplicates,
      nearMiss1: nearMiss1,
      nearMiss2: nearMiss2
    }
  };
};

// ============ ADVANCED STATISTICAL ANALYSIS FUNCTIONS ============

// 1. DELAY ANALYSIS - Análise de Atrasos
export const analyzeDelays = (history: Game[], lottery: LotteryDefinition): DelayStats[] => {
  const totalGames = history.length;
  const delays: DelayStats[] = [];
  
  for (let num = 1; num <= lottery.totalNumbers; num++) {
    let lastSeenIndex = -1;
    let maxDelay = 0;
    let totalDelay = 0;
    let delayCount = 0;
    let prevIndex = -1;
    
    // Iterate from oldest to newest
    for (let i = 0; i < history.length; i++) {
      if (history[i].includes(num)) {
        if (lastSeenIndex === -1 || i > lastSeenIndex) {
          lastSeenIndex = i;
        }
        if (prevIndex !== -1) {
          const gap = i - prevIndex;
          totalDelay += gap;
          delayCount++;
          maxDelay = Math.max(maxDelay, gap);
        }
        prevIndex = i;
      }
    }
    
    const delay = lastSeenIndex === -1 ? totalGames : (totalGames - 1 - lastSeenIndex);
    
    delays.push({
      number: num,
      lastSeen: lastSeenIndex === -1 ? 0 : (totalGames - lastSeenIndex),
      delay,
      maxDelay,
      avgDelay: delayCount > 0 ? Math.round(totalDelay / delayCount * 10) / 10 : 0
    });
  }
  
  return delays.sort((a, b) => b.delay - a.delay);
};

// 2. SUM RANGE ANALYSIS - Análise de Faixa de Soma
export const analyzeSumRange = (history: Game[]): SumRangeStats => {
  if (history.length === 0) {
    return { min: 0, max: 0, average: 0, stdDev: 0, mostCommonRange: [0, 0] };
  }
  
  const sums = history.map(g => g.reduce((a, b) => a + b, 0));
  const sorted = [...sums].sort((a, b) => a - b);
  
  const avg = sums.reduce((a, b) => a + b, 0) / sums.length;
  const variance = sums.reduce((a, b) => a + (b - avg) ** 2, 0) / sums.length;
  
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    average: Math.round(avg * 10) / 10,
    stdDev: Math.round(Math.sqrt(variance) * 10) / 10,
    mostCommonRange: [
      sorted[Math.floor(sorted.length * 0.25)],  // P25
      sorted[Math.floor(sorted.length * 0.75)]   // P75
    ]
  };
};

// 3. CONSECUTIVE ANALYSIS - Análise de Consecutivos
export const analyzeConsecutives = (history: Game[]): ConsecutiveStats => {
  const distribution: Record<number, number> = {};
  let totalPairs = 0;
  
  for (const game of history) {
    let pairs = 0;
    const sorted = [...game].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i-1] + 1) pairs++;
    }
    distribution[pairs] = (distribution[pairs] || 0) + 1;
    totalPairs += pairs;
  }
  
  const mostCommon = Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '0';
  
  return {
    distribution,
    avgPairs: history.length > 0 ? Math.round(totalPairs / history.length * 10) / 10 : 0,
    mostCommon: Number(mostCommon)
  };
};

// 4. TREND ANALYSIS - Análise de Tendência (Últimos N Sorteios)
export const analyzeTrends = (history: Game[], lottery: LotteryDefinition, recentN = 20): TrendStats => {
  if (history.length < recentN) {
    return { recentHot: [], recentCold: [], emerging: [], declining: [] };
  }
  
  const recentHistory = history.slice(-recentN);
  const olderHistory = history.slice(-recentN * 2, -recentN);
  
  const recentCounts = new Array(lottery.totalNumbers + 1).fill(0);
  const olderCounts = new Array(lottery.totalNumbers + 1).fill(0);
  
  recentHistory.forEach(g => g.forEach(n => { if (n <= lottery.totalNumbers) recentCounts[n]++; }));
  olderHistory.forEach(g => g.forEach(n => { if (n <= lottery.totalNumbers) olderCounts[n]++; }));
  
  const trends: { number: number; recentFreq: number; olderFreq: number; trend: number }[] = [];
  const olderLen = Math.max(olderHistory.length, 1);
  
  for (let i = 1; i <= lottery.totalNumbers; i++) {
    trends.push({
      number: i,
      recentFreq: recentCounts[i] / recentN,
      olderFreq: olderCounts[i] / olderLen,
      trend: (recentCounts[i] / recentN) - (olderCounts[i] / olderLen)
    });
  }
  
  const byRecent = [...trends].sort((a, b) => b.recentFreq - a.recentFreq);
  const byTrend = [...trends].sort((a, b) => b.trend - a.trend);
  
  return {
    recentHot: byRecent.slice(0, 10).map(t => t.number),
    recentCold: byRecent.slice(-10).reverse().map(t => t.number),
    emerging: byTrend.slice(0, 10).map(t => t.number),
    declining: byTrend.slice(-10).reverse().map(t => t.number)
  };
};

// 5. REPEAT ANALYSIS - Análise de Repetições entre Sorteios
export const analyzeRepeats = (history: Game[]): RepeatBetweenDrawsStats => {
  if (history.length < 2) {
    return { avgRepeats: 0, distribution: {} };
  }
  
  const distribution: Record<number, number> = {};
  let totalRepeats = 0;
  
  for (let i = 1; i < history.length; i++) {
    const prev = new Set(history[i - 1]);
    const repeats = history[i].filter(n => prev.has(n)).length;
    distribution[repeats] = (distribution[repeats] || 0) + 1;
    totalRepeats += repeats;
  }
  
  return {
    avgRepeats: Math.round(totalRepeats / (history.length - 1) * 10) / 10,
    distribution
  };
};

// 6. QUADRANT/GROUP ANALYSIS - Análise de Distribuição por Grupos
export const analyzeQuadrants = (history: Game[], lottery: LotteryDefinition): QuadrantStats => {
  const groupCount = 4;
  const groupSize = Math.ceil(lottery.totalNumbers / groupCount);
  const groups: { range: string; expected: number; actual: number }[] = [];
  
  for (let g = 0; g < groupCount; g++) {
    const start = g * groupSize + 1;
    const end = Math.min((g + 1) * groupSize, lottery.totalNumbers);
    groups.push({
      range: `${String(start).padStart(2, '0')}-${String(end).padStart(2, '0')}`,
      expected: lottery.gameSize / groupCount,
      actual: 0
    });
  }
  
  let totalNumbers = 0;
  for (const game of history) {
    game.forEach(n => {
      const groupIdx = Math.min(groupCount - 1, Math.floor((n - 1) / groupSize));
      groups[groupIdx].actual++;
      totalNumbers++;
    });
  }
  
  // Normalize to average per game
  if (history.length > 0) {
    groups.forEach(g => {
      g.actual = Math.round((g.actual / history.length) * 100) / 100;
    });
  }
  
  return { groups };
};

const FIBONACCI_SET = new Set([1, 2, 3, 5, 8, 13, 21, 34, 55, 89]);

// 9. CYCLE ANALYSIS
export const analyzeCycles = (history: Game[], lottery: LotteryDefinition): CycleStats => {
  const allNumbers = new Set<number>();
  for(let i=1; i<=lottery.totalNumbers; i++) allNumbers.add(i);
  
  // Find where the last complete cycle ended (if any)
  // Then calculate missing numbers for the CURRENT (incomplete) cycle
  
  let lastCycleClosedAt = -1; // Index where last cycle closed
  let lastCycleLength = 0;
  
  // First pass: find where the last cycle closed (working backwards)
  const missingFirstPass = new Set(allNumbers);
  for (let i = history.length - 1; i >= 0; i--) {
    const game = history[i];
    game.forEach(n => missingFirstPass.delete(n));
    
    if (missingFirstPass.size === 0) {
      // Cycle closed at position i
      lastCycleClosedAt = i;
      lastCycleLength = history.length - i;
      break;
    }
  }
  
  // Second pass: calculate missing numbers for the CURRENT cycle
  // Start from AFTER the last complete cycle (or from the beginning if no complete cycle found)
  const currentCycleMissing = new Set(allNumbers);
  const startIndex = lastCycleClosedAt >= 0 ? lastCycleClosedAt + 1 : 0;
  
  // Only look at draws AFTER the cycle closed
  for (let i = startIndex; i < history.length; i++) {
    const game = history[i];
    game.forEach(n => currentCycleMissing.delete(n));
  }
  
  const currentCycleLength = history.length - startIndex;
  
  return {
    missingNumbers: Array.from(currentCycleMissing).sort((a, b) => a - b),
    currentCycleLength: currentCycleLength,
    lastCycleLength: lastCycleLength > 0 ? lastCycleLength : undefined
  };
};

// 8. HELPERS FOR MANDEL STATS
const calculateMandelStats = (history: Game[], lottery: LotteryDefinition) => {
  let totalPrimes = 0;
  let totalEdges = 0;
  let totalSpread = 0;
  let totalDecades = 0;
  let totalFibonacci = 0;

  history.forEach(game => {
    // Primes
    totalPrimes += game.filter(n => PRIMES_SET.has(n)).length;
    
    // Fibonacci
    totalFibonacci += game.filter(n => FIBONACCI_SET.has(n)).length;
    
    // Edges (Numbers 1-cols, multiples of cols, multiples of cols + 1, last numbers)
    const { totalNumbers, cols } = lottery;
    const numRows = Math.ceil(totalNumbers / cols);
    const edges = game.filter(n => {
       const row = Math.ceil(n / cols); // 1-based
       const col = (n - 1) % cols + 1;  // 1-based
       return row === 1 || row === numRows || col === 1 || col === cols;
    }).length;
    totalEdges += edges;

    // Spread (Avg Dist)
    let spreadSum = 0;
    if (game.length > 1) {
        for(let i=0; i<game.length-1; i++) {
            spreadSum += (game[i+1] - game[i]);
        }
        totalSpread += spreadSum / (game.length - 1);
    }

    // Decades
    const decades = new Set(game.map(n => Math.floor((n-1)/10)));
    totalDecades += decades.size;
  });

  const avgPrimes = totalPrimes / history.length;
  const avgEdges = totalEdges / history.length;
  const avgSpread = totalSpread / history.length;
  const avgDecades = totalDecades / history.length;
  const avgFibonacci = totalFibonacci / history.length;

  return {
    primeDistributionStats: {
        avgPrimesPerGame: avgPrimes,
        recommendedRange: [Math.floor(avgPrimes * 0.7), Math.ceil(avgPrimes * 1.3)] as [number, number]
    },
    decadeDistributionStats: {
        avgDecadesCovered: avgDecades
    },
    edgeNumberStats: {
        avgEdgesPerGame: avgEdges,
        recommendedRange: [Math.floor(avgEdges * 0.7), Math.ceil(avgEdges * 1.3)] as [number, number]
    },
    spreadStats: {
        avgSpread: avgSpread,
        recommendedMinSpread: Math.floor(avgSpread * 0.6)
    },
    fibonacciStats: {
        avgFibonacciPerGame: avgFibonacci,
        recommendedRange: [Math.floor(avgFibonacci * 0.6), Math.ceil(avgFibonacci * 1.4)] as [number, number]
    }
  };
};

// 7. EXTENDED HISTORY ANALYSIS - Combina todas as análises
export const analyzeHistoryExtended = (history: Game[], lottery: LotteryDefinition): ExtendedHistoryAnalysis => {
  const baseAnalysis = analyzeHistory(history, lottery);
  const mandelStats = calculateMandelStats(history, lottery);
  const sumStats = analyzeSumRange(history);

  return {
    ...baseAnalysis,
    delayStats: analyzeDelays(history, lottery),
    sumRangeStats: sumStats,
    consecutiveStats: analyzeConsecutives(history),
    trendStats: analyzeTrends(history, lottery),
    repeatBetweenDrawsStats: analyzeRepeats(history),
    quadrantStats: analyzeQuadrants(history, lottery),
    cycleStats: analyzeCycles(history, lottery),
    
    // Inject Mandel Stats
    primeDistributionStats: mandelStats.primeDistributionStats,
    decadeDistributionStats: mandelStats.decadeDistributionStats,
    edgeNumberStats: mandelStats.edgeNumberStats,
    spreadStats: mandelStats.spreadStats,
    sumStats: { averageSum: sumStats.average },
    fibonacciStats: mandelStats.fibonacciStats
  };
};

const generateRandomGame = (lottery: LotteryDefinition, size?: number): Game => {
  const nums = new Set<number>();
  const limit = size || lottery.gameSize;
  while (nums.size < limit) {
    nums.add(Math.floor(Math.random() * lottery.totalNumbers) + 1);
  }
  return Array.from(nums).sort((a, b) => a - b);
};

const isSequential = (game: Game, gameSize: number): boolean => {
  // Checks if the WHOLE game is a sequence (rare for large games)
  if (gameSize > 20) return false; 
  return game[gameSize - 1] === game[0] + gameSize - 1;
};

export const generateGames = async (
  count: number,
  history: Game[],
  config: FilterConfig,
  lottery: LotteryDefinition,
  hotNumbers: number[] = [],
  overrideGameSize?: number
): Promise<Game[]> => {
  const result: Game[] = [];
  let attempts = 0;
  const MAX_ATTEMPTS = count * 20000; 

  const targetSize = overrideGameSize || lottery.gameSize;
  const { lines: LINES, columns: COLUMNS } = getGridStructure(lottery);
  const hotSet = new Set(hotNumbers);
  const checkHotCold = config.useHotColdFilter && hotNumbers.length > 0;

  while (result.length < count && attempts < MAX_ATTEMPTS) {
    attempts++;
    const candidate = generateRandomGame(lottery, targetSize);
    let isValid = true;

    // IMPORTANT: If we are generating Multiple Bets (larger than standard),
    // strict filters like "Even/Odd" count might need relaxation.
    // However, if the user explicitly ASKED for filters, we should try to honor them
    // relative to the NEW size? Or just disable them?
    // Current strategy: Apply filters as is. If targetSize is 18, and user wants 15 Even,
    // that's impossible if gameSize is 15. But if user selected "Exclude All Even", that still works.
    // Filters based on "Count" (like Mandel Primes: min 2 max 9) might fail if
    // we generate a huge game.
    // AUTO-ADJUST: If targetSize > lottery.gameSize, we skip "Count-based" checks or scale them?
    // Let's Skip STRICT Count checks if size differs, effectively treating "Multiple Bets" as 
    // "Smart Random with relaxed constraints".
    
    const isMultipleBet = targetSize > lottery.gameSize;

    // 1. Hot/Cold Filter
    if (checkHotCold) {
      let hotCount = 0;
      for (const num of candidate) {
        if (hotSet.has(num)) hotCount++;
      }
      // If multiple bet, we allow proportionally more hot numbers
      const ratio = targetSize / lottery.gameSize;
      const effectiveMaxHot = isMultipleBet ? Math.ceil(config.maxHotNumbers * ratio) : config.maxHotNumbers;
      
      if (hotCount < config.minHotNumbers || hotCount > effectiveMaxHot) {
        isValid = false;
      }
    }
    if (!isValid) continue;

    // 2. Basic Pattern Filters
    if (config.excludeAllEven || config.excludeAllOdd) {
      const evenCount = candidate.filter(n => n % 2 === 0).length;
      if (config.excludeAllEven && evenCount === targetSize) isValid = false; // All Even means NO Odd? No, wait. "excludeAllEven" usually means "Don't allow a game with ONLY even numbers".
      // Actually standard logic: "Exclude games that are ALL Even".
      if (config.excludeAllEven && evenCount === targetSize) isValid = false;
      if (config.excludeAllOdd && evenCount === 0) isValid = false; 
    }
    if (!isValid) continue;

    if (config.excludeAllPrimes) {
      const allPrime = candidate.every(n => PRIMES_SET.has(n));
      if (allPrime) isValid = false;
    }
    if (!isValid) continue;

    if (config.excludeSequences) {
      if (isSequential(candidate, lottery.gameSize)) isValid = false;
    }
    if (!isValid) continue;

    // Lines/Columns Logic
    if (config.excludeFullLines) {
      for (const line of LINES) {
        // Line is typically 5 or 10 numbers. Candidate has gameSize (e.g. 15, 6, 50).
        // If line is smaller than candidate, we check if candidate contains ALL line numbers.
        if (line.every(n => candidate.includes(n))) {
          isValid = false; break;
        }
      }
    }
    if (!isValid) continue;

    if (config.excludeFullColumns) {
      for (const col of COLUMNS) {
        if (col.every(n => candidate.includes(n))) {
          isValid = false; break;
        }
      }
    }
    if (!isValid) continue;

    if (lottery.id === 'lotofacil') {
        if (config.excludeAlternatingLines) {
            const line0Full = LINES[0].every(n => candidate.includes(n));
            const line2Full = LINES[2].every(n => candidate.includes(n));
            const line4Full = LINES[4].every(n => candidate.includes(n));
            const line1Full = LINES[1].every(n => candidate.includes(n));
            const line3Full = LINES[3].every(n => candidate.includes(n));

            if ((line0Full && line2Full && line4Full) || (line1Full && line3Full)) isValid = false;
        }
        if (isValid && config.excludeAlternatingColumns) {
             const col0Full = COLUMNS[0].every(n => candidate.includes(n));
             const col2Full = COLUMNS[2].every(n => candidate.includes(n));
             const col4Full = COLUMNS[4].every(n => candidate.includes(n));
             const col1Full = COLUMNS[1].every(n => candidate.includes(n));
             const col3Full = COLUMNS[3].every(n => candidate.includes(n));
             if ((col0Full && col2Full && col4Full) || (col1Full && col3Full)) isValid = false;
        }
    }
    if (!isValid) continue;

    // 3. Historical Data Filters
    if (history.length > 0) {
      // In Lotofacil: candidate(15) vs history(15). Full Match = 15.
      // In Lotomania: candidate(50) vs history(20). Full Draw Match = 20.
      
      const matchLimit = lottery.drawSize; // Max possible intersection with a draw
      const matchLimitMinus1 = lottery.drawSize - 1;
      const matchLimitMinus2 = lottery.drawSize - 2;

      for (const pastGame of history) {
        let hits = 0;
        let i = 0, j = 0;
        
        // Count intersection between Candidate (sorted) and PastGame (sorted)
        // Candidate has gameSize, PastGame has drawSize
        while(i < candidate.length && j < pastGame.length) {
            if (candidate[i] === pastGame[j]) { hits++; i++; j++; }
            else if (candidate[i] < pastGame[j]) i++;
            else j++;
        }
        
        // Interpreting configs based on drawSize
        if (config.exclude15Hits && hits === matchLimit) { isValid = false; break; }
        if (config.exclude14Hits && hits === matchLimitMinus1) { isValid = false; break; }
        if (config.exclude13Hits && hits === matchLimitMinus2) { isValid = false; break; }
        
        // Small games specific logic
        if (lottery.gameSize <= 20) {
            if (config.exclude12Hits && hits === matchLimit - 3) { isValid = false; break; }
            if (config.exclude11Hits && hits === matchLimit - 4) { isValid = false; break; }
        }
      }
    }

    if (isValid) {
      result.push(candidate);
    }
  }

  return result;
};

// Extended game generation with advanced filters
export const generateGamesExtended = async (
  count: number,
  history: Game[],
  config: ExtendedFilterConfig,
  lottery: LotteryDefinition,
  hotNumbers: number[] = [],
  extendedAnalysis?: ExtendedHistoryAnalysis,
  overrideGameSize?: number // Optional: Generate games larger than standard (e.g. 16 numbers)
): Promise<Game[]> => {
  const result: Game[] = [];
  let attempts = 0;
  const MAX_ATTEMPTS = count * 200000; // Increased to allow strict filters

  const targetSize = overrideGameSize || lottery.gameSize;
  const { lines: LINES, columns: COLUMNS } = getGridStructure(lottery);
  const hotSet = new Set(hotNumbers);
  const checkHotCold = config.useHotColdFilter && hotNumbers.length > 0;
  
  // Pre-compute delay data if filter is enabled
  const delayedNumbersSet = new Set<number>();
  if (config.useDelayFilter && extendedAnalysis) {
    extendedAnalysis.delayStats
      .filter(d => d.delay >= config.delayThreshold)
      .forEach(d => delayedNumbersSet.add(d.number));
  }
  
  // Pre-compute trend data if filter is enabled
  const trendingHotSet = new Set<number>(extendedAnalysis?.trendStats.emerging || []);
  
  // Last draw for repeat filter
  const lastDraw = history.length > 0 ? new Set(history[history.length - 1]) : new Set<number>();
  
  // Cycle Missing
  const missingCycleNumbers = new Set(extendedAnalysis?.cycleStats?.missingNumbers || []);

  while (result.length < count && attempts < MAX_ATTEMPTS) {
    attempts++;
    const candidate = generateRandomGame(lottery);
    let isValid = true;

    // ============ BASIC FILTERS (from original) ============
    
    // 1. Hot/Cold Filter
    if (checkHotCold) {
      let hotCount = 0;
      for (const num of candidate) {
        if (hotSet.has(num)) hotCount++;
      }
      if (hotCount < config.minHotNumbers || hotCount > config.maxHotNumbers) {
        isValid = false;
      }
    }
    if (!isValid) continue;

    // 2. Basic Pattern Filters
    if (config.excludeAllEven || config.excludeAllOdd) {
      const evenCount = candidate.filter(n => n % 2 === 0).length;
      if (config.excludeAllEven && evenCount === lottery.gameSize) isValid = false;
      if (config.excludeAllOdd && evenCount === 0) isValid = false; 
    }
    if (!isValid) continue;

    if (config.excludeAllPrimes) {
      const allPrime = candidate.every(n => PRIMES_SET.has(n));
      if (allPrime) isValid = false;
    }
    if (!isValid) continue;

    if (config.excludeSequences) {
      if (isSequential(candidate, lottery.gameSize)) isValid = false;
    }
    if (!isValid) continue;

    // Lines/Columns Logic
    if (config.excludeFullLines) {
      for (const line of LINES) {
        if (line.every(n => candidate.includes(n))) {
          isValid = false; break;
        }
      }
    }
    if (!isValid) continue;

    if (config.excludeFullColumns) {
      for (const col of COLUMNS) {
        if (col.every(n => candidate.includes(n))) {
          isValid = false; break;
        }
      }
    }
    if (!isValid) continue;

    if (lottery.id === 'lotofacil') {
      if (config.excludeAlternatingLines) {
        const line0Full = LINES[0].every(n => candidate.includes(n));
        const line2Full = LINES[2].every(n => candidate.includes(n));
        const line4Full = LINES[4].every(n => candidate.includes(n));
        const line1Full = LINES[1].every(n => candidate.includes(n));
        const line3Full = LINES[3].every(n => candidate.includes(n));
        if ((line0Full && line2Full && line4Full) || (line1Full && line3Full)) isValid = false;
      }
      if (isValid && config.excludeAlternatingColumns) {
        const col0Full = COLUMNS[0].every(n => candidate.includes(n));
        const col2Full = COLUMNS[2].every(n => candidate.includes(n));
        const col4Full = COLUMNS[4].every(n => candidate.includes(n));
        const col1Full = COLUMNS[1].every(n => candidate.includes(n));
        const col3Full = COLUMNS[3].every(n => candidate.includes(n));
        if ((col0Full && col2Full && col4Full) || (col1Full && col3Full)) isValid = false;
      }
    }
    if (!isValid) continue;

    // ============ NEW ADVANCED FILTERS ============

    // 3. DELAY FILTER - Números Atrasados
    if (config.useDelayFilter && delayedNumbersSet.size > 0) {
      const delayedInGame = candidate.filter(n => delayedNumbersSet.has(n)).length;
      if (delayedInGame < config.minDelayedNumbers) {
        isValid = false;
      }
    }
    if (!isValid) continue;

    // 4. SUM FILTER - Faixa de Soma
    if (config.useSumFilter) {
      const sum = candidate.reduce((a, b) => a + b, 0);
      if (sum < config.minSum || sum > config.maxSum) {
        isValid = false;
      }
    }
    if (!isValid) continue;

    // 5. CONSECUTIVE FILTER - Máximo de Consecutivos
    if (config.useConsecutiveFilter) {
      let pairs = 0;
      for (let i = 1; i < candidate.length; i++) {
        if (candidate[i] === candidate[i - 1] + 1) pairs++;
      }
      if (pairs > config.maxConsecutivePairs) {
        isValid = false;
      }
    }
    if (!isValid) continue;

    // 6. TREND FILTER - Números em Tendência
    if (config.useTrendFilter && trendingHotSet.size > 0) {
      const trendingInGame = candidate.filter(n => trendingHotSet.has(n)).length;
      if (trendingInGame < config.minTrendingHot) {
        isValid = false;
      }
    }
    if (!isValid) continue;

    // 7. REPEAT FILTER - Repetições do Último Sorteio
    if (config.useRepeatFilter && lastDraw.size > 0) {
      const repeats = candidate.filter(n => lastDraw.has(n)).length;
      if (repeats < config.minRepeatsFromLast || repeats > config.maxRepeatsFromLast) {
        isValid = false;
      }
    }
    if (!isValid) continue;

    // 8. INTERLEAVING FILTER - Equilíbrio Baixas/Altas
    if (config.useInterleavingFilter && config.balanceGroups) {
      const mid = Math.floor(lottery.totalNumbers / 2);
      const lowCount = candidate.filter(n => n <= mid).length;
      const highCount = candidate.length - lowCount;
      const diff = Math.abs(lowCount - highCount);
      // Allow max 30% imbalance (configurable threshold)
      const maxImbalance = Math.ceil(lottery.gameSize * 0.3);
      if (diff > maxImbalance) {
        isValid = false;
      }
    }
    if (!isValid) continue;

    // 9. CYCLE FILTER - Forçar números do ciclo
    if (config.useCycleFilter && missingCycleNumbers.size > 0) {
         // Logic: Ensure ALL missing numbers are present? 
         // Or at least SOME? "Closing the cycle" strategy usually implies betting on the missing ones.
         // Let's enforce that ALL missing numbers (if fit in game) must be present to "Attempt to close".
         // Use case: Lotofacil, 3 missing. You want games containing those 3.
         
         const missingCount = missingCycleNumbers.size;
         // If missing count > gameSize, impossible to include all (unlikely).
         
         if (missingCount <= 3) {
             // For small missing sets, force ALL of them (Strong Strategy)
             const hasAll = Array.from(missingCycleNumbers).every(n => candidate.includes(n));
             if (!hasAll) isValid = false;
         } else {
             // For large missing sets (start of cycle), force at least 2 or 3?
             // Actually, usually users turn this on ONLY at the END of the cycle.
             // Let's stick to "Include ALL missing numbers" as the feature definition "Fechar Ciclo".
             const hasAll = Array.from(missingCycleNumbers).every(n => candidate.includes(n));
             if (!hasAll) isValid = false;
         }
    }
    if (!isValid) continue;

    // ============ HISTORICAL DATA FILTERS ============
    if (history.length > 0) {
      const matchLimit = lottery.drawSize;
      const matchLimitMinus1 = lottery.drawSize - 1;
      const matchLimitMinus2 = lottery.drawSize - 2;

      for (const pastGame of history) {
        let hits = 0;
        let i = 0, j = 0;
        
        while (i < candidate.length && j < pastGame.length) {
          if (candidate[i] === pastGame[j]) { hits++; i++; j++; }
          else if (candidate[i] < pastGame[j]) i++;
          else j++;
        }
        
        if (config.exclude15Hits && hits === matchLimit) { isValid = false; break; }
        if (config.exclude14Hits && hits === matchLimitMinus1) { isValid = false; break; }
        if (config.exclude13Hits && hits === matchLimitMinus2) { isValid = false; break; }
        
        if (lottery.gameSize <= 20) {
          if (config.exclude12Hits && hits === matchLimit - 3) { isValid = false; break; }
          if (config.exclude11Hits && hits === matchLimit - 4) { isValid = false; break; }
        }
      }
    }

    if (isValid) {
      result.push(candidate);
    }
  }

  return result;
  return result;
};

// ============ COMBINATORIAL GENERATOR (FECHAMENTOS) ============

function getCombinations<T>(arr: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (arr.length === 0) return [];
    
    const [first, ...rest] = arr;
    
    const withFirst = getCombinations(rest, k - 1).map(c => [first, ...c]);
    const withoutFirst = getCombinations(rest, k);
    
    return [...withFirst, ...withoutFirst];
}

export const generateCombinatorialGames = (
  selectedNumbers: number[],
  lottery: LotteryDefinition
): Game[] => {
  // Hard limit to prevent browser crash
  // Lotofacil 18 dezenas -> 816 jogos. 20 dezenas -> 15.504 (Ok). 21 (~54k) Limit.
  const MAX_COMBINATIONS = 50000;
  
  // For Lotomania (gameSize=50), limit is much stricter because each game is HUGE
  const MAX_LOTOMANIA_COMBINATIONS = 500; // 500 games of 50 numbers each = 25,000 numbers
  const effectiveMax = lottery.gameSize >= 50 ? MAX_LOTOMANIA_COMBINATIONS : MAX_COMBINATIONS;
  
  // Basic nCr check
  const n = selectedNumbers.length;
  const k = lottery.gameSize;
  
  if (n < k) return [];
  if (n === k) return [selectedNumbers.sort((a,b)=>a-b)];
  
  // Quick combinatorial estimate without full calculation
  const estimateCombinations = (n: number, k: number): number => {
      if (k < 0 || k > n) return 0;
      if (k === 0 || k === n) return 1;
      if (k > n - k) k = n - k; // Optimization: C(n,k) = C(n, n-k)
      
      let result = 1;
      for (let i = 0; i < k; i++) {
          result = result * (n - i) / (i + 1);
          if (result > effectiveMax * 2) return result; // Early exit if too big
      }
      return Math.round(result);
  };
  
  const estimated = estimateCombinations(n, k);
  
  if (estimated > effectiveMax) {
      throw new Error(`Muitas combinações (~${estimated.toLocaleString()}). Máximo para ${lottery.name}: ${effectiveMax.toLocaleString()} jogos.`);
  }
  
  // Lotofacil specific check (legacy)
  if (lottery.id === 'lotofacil' && n > 21) {
      throw new Error(`Selecione no máximo 21 números para evitar travamento (Geraria >50k jogos).`);
  }
  
  // Generate
  const combos = getCombinations(selectedNumbers, k);
  
  if (combos.length > effectiveMax) {
       throw new Error(`Muitas combinações (${combos.length}). Reduza a quantidade de números.`);
  }
  
  return combos.map(c => c.sort((a,b) => a-b));
};