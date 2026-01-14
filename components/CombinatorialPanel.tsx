import React, { useState } from 'react';
import { LotteryDefinition, ExtendedHistoryAnalysis } from '../types';
import clsx from 'clsx';
import { Grid, MousePointerClick, Info, Flame, Snowflake, Ban, Check } from 'lucide-react';

interface CombinatorialPanelProps {
  lottery: LotteryDefinition;
  selection: number[];
  setSelection: (numbers: number[]) => void;
  analysis?: ExtendedHistoryAnalysis | null;
}

const CombinatorialPanel: React.FC<CombinatorialPanelProps> = ({ lottery, selection, setSelection, analysis }) => {
  // For Lotomania: use exclusion mode (select numbers to EXCLUDE)
  const isLotomania = lottery.gameSize >= 50;
  const [exclusionMode, setExclusionMode] = useState(isLotomania);
  
  // In exclusion mode: selection = numbers to EXCLUDE
  // Active pool = all numbers EXCEPT selection
  const activePool = exclusionMode 
      ? Array.from({ length: lottery.totalNumbers }, (_, i) => i + 1).filter(n => !selection.includes(n))
      : selection;
  
  // Dynamic limit based on mode
  const MAX_EXCLUSIONS = 50; // Max numbers to exclude (leaves 50+ for pool)
  const MAX_SELECTION = exclusionMode
      ? MAX_EXCLUSIONS
      : (lottery.gameSize >= 50 ? lottery.totalNumbers : Math.min(lottery.gameSize + 6, 21));
  
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

  // Calculate combinations based on active pool
  const totalCombinations = combinationsCount(activePool.length, lottery.gameSize);
  const totalCost = totalCombinations * (lottery.basePrice || 0);
  
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
      
      for (let num = 1; num <= lottery.totalNumbers; num++) {
          const stat = analysis.allStats.find(s => s.number === num);
          const factors: string[] = [];
          let score = 0.5; // Neutral baseline
          
          if (stat) {
              // Factor 1: Frequency (0.3 weight) - higher is better
              const freqScore = (stat.count - minCount) / countRange;
              score += (freqScore - 0.5) * 0.3;
              if (freqScore > 0.7) factors.push(`Alta freq (${stat.percentage}%)`);
              
              // Factor 2: Hot/Cold status (0.2 weight)
              if (analysis.hotNumbers.includes(num)) {
                  score += 0.15;
                  factors.push('🔥 Top 10');
              }
              if (coldNumbers.includes(num)) {
                  score -= 0.1;
                  factors.push('❄️ Frio');
              }
              
              // Factor 3: Delay (0.25 weight) - overdue numbers get bonus
              const delayStat = delayStats.find((d: any) => d.number === num);
              if (delayStat && delayStat.delay > 10) {
                  const delayBonus = Math.min(delayStat.delay / 30, 0.25);
                  score += delayBonus;
                  factors.push(`⏰ ${delayStat.delay} sorteios`);
              }
              
              // Factor 4: Recent Trend (0.15 weight)
              if (recentHot.includes(num)) {
                  score += 0.1;
                  factors.push('📈 Tendência');
              }
              if (recentCold.includes(num)) {
                  score -= 0.05;
              }
              
              // Factor 5: Mathematical properties (0.1 weight)
              const isPrime = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97].includes(num);
              const isFibonacci = [1,2,3,5,8,13,21,34,55,89].includes(num);
              const isEdge = num % lottery.cols === 1 || num % lottery.cols === 0;
              
              // Slight bonuses for variety (primes and fibonacci are often recommended)
              if (isPrime) score += 0.02;
              if (isFibonacci) score += 0.02;
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
      return '⚠️ Baixo';
  };

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
                            : 'Selecione números para gerar todas as combinações possíveis.'}
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
                       Jogos Gerados
                       <Info className="w-3 h-3 text-gray-400" />
                   </div>
                   <div className={clsx("text-2xl font-bold", totalCombinations > 1000 ? "text-orange-600" : totalCombinations > 0 ? "text-green-600" : "text-gray-400")}>
                      {totalCombinations > 0 ? totalCombinations.toLocaleString() : (activePool.length < lottery.gameSize ? `Precisa ${lottery.gameSize - activePool.length}+ números` : '0')}
                   </div>
                   <div className="text-xs text-gray-400">
                       C({activePool.length}, {lottery.gameSize})
                   </div>
               </div>
               <div className="flex-1 border-l pl-4 border-gray-200">
                    <div className="text-xs text-gray-500 uppercase font-semibold">Custo Total</div>
                    <div className="text-2xl font-bold text-gray-800">
                        {totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                    <div className="text-xs text-gray-400">
                        {totalCombinations} x {((lottery.basePrice || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
               </div>
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
                  onClick={() => setSelection([])}
                  className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
               >
                   Limpar Seleção
               </button>
           </div>
        </div>
        
        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Como funciona o Fechamento Total?</p>
                <p className="opacity-80">
                   Esta ferramenta gera <strong>todas</strong> as combinações matemáticas possíveis com os números que você selecionou. 
                   Isso garante matematicamente o prêmio máximo se os números sorteados estiverem dentro do seu grupo selecionado.
                   <br/>
                   <span className="text-blue-600 font-medium">Atenção:</span> A quantidade de jogos cresce exponencialmente.
                </p>
            </div>
        </div>
    </div>
  );
};

export default CombinatorialPanel;
