import { useState, useEffect, useRef, useCallback, Dispatch, SetStateAction } from 'react';
import { LotteryDefinition, HistoryEntry, ExtendedHistoryAnalysis } from '../types';
import { analyzeHistoryExtended } from '../services/lotteryService';

interface UseLotteryDataOptions {
  lotteryId: string;
  lottery: LotteryDefinition;
  apiUrl: string | undefined;
}

interface UseLotteryDataResult {
  history: HistoryEntry[];
  analysis: ExtendedHistoryAnalysis | null;
  latestResult: { draw_number: number; numbers: string[]; draw_date: string } | null;
  isLoading: boolean;
  loadingMessage: string;
  isSyncing: boolean;
  error: string | null;
  refetchHistory: () => Promise<void>;
  clearError: () => void;
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
  setAnalysis: React.Dispatch<React.SetStateAction<ExtendedHistoryAnalysis | null>>;
}

/**
 * Custom hook for managing lottery data fetching with proper state management
 * Prevents duplicate loading messages and implements intelligent retry logic
 */
export function useLotteryData({
  lotteryId,
  lottery,
  apiUrl
}: UseLotteryDataOptions): UseLotteryDataResult {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [analysis, setAnalysis] = useState<ExtendedHistoryAnalysis | null>(null);
  const [latestResult, setLatestResult] = useState<{
    draw_number: number;
    numbers: string[];
    draw_date: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to prevent stale closures and duplicate requests
  const historyLengthRef = useRef<number>(0);
  const syncRetryCountRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const analysisCacheRef = useRef<Map<string, ExtendedHistoryAnalysis>>(new Map());

  // Helper: Check if history cache is valid
  const isHistoryCacheValid = useCallback((cacheDate: string) => {
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
  }, []);

  // Memoized analysis function with caching
  const analyzeWithCache = useCallback((
    historyData: HistoryEntry[],
    lotteryDef: LotteryDefinition
  ): ExtendedHistoryAnalysis => {
    // Create cache key from history data
    const cacheKey = `${lotteryDef.id}_${historyData.length}_${historyData[0]?.numbers.join('-')}`;

    // Check cache first
    const cached = analysisCacheRef.current.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Perform analysis
    const gamesHistory = historyData.map(h => h.numbers);
    const result = analyzeHistoryExtended(gamesHistory, lotteryDef);

    // Cache the result
    analysisCacheRef.current.set(cacheKey, result);

    return result;
  }, []);

  // Fetch history with proper abort handling
  const fetchHistory = useCallback(async (signal: AbortSignal) => {
    if (!apiUrl) return;

    try {
      setIsLoading(true);
      setLoadingMessage(`Carregando histórico da ${lottery.name}...`);

      const response = await fetch(`${apiUrl}/api/lottery/${lotteryId}/history`, {
        signal
      });

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();

      // Handle syncing state with exponential backoff
      if (data.syncing) {
        setIsSyncing(true);
        setLoadingMessage(`Sincronizando com a Caixa...`);

        // Exponential backoff: 5s, 10s, 20s, max 60s
        const delay = Math.min(5000 * Math.pow(2, syncRetryCountRef.current), 60000);
        syncRetryCountRef.current++;

        if (syncRetryCountRef.current <= 10) { // Max 10 retries
          setTimeout(() => {
            if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
              fetchHistory(abortControllerRef.current!.signal);
            }
          }, delay);
        } else {
          setError('Sincronização demorando muito. Tente novamente mais tarde.');
          setIsSyncing(false);
          setIsLoading(false);
        }
        return;
      }

      // Sync completed
      setIsSyncing(false);
      syncRetryCountRef.current = 0;

      if (data.games && data.games.length > 0) {
        const entries: HistoryEntry[] = data.games.map((g: number[]) => ({
          numbers: g
        }));

        // Only update if we have MORE data
        if (entries.length > historyLengthRef.current) {
          historyLengthRef.current = entries.length;
          setHistory(entries);

          // Use cached analysis
          const stats = analyzeWithCache(entries, lottery);
          setAnalysis(stats);

          // Update localStorage cache
          const cacheKey = `history_${lotteryId}`;
          const cachedDateKey = `history_${lotteryId}_date`;
          localStorage.setItem(cacheKey, JSON.stringify(entries));
          localStorage.setItem(cachedDateKey, new Date().toISOString());
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      console.error('Failed to fetch history:', err);
      setError('Falha ao carregar histórico. Tente o upload manual.');
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, lotteryId, lottery, analyzeWithCache]);

  // Fetch latest result
  const fetchLatestResult = useCallback(async (signal: AbortSignal) => {
    if (!apiUrl) return;

    try {
      const response = await fetch(`${apiUrl}/api/lottery/${lotteryId}/latest`, {
        signal
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data?.numbers) {
        setLatestResult({
          draw_number: data.draw_number,
          numbers: data.numbers,
          draw_date: data.draw_date
        });
      }
    } catch (err) {
      // Silently fail for latest result
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.warn('Failed to fetch latest result:', err);
    }
  }, [apiUrl, lotteryId]);

  // Load data on mount or lottery change
  useEffect(() => {
    isMountedRef.current = true;

    // Reset state
    historyLengthRef.current = 0;
    syncRetryCountRef.current = 0;
    setHistory([]);
    setAnalysis(null);
    setLatestResult(null);
    setError(null);
    setIsSyncing(false);

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Check cache first
    const cacheKey = `history_${lotteryId}`;
    const cachedDateKey = `history_${lotteryId}_date`;
    const cachedData = localStorage.getItem(cacheKey);
    const cachedDate = localStorage.getItem(cachedDateKey);

    let loadedFromCache = false;

    if (cachedData && cachedDate && isHistoryCacheValid(cachedDate)) {
      try {
        const rawGames = JSON.parse(cachedData);
        if (Array.isArray(rawGames) && rawGames.length > 0) {
          const isRich = rawGames[0]?.numbers && Array.isArray(rawGames[0].numbers);
          const historyEntries: HistoryEntry[] = isRich
            ? rawGames
            : rawGames.map((g: any) => ({ numbers: g }));

          historyLengthRef.current = historyEntries.length;
          setHistory(historyEntries);

          const stats = analyzeWithCache(historyEntries, lottery);
          setAnalysis(stats);

          loadedFromCache = true;
        }
      } catch (e) {
        console.error('Cache invalid:', e);
      }
    }

    // Fetch from API if available
    if (apiUrl) {
      fetchLatestResult(signal);

      if (!loadedFromCache) {
        fetchHistory(signal);
      }
    }

    // Cleanup
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [lotteryId, apiUrl, lottery, isHistoryCacheValid, analyzeWithCache, fetchHistory, fetchLatestResult]);

  // Manual refetch function
  const refetchHistory = useCallback(async () => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    syncRetryCountRef.current = 0;

    await fetchHistory(abortControllerRef.current.signal);
  }, [fetchHistory]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    history,
    analysis,
    latestResult,
    isLoading,
    loadingMessage,
    isSyncing,
    error,
    refetchHistory,
    clearError
  };
}
