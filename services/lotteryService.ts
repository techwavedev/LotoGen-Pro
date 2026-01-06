import { read, utils } from 'xlsx';
import { Game, FilterConfig, HistoryAnalysis, NumberStat, BalanceStat, RepetitionStats, LotteryDefinition } from '../types';

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

const generateRandomGame = (lottery: LotteryDefinition): Game => {
  const nums = new Set<number>();
  while (nums.size < lottery.gameSize) {
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
  hotNumbers: number[] = []
): Promise<Game[]> => {
  const result: Game[] = [];
  let attempts = 0;
  const MAX_ATTEMPTS = count * 5000; 

  const { lines: LINES, columns: COLUMNS } = getGridStructure(lottery);
  const hotSet = new Set(hotNumbers);
  const checkHotCold = config.useHotColdFilter && hotNumbers.length > 0;

  while (result.length < count && attempts < MAX_ATTEMPTS) {
    attempts++;
    const candidate = generateRandomGame(lottery);
    let isValid = true;

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