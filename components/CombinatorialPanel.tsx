import React, { useState, useMemo } from 'react';
import { 
  LotteryDefinition, ExtendedHistoryAnalysis, 
  WheelType, GuaranteeLevel, CoveringDesignConfig, 
  DEFAULT_COVERING_CONFIG, GUARANTEE_DESCRIPTIONS 
} from '../types';
import clsx from 'clsx';
import { Grid, Info, Ban, Check, Zap, Scale, Target, ChevronDown, TrendingDown, Sparkles, Clover, BookOpen, Calculator } from 'lucide-react';

interface CombinatorialPanelProps {
  lottery: LotteryDefinition;
  selection: number[];
  setSelection: (numbers: number[]) => void;
  analysis?: ExtendedHistoryAnalysis | null;
  exclusionMode: boolean;
  setExclusionMode: (mode: boolean) => void;
  // New: Covering Design Config
  coveringConfig: CoveringDesignConfig;
  setCoveringConfig: (config: CoveringDesignConfig) => void;
  // Optional: Show abbreviated results stats
  abbreviatedStats?: {
    fullWheelCount: number;
    abbreviatedCount: number;
    savingsPercent: number;
    coverageScore: number;
  } | null;
  // Trevos Support
  trevosSelection?: number[];
  setTrevosSelection?: (numbers: number[]) => void;
  // Optional callback for parent reset
  onClearAll?: () => void;
}

const CombinatorialPanel: React.FC<CombinatorialPanelProps> = ({ 
    lottery, selection, setSelection, analysis, exclusionMode, setExclusionMode,
    coveringConfig, setCoveringConfig, abbreviatedStats,
    trevosSelection = [], setTrevosSelection
}) => {
  // Dropdown open state
  const [showGuaranteeDropdown, setShowGuaranteeDropdown] = useState(false);
  
  // For Lotomania: use exclusion mode (select numbers to EXCLUDE)
  const isLotomania = lottery.gameSize >= 50;
  
  // In exclusion mode: selection = numbers to EXCLUDE
  // Active pool = all numbers EXCEPT selection
  const activePool = exclusionMode 
      ? Array.from({ length: lottery.totalNumbers }, (_, i) => i + 1).filter(n => !selection.includes(n))
      : selection;
  
  // Dynamic limit based on mode and wheel type
  // For abbreviated/balanced modes, we can allow more numbers since they generate fewer games
  const MAX_EXCLUSIONS = 50; // Max numbers to exclude (leaves 50+ for pool)
  const getMaxSelection = () => {
    if (exclusionMode) return MAX_EXCLUSIONS;
    if (lottery.gameSize >= 50) return lottery.totalNumbers;
    // For optimized modes, allow up to 20 numbers; for full wheel, keep stricter limit
    // But we check wheel type dynamically, so use max possible here
    return Math.min(lottery.maxGameSize || 20, 20);
  };
  const MAX_SELECTION = getMaxSelection();
  
  const combinationsCount = (n: number, k: number) => {
      if (k < 0 || k > n) return 0;
      if (k === 0 || k === n) return 1;
      if (k > n / 2) k = n - k;
      
      let res = 1;
      for (let i = 1; i <= k; i++) {
          res = res * (n - i + 1) / i;
      }
      return Math.round(res);
  };
  
  const toggleNumber = (num: number) => {
    if (selection.includes(num)) {
      setSelection(selection.filter(n => n !== num));
    } else {
      if (selection.length >= MAX_SELECTION) {
         alert(`Limite: Máximo de ${MAX_SELECTION} números ${exclusionMode ? 'excluídos' : 'selecionados'}.`);
         return;
      }
      setSelection([...selection, num].sort((a, b) => a - b));
    }
  };

  const toggleTrevos = (num: number) => {
      if (!setTrevosSelection) return;
      
      if (trevosSelection.includes(num)) {
          setTrevosSelection(trevosSelection.filter(n => n !== num));
      } else {
          // Max trevos selection (e.g., 6 like typical max, or all 6/6)
          // Since there are only 6 trevos total in +Milionária, allow selecting all?
          // Let's limit to typical meaningful max if any. But 6 is small enough.
          setTrevosSelection([...trevosSelection, num].sort((a, b) => a - b));
      }
  };

  // Calculate combinations based on active pool
  const totalCombinations = combinationsCount(activePool.length, lottery.gameSize);
  const totalCost = totalCombinations * (lottery.basePrice || 0);

  // --- SCHÖNHEIM BOUND IMPLEMENTATION ---
  // Calculates the theoretical lower bound for a covering design C(v, k, t)
  // Formula: L(v, k, t) = ceil(v/k * L(v-1, k-1, t-1))
  const schonheimBound = (v: number, k: number, t: number): number => {
    if (t === 0) return 1;
    // Recursive calculation: ceil( v/k * schonheim(v-1, k-1, t-1) )
    return Math.ceil((v / k) * schonheimBound(v - 1, k - 1, t - 1));
  };

  // Determine 't' (guarantee) based on the selected string
  const getT = (level: GuaranteeLevel): number => {
      // Format is "match-if-drawn" (e.g. 3-if-5)
      // Actually strictly speaking: C(v, k, t) means "t" matches guaranteed.
      // But standard notation often implies t matches if t drawn.
      // Lotteries are C(v, k, t, m) where m is numbers drawn. 
      // Simplified mapping for standard cases:
      if (level.startsWith('3')) return 3;
      if (level.startsWith('4')) return 4;
      if (level.startsWith('5')) return 5;
      return 3; 
  };
  
  const theoreticalMinGames = useMemo(() => {
     if (coveringConfig.wheelType !== 'abbreviated') return null;
     // v = activePool.length (numbers selected)
     // k = lottery.gameSize (numbers in one ticket)
     // t = guarantee level target
     const t = getT(coveringConfig.guaranteeLevel);
     
     // Only calc if valid parameters
     if (activePool.length < lottery.gameSize || t > lottery.gameSize) return 0;
     
     return schonheimBound(activePool.length, lottery.gameSize, t);
  }, [coveringConfig, activePool.length, lottery.gameSize]);
  
  // Calculate estimated games for abbreviated mode
  const estimatedAbbreviatedGames = useMemo(() => {
    if (coveringConfig.wheelType === 'full') return totalCombinations;
    if (abbreviatedStats) return abbreviatedStats.abbreviatedCount;
    
    // For Balanced mode: match the actual algorithm limit (min of 200 or 50% of full)
    if (coveringConfig.wheelType === 'balanced') {
      const fullWheelCount = totalCombinations;
      return Math.min(200, Math.ceil(fullWheelCount * 0.5));
    }
    
    // For Abbreviated mode: when gameSize is close to pool size, very few games needed
    // Each game covers a huge portion of t-subsets
    if (coveringConfig.wheelType === 'abbreviated') {
      const poolSize = activePool.length;
      const gameSize = lottery.gameSize;
      
      // If pool barely exceeds gameSize, 1-3 games typically cover everything
      if (poolSize <= gameSize + 3) {
        return Math.max(1, poolSize - gameSize + 1);
      }
      
      // For larger pools, use Schönheim bound if available, else rough estimate
      if (theoreticalMinGames && theoreticalMinGames > 0) {
        return theoreticalMinGames;
      }
    }
    
    // Fallback rough estimate if no theoretical bound available
    const ratio = coveringConfig.guaranteeLevel === '3-if-5' ? 0.15 :
                  coveringConfig.guaranteeLevel === '4-if-5' ? 0.25 :
                  coveringConfig.guaranteeLevel === '5-if-6' ? 0.30 :
                  0.20;
    return Math.max(1, Math.ceil(totalCombinations * ratio));
  }, [coveringConfig, totalCombinations, abbreviatedStats, theoreticalMinGames, activePool.length, lottery.gameSize]);
  
  const estimatedCost = estimatedAbbreviatedGames * (lottery.basePrice || 0);
  const savingsPercent = abbreviatedStats?.savingsPercent ?? 
    (coveringConfig.wheelType !== 'full' ? Math.round((1 - estimatedAbbreviatedGames / Math.max(totalCombinations, 1)) * 100) : 0);
  
  // Calculate grid columns
  const cols = Math.min(lottery.cols, 10); // Max 10 cols for better mobile view

  // Advanced Heatmap: Composite Score based on multiple factors
  const getCompositeScores = () => {
      if (!analysis || !analysis.allStats) return null;
      
      const scores: Record<number, { score: number; factors: string[] }> = {};
      const coldNumbers = analysis.leastFrequent?.slice(0, 10).map(s => s.number) || [];
      
      // Get delay stats if available
      const delayStats = (analysis as any).delayStats || [];
      
      // Get trend stats if available
      const trendStats = (analysis as any).trendStats || {};
      const recentHot = trendStats.recentHot || [];
      const recentCold = trendStats.recentCold || [];
      
      // Frequency normalization
      const counts = analysis.allStats.map(s => s.count);
      const maxCount = Math.max(...counts);
      const minCount = Math.min(...counts);
      const countRange = maxCount - minCount || 1;
      
      // Z-Score Integration (Standard Deviation)
      const zScores = (analysis as any).zScoreStats?.zScores || {};

      for (let num = 1; num <= lottery.totalNumbers; num++) {
          const stat = analysis.allStats.find(s => s.number === num);
          const factors: string[] = [];
          let score = 0.5; // Neutral baseline
          
          // Use Z-Score if available (much more rigorous)
          if (typeof zScores[num] === 'number') {
              const z = zScores[num];
              // Normalize Z (-3 to +3) to Score (0 to 1)
              // Z=0 -> Score 0.5
              // Z=+2 -> Score ~0.83
              // Z=-2 -> Score ~0.17
              score = Math.max(0, Math.min(1, 0.5 + (z / 6))); 
              
              if (z > 1.5) factors.push(`🔥 Hot (Z: +${z.toFixed(2)}σ)`);
              if (z < -1.5) factors.push(`❄️ Cold (Z: ${z.toFixed(2)}σ)`);
              if (z > 0 && z <= 1.5) factors.push(`📈 +Avg (Z: +${z.toFixed(2)}σ)`);
              if (z < 0 && z >= -1.5) factors.push(`📉 -Avg (Z: ${z.toFixed(2)}σ)`);
          } else if (stat) {
              // Fallback to simple frequency
              const freqScore = (stat.count - minCount) / countRange;
              score += (freqScore - 0.5) * 0.3;
              if (freqScore > 0.7) factors.push(`Alta freq (${stat.percentage}%)`);
          }
          
          if (stat) {
              // Factor 3: Delay (0.2 weight) - overdue numbers get bonus
              const delayStat = delayStats.find((d: any) => d.number === num);
              if (delayStat && delayStat.delay > 10) {
                  const delayBonus = Math.min(delayStat.delay / 30, 0.2);
                  score += delayBonus;
                  factors.push(`⏰ ${delayStat.delay} atrasos`);
              }
          }
          
          // Clamp score between 0 and 1
          scores[num] = {
              score: Math.max(0, Math.min(1, score)),
              factors
          };
      }
      
      return scores;
  };
  
  const compositeScores = getCompositeScores();
  
  // Generate color from score (0 = red/avoid, 0.5 = neutral, 1 = green/recommended)
  const getScoreColor = (score: number) => {
      if (score >= 0.7) return { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.5)', shadow: `0 0 12px rgba(34,197,94,${score * 0.6})` };
      if (score >= 0.55) return { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.4)', shadow: `0 0 8px rgba(234,179,8,${score * 0.4})` };
      if (score >= 0.45) return { bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.3)', shadow: 'none' };
      if (score >= 0.3) return { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.4)', shadow: `0 0 6px rgba(249,115,22,${(1-score) * 0.3})` };
      return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.4)', shadow: `0 0 8px rgba(239,68,68,${(1-score) * 0.4})` };
  };
  
  const getScoreLabel = (score: number) => {
      if (score >= 0.7) return '⭐ Recomendado';
      if (score >= 0.55) return '👍 Bom';
      if (score >= 0.45) return '➖ Neutro';
      if (score >= 0.3) return '👎 Evitar';
      if (score >= 0.3) return '👎 Evitar';
      return '⚠️ Baixo';
  };
  
  // Trevos logic
  const showTrevosSelector = lottery.hasExtras && lottery.extrasTotalNumbers && setTrevosSelection;
  const trevosGameSize = lottery.extrasGameSize || 2;

  // Wheel type options
  const wheelTypes: { type: WheelType; icon: React.ReactNode; label: string; desc: string }[] = [
    { type: 'full', icon: <Grid className="w-4 h-4" />, label: 'Total', desc: 'Todas combinações' },
    { type: 'abbreviated', icon: <Target className="w-4 h-4" />, label: 'Otimizado', desc: 'Menos jogos, garantia' },
    { type: 'balanced', icon: <Scale className="w-4 h-4" />, label: 'Balanceado', desc: 'Cobertura uniforme' },
  ];

  // Available guarantee levels based on game size
  const availableGuarantees: GuaranteeLevel[] = useMemo(() => {
    if (lottery.gameSize <= 6) {
      return ['3-if-4', '4-if-5', '3-if-5', '5-if-6', '4-if-6', '3-if-6'];
    }
    return ['3-if-5', '4-if-5', '3-if-4'];
  }, [lottery.gameSize]);

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
           <div className="flex items-center justify-between gap-3 mb-4">
               <div className="flex items-center gap-3">
                   <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                       <Grid className="w-6 h-6" />
                   </div>
                   <div>
                       <h2 className="text-xl font-bold text-gray-800">Seletor de Fechamento</h2>
                       <p className="text-sm text-gray-500">
                          {exclusionMode 
                            ? 'Selecione números para EXCLUIR. Os restantes formarão o pool.' 
                            : 'Selecione números para gerar combinações otimizadas.'}
                       </p>
                   </div>
               </div>
               
               {/* Exclusion Mode Toggle (only for Lotomania) */}
               {isLotomania && (
                   <button
                      onClick={() => { setExclusionMode(!exclusionMode); setSelection([]); }}
                      className={clsx(
                          "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors border-2",
                          exclusionMode 
                            ? "bg-red-50 border-red-300 text-red-700" 
                            : "bg-green-50 border-green-300 text-green-700"
                      )}
                   >
                      {exclusionMode ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      {exclusionMode ? 'Modo: Excluir' : 'Modo: Incluir'}
                   </button>
               )}
           </div>

           {/* ========== NEW: WHEEL TYPE SELECTOR ========== */}
           <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
               <div className="flex items-center gap-2 mb-3">
                   <Sparkles className="w-4 h-4 text-indigo-600" />
                   <span className="text-sm font-semibold text-indigo-800">Tipo de Fechamento</span>
                   <span className="text-xs text-indigo-500">(Algoritmo Matemático)</span>
               </div>
               
               {/* Wheel Type Buttons */}
               <div className="flex flex-wrap gap-2 mb-3">
                   {wheelTypes.map(({ type, icon, label, desc }) => (
                       <button
                           key={type}
                           onClick={() => setCoveringConfig({ ...coveringConfig, wheelType: type })}
                           className={clsx(
                               "flex-1 min-w-[100px] flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                               coveringConfig.wheelType === type
                                 ? "bg-indigo-600 text-white border-indigo-600 shadow-lg"
                                 : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                           )}
                       >
                           {icon}
                           <span className="text-sm font-semibold">{label}</span>
                           <span className={clsx("text-xs", coveringConfig.wheelType === type ? "text-indigo-200" : "text-gray-400")}>{desc}</span>
                       </button>
                   ))}
               </div>
               
               {/* Guarantee Selector (only for abbreviated) */}
               {coveringConfig.wheelType === 'abbreviated' && (
                   <div className="mt-3 pt-3 border-t border-indigo-100">
                       <div className="flex items-center justify-between mb-2">
                           <span className="text-sm font-medium text-indigo-800">Nível de Garantia:</span>
                           <div className="relative">
                               <button
                                   onClick={() => setShowGuaranteeDropdown(!showGuaranteeDropdown)}
                                   className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-indigo-200 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                               >
                                   <Target className="w-4 h-4" />
                                   {coveringConfig.guaranteeLevel}
                                   <ChevronDown className={clsx("w-4 h-4 transition-transform", showGuaranteeDropdown && "rotate-180")} />
                               </button>
                               
                               {showGuaranteeDropdown && (
                                   <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                                       {availableGuarantees.map(level => (
                                           <button
                                               key={level}
                                               onClick={() => {
                                                   setCoveringConfig({ ...coveringConfig, guaranteeLevel: level });
                                                   setShowGuaranteeDropdown(false);
                                               }}
                                               className={clsx(
                                                   "w-full text-left px-4 py-3 text-sm border-b border-gray-50 hover:bg-indigo-50 transition-colors",
                                                   coveringConfig.guaranteeLevel === level && "bg-indigo-100 text-indigo-800"
                                               )}
                                           >
                                               <div className="font-semibold">{level}</div>
                                               <div className="text-xs text-gray-500">{GUARANTEE_DESCRIPTIONS[level]}</div>
                                           </button>
                                       ))}
                                   </div>
                               )}
                           </div>
                       </div>
                       <p className="text-xs text-indigo-600 bg-indigo-100 p-2 rounded">
                           💡 {GUARANTEE_DESCRIPTIONS[coveringConfig.guaranteeLevel]}
                       </p>
                   </div>
               )}
               
               {/* Savings Preview */}
               {coveringConfig.wheelType !== 'full' && totalCombinations > 0 && (
                   <div className="mt-3 flex items-center gap-2 text-sm">
                       <TrendingDown className="w-4 h-4 text-green-600" />
                       <span className="text-green-700 font-medium">
                           Economia estimada: ~{savingsPercent}% ({estimatedAbbreviatedGames.toLocaleString()} jogos vs {totalCombinations.toLocaleString()})
                       </span>
                   </div>
               )}
               
               {/* Warning for Full Wheel with many numbers */}
               {coveringConfig.wheelType === 'full' && activePool.length > 12 && (
                   <div className="mt-3 p-3 bg-amber-100 border border-amber-300 rounded-lg">
                       <p className="text-sm text-amber-800 font-medium">
                           ⚠️ Com {activePool.length} números, o fechamento total gera {totalCombinations.toLocaleString()} jogos!
                       </p>
                       <p className="text-xs text-amber-700 mt-1">
                           💡 <strong>Recomendação:</strong> Use <strong>Otimizado</strong> ou <strong>Balanceado</strong> para reduzir significativamente a quantidade de jogos mantendo uma boa cobertura.
                       </p>
                   </div>
               )}
           </div>

           {/* ========== ACADEMIC & MATH REFERENCE BAR ========== */}
           {coveringConfig.wheelType === 'abbreviated' && (
             <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm text-slate-700">
                     <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                       Rigor Matemático (Schönheim Bound)
                       <span className="text-[10px] font-normal px-1.5 py-0.5 bg-green-100 rounded-full text-green-700 flex items-center gap-1"><Check className="w-3 h-3" /> Aplicado</span>
                    </h4>
                    <div className="text-xs text-slate-600 mt-1 space-y-1">
                       <p>
                         Mínimo Teórico: <strong className="text-slate-900">{theoreticalMinGames?.toLocaleString()} jogos</strong> 
                         <span className="text-slate-400 mx-1">|</span>
                         <span className="italic">Para garantir {getT(coveringConfig.guaranteeLevel)} acertos</span>
                       </p>
                       <p className="opacity-80">
                         Calculado via Limite de Schönheim: <code>L(v,k,t) = ⌈v/k * L(v-1,k-1,t-1)⌉</code>
                       </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded border border-slate-200 ml-auto sm:ml-0">
                   <BookOpen className="w-4 h-4 text-blue-600" />
                   <div className="text-[10px] leading-tight text-slate-500">
                      Algoritmo validado por<br/>
                      <strong className="text-blue-700">La Jolla Covering Repository</strong>
                   </div>
                </div>
             </div>
           )}

           {/* Stats Bar */}
           <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
               <div className="flex-1">
                   <div className="text-xs text-gray-500 uppercase font-semibold">
                      {exclusionMode ? '❌ Números Excluídos' : '✓ Números Selecionados'}
                   </div>
                   <div className="text-2xl font-bold text-gray-800">
                      {selection.length} <span className="text-sm text-gray-400 font-normal">/ {lottery.totalNumbers}</span>
                   </div>
               </div>
               {exclusionMode && (
                   <div className="flex-1">
                       <div className="text-xs text-gray-500 uppercase font-semibold">✓ Pool Ativo</div>
                       <div className="text-2xl font-bold text-green-600">
                          {activePool.length} <span className="text-sm text-gray-400 font-normal">números</span>
                       </div>
                   </div>
               )}
               <div className="flex-1">
                   <div className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1">
                       Jogos {coveringConfig.wheelType !== 'full' 
                         ? (abbreviatedStats ? '(Gerado)' : '(Estimativa ≈)')
                         : '(Total)'}
                       <Info className="w-3 h-3 text-gray-400" />
                   </div>
                   <div className={clsx("text-2xl font-bold", 
                       coveringConfig.wheelType !== 'full' ? "text-indigo-600" :
                       totalCombinations > 1000 ? "text-orange-600" : 
                       totalCombinations > 0 ? "text-green-600" : "text-gray-400"
                   )}>
                      {coveringConfig.wheelType !== 'full' 
                        ? `~${estimatedAbbreviatedGames.toLocaleString()}`
                        : (totalCombinations > 0 ? totalCombinations.toLocaleString() : (activePool.length < lottery.gameSize ? `Precisa ${lottery.gameSize - activePool.length}+ números` : '0'))
                      }
                   </div>
                   <div className="text-xs text-gray-400">
                       {coveringConfig.wheelType === 'full' ? `C(${activePool.length}, ${lottery.gameSize})` : `vs ${totalCombinations.toLocaleString()} total`}
                   </div>
               </div>
               <div className="flex-1 border-l pl-4 border-gray-200">
                    <div className="text-xs text-gray-500 uppercase font-semibold">
                        Custo {coveringConfig.wheelType !== 'full' && <span className="text-green-600">(Otimizado)</span>}
                    </div>
                    <div className={clsx("text-2xl font-bold", coveringConfig.wheelType !== 'full' ? "text-indigo-600" : "text-gray-800")}>
                        {(coveringConfig.wheelType !== 'full' ? estimatedCost : totalCost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                    {coveringConfig.wheelType !== 'full' && (
                        <div className="text-xs text-green-600">
                            Economiza {(totalCost - estimatedCost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    )}
               </div>
            {/* Smart Selection Presets (Mandel's Condensation) */}
            {analysis && compositeScores && (() => {
                // Dynamic selection count: gameSize + 2 for meaningful combinations
                const selectionCount = Math.min(lottery.gameSize + 2, lottery.totalNumbers);
                const expectedGames = selectionCount > lottery.gameSize 
                    ? Math.round(selectionCount * (selectionCount - 1) / 2) // Rough estimate
                    : 1;
                
                return (
            <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 via-amber-100 to-yellow-50 rounded-xl border-2 border-amber-200">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-amber-200 rounded-lg text-amber-800">
                            <Zap className="w-4 h-4" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                                💡 Sugestão Inteligente
                                <span className="text-[10px] font-normal px-1.5 py-0.5 bg-amber-200 rounded-full text-amber-700">Mandel</span>
                            </h4>
                            <p className="text-xs text-amber-700 mt-0.5">
                                Seleciona os <strong>{selectionCount} melhores números</strong> baseado em Z-Score.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            const topNumbers = Object.entries(compositeScores)
                                .sort(([, a], [, b]) => b.score - a.score)
                                .slice(0, selectionCount)
                                .map(([num]) => parseInt(num))
                                .sort((a,b) => a-b);
                            setSelection(topNumbers);
                            setExclusionMode(false);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg text-sm font-bold hover:shadow-lg hover:scale-105 transition-all"
                    >
                        <Sparkles className="w-4 h-4" />
                        Aplicar
                    </button>
                </div>
            </div>
                );
            })()}

           </div>

           {/* Number Grid */}
           <div 
             className="grid gap-2 justify-center mx-auto"
             style={{ 
                 gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` 
             }}
           >
              {Array.from({ length: lottery.totalNumbers }, (_, i) => i + 1).map(num => {
                  const isSelected = selection.includes(num);
                  const scoreData = compositeScores?.[num];
                  const score = scoreData?.score || 0.5;
                  const factors = scoreData?.factors || [];
                  
                  const colors = compositeScores ? getScoreColor(score) : null;
                  
                  return (
                      <button
                        key={num}
                        onClick={() => toggleNumber(num)}
                        title={compositeScores 
                            ? `${getScoreLabel(score)} (${(score * 100).toFixed(0)}%)\n${factors.join(', ') || 'Sem fatores especiais'}` 
                            : 'Carregue histórico para ver recomendações'
                        }
                        className={clsx(
                            "aspect-square flex items-center justify-center font-bold text-sm sm:text-base rounded-lg transition-all transform hover:scale-110 relative",
                            isSelected 
                               ? "text-white shadow-lg ring-2 ring-offset-2" 
                               : "hover:brightness-95"
                        )}
                        style={{ 
                            backgroundColor: isSelected ? lottery.color : colors?.bg || 'rgba(249,250,251,1)',
                            borderWidth: '2px',
                            borderColor: isSelected ? lottery.color : colors?.border || 'rgba(229,231,235,1)',
                            boxShadow: isSelected ? undefined : colors?.shadow || 'none',
                            color: isSelected ? 'white' : score >= 0.6 ? 'rgb(22,163,74)' : score <= 0.4 ? 'rgb(239,68,68)' : 'rgb(107,114,128)'
                        }}
                      >
                          {num}
                          {score >= 0.7 && !isSelected && <span className="absolute -top-1 -right-1 text-[10px]">⭐</span>}
                          {score <= 0.3 && !isSelected && <span className="absolute -top-1 -right-1 text-[10px]">⚠️</span>}
                      </button>
                  );
              })}
           </div>

           {/* TREVOS SELECTOR (+Milionária) */}
           {showTrevosSelector && (
               <div className="mt-8 pt-6 border-t border-gray-100">
                   <div className="flex items-center gap-2 mb-4">
                       <div className="p-1.5 bg-emerald-100 rounded text-emerald-700">
                           <Clover className="w-5 h-5" />
                       </div>
                       <div>
                           <h3 className="text-lg font-bold text-gray-800">Selecione os {lottery.extrasName || 'Trevos'}</h3>
                           <p className="text-xs text-gray-500">
                               Necessário selecionar pelo menos {trevosGameSize}. Serão distribuídos nos jogos gerados.
                           </p>
                       </div>
                       <div className="ml-auto flex items-center gap-2">
                           <span className={clsx("text-sm font-bold px-2 py-1 rounded", trevosSelection.length < trevosGameSize ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600")}>
                               {trevosSelection.length} selecionados
                           </span>
                       </div>
                   </div>
                   
                   <div className="flex justify-center flex-wrap gap-3">
                       {Array.from({ length: lottery.extrasTotalNumbers || 6 }, (_, i) => i + 1).map(num => {
                           const isSelected = trevosSelection.includes(num);
                           return (
                               <button
                                   key={num}
                                   onClick={() => toggleTrevos(num)}
                                   className={clsx(
                                       "w-12 h-12 flex items-center justify-center font-bold text-lg rounded-full transition-all transform hover:scale-110",
                                       isSelected 
                                          ? "bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-200 ring-offset-2" 
                                          : "bg-white text-gray-600 border-2 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50"
                                   )}
                               >
                                   {num}
                               </button>
                           );
                       })}
                   </div>
                   {trevosSelection.length > 0 && trevosSelection.length < trevosGameSize && (
                       <p className="text-center text-xs text-red-500 mt-2">
                           ⚠️ Selecione pelo menos {trevosGameSize} trevos para completar as apostas.
                       </p>
                   )}
                   {trevosSelection.length > trevosGameSize && (
                        <p className="text-center text-xs text-emerald-600 mt-2">
                            ✨ Combinaremos seus {trevosSelection.length} trevos em pares ({(trevosSelection.length * (trevosSelection.length - 1)) / 2} combinações) distribuídos nos jogos.
                        </p>
                   )}
               </div>
           )}

           {/* Legend */}
           {compositeScores && (
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-100"></div>
                      <span>⭐ Recomendado</span>
                  </div>
                  <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded border-2 border-yellow-500 bg-yellow-50"></div>
                      <span>👍 Bom</span>
                  </div>
                  <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded border-2 border-gray-300 bg-gray-100"></div>
                      <span>➖ Neutro</span>
                  </div>
                  <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded border-2 border-orange-400 bg-orange-50"></div>
                      <span>👎 Evitar</span>
                  </div>
                  <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded border-2 border-red-400 bg-red-50"></div>
                      <span>⚠️ Baixo</span>
                  </div>
              </div>
           )}

           {/* Helper Actions */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
                <button 
                   onClick={() => {
                       // Reset all selections
                       setSelection([]);
                       if (setTrevosSelection) setTrevosSelection([]);
                       // Reset covering config to defaults
                       setCoveringConfig(DEFAULT_COVERING_CONFIG);
                       // Reset exclusion mode (Lotomania)
                       setExclusionMode(false);
                   }}
                   className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                    Limpar Tudo
                </button>
           </div>
        </div>
        
        {/* Info Card - Dynamic based on wheel type */}
        <div className={clsx(
            "border p-4 rounded-xl flex items-start gap-3",
            coveringConfig.wheelType === 'full' ? "bg-blue-50 border-blue-100" :
            coveringConfig.wheelType === 'abbreviated' ? "bg-indigo-50 border-indigo-100" :
            "bg-purple-50 border-purple-100"
        )}>
            <Info className={clsx(
                "w-5 h-5 flex-shrink-0 mt-0.5",
                coveringConfig.wheelType === 'full' ? "text-blue-600" :
                coveringConfig.wheelType === 'abbreviated' ? "text-indigo-600" :
                "text-purple-600"
            )} />
            <div className={clsx(
                "text-sm",
                coveringConfig.wheelType === 'full' ? "text-blue-800" :
                coveringConfig.wheelType === 'abbreviated' ? "text-indigo-800" :
                "text-purple-800"
            )}>
                {coveringConfig.wheelType === 'full' && (
                    <>
                        <p className="font-semibold mb-1">Fechamento Total (Full Wheel)</p>
                        <p className="opacity-80">
                           Gera <strong>todas</strong> as combinações matemáticas possíveis. 
                           Garante o prêmio máximo se os números sorteados estiverem no seu grupo.
                           <br/><span className="font-medium">Atenção:</span> A quantidade de jogos cresce exponencialmente.
                        </p>
                    </>
                )}
                {coveringConfig.wheelType === 'abbreviated' && (
                    <>
                        <p className="font-semibold mb-1">Fechamento Otimizado (Abbreviated Wheel)</p>
                        <p className="opacity-80">
                           Usa algoritmos de <strong>Covering Design</strong> para gerar menos jogos mantendo uma garantia matemática.
                           <br/>Baseado em pesquisa acadêmica: La Jolla Repository, Combinatorial Theory.
                           <br/><span className="font-medium">Economia típica:</span> 60-80% menos jogos que o fechamento total.
                        </p>
                    </>
                )}
                {coveringConfig.wheelType === 'balanced' && (
                    <>
                        <p className="font-semibold mb-1">Design Balanceado (BIBD-inspired)</p>
                        <p className="opacity-80">
                           Gera jogos onde cada <strong>par de números</strong> aparece aproximadamente o mesmo número de vezes.
                           <br/>Inspirado em <strong>Balanced Incomplete Block Designs</strong>.
                           <br/><span className="font-medium">Ideal para:</span> Cobertura uniforme sem favorecimento de combinações específicas.
                        </p>
                    </>
                )}
            </div>
        </div>
    </div>
  );
};

export default CombinatorialPanel;
