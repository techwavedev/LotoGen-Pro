import React, { useEffect } from 'react';
import { ExtendedFilterConfig, LotteryDefinition } from '../types';

export function useFilterConflicts(
  config: ExtendedFilterConfig,
  setConfig: React.Dispatch<React.SetStateAction<ExtendedFilterConfig>>,
  lottery: LotteryDefinition
) {
  useEffect(() => {
    let hasChanges = false;
    const newConfig = { ...config };

    // --- Helper to fix range (min <= max) ---
    const fixRange = (minKey: keyof ExtendedFilterConfig, maxKey: keyof ExtendedFilterConfig, maxLimit: number) => {
      let minVal = newConfig[minKey] as number;
      let maxVal = newConfig[maxKey] as number;
      let changed = false;

      // 1. Clamp minimal value
      if (minVal < 0) {
        minVal = 0;
        changed = true;
      }
      if (minVal > maxLimit) {
        minVal = maxLimit;
        changed = true;
      }

      // 2. Clamp maximal value
      if (maxVal < 0) {
        maxVal = 0;
        changed = true;
      }
      if (maxVal > maxLimit) {
        maxVal = maxLimit;
        changed = true;
      }

      // 3. Ensure min <= max
      if (minVal > maxVal) {
        // Strategy: bump max up to min, unless max is already at limit, then bump min down
        if (minVal <= maxLimit) {
          maxVal = minVal;
        } else {
          minVal = maxVal;
        }
        changed = true;
      }

      if (changed) {
        (newConfig[minKey] as number) = minVal;
        (newConfig[maxKey] as number) = maxVal;
        hasChanges = true;
      }
    };

    const gameSize = lottery.gameSize;

    // --- 1. Hot/Cold Range ---
    fixRange('minHotNumbers', 'maxHotNumbers', gameSize);

    // --- 2. Sum Range ---
    // Max sum is practically huge, but let's use a safe upper bound logic if needed, 
    // or just ensure min <= max.
    // Theoretical max sum = sum of N largest numbers
    // e.g. Lotofacil (25): 25+24+...+11
    // Let's just ensure logical consistency for now.
    const fixGenericRange = (minKey: keyof ExtendedFilterConfig, maxKey: keyof ExtendedFilterConfig) => {
      if ((newConfig[minKey] as number) > (newConfig[maxKey] as number)) {
        // Adjust max to matches min
        (newConfig[maxKey] as number) = (newConfig[minKey] as number);
        hasChanges = true;
      }
    };
    fixGenericRange('minSum', 'maxSum');

    // --- 3. Repeat Filter ---
    // Repeats possible is up to gameSize
    fixRange('minRepeatsFromLast', 'maxRepeatsFromLast', gameSize);

    // --- 4. Mandel Ranges ---
    // Primes
    fixRange('minPrimes', 'maxPrimes', gameSize);
    
    // Edges
    fixRange('minEdgeNumbers', 'maxEdgeNumbers', gameSize);

    // --- 5. Extras (+Milionária) ---
    if (lottery.hasExtras && lottery.extrasTotalNumbers) {
      const extrasSize = lottery.extrasGameSize || 2; // Usually 2 trevos
      
      // Hot/Cold Extras
      fixRange('minHotExtras', 'maxHotExtras', extrasSize);
      
      // Repeats Extras
      fixRange('minExtrasRepeats', 'maxExtrasRepeats', extrasSize);
    }

    // --- 6. Consecutive Logic ---
    // Can't have more consecutive pairs than gameSize - 1
    if (newConfig.maxConsecutivePairs > gameSize - 1) {
      newConfig.maxConsecutivePairs = gameSize - 1;
      hasChanges = true;
    }
    if (newConfig.maxConsecutivePairs < 0) {
      newConfig.maxConsecutivePairs = 0;
      hasChanges = true;
    }

    // --- Apply changes if any ---
    if (hasChanges) {
      // Use a timeout to avoid update loops in some edge cases or just set immediately
      // Since this is inside useEffect responsive to config, we need to be careful to avoid infinite loops.
      // Ideally we only update if values CHANGED physically.
      // We are comparing primitives, so simple equality check prevents loop if values stabilize.
      
      // Double check to ensure we don't trigger unnecessary re-renders
      const actuallyChanged = Object.keys(newConfig).some(
        (key) => newConfig[key as keyof ExtendedFilterConfig] !== config[key as keyof ExtendedFilterConfig]
      );
      
      if (actuallyChanged) {
        setConfig(newConfig);
      }
    }

  }, [config, lottery, setConfig]);
}
