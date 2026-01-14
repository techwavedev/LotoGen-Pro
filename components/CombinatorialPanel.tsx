import React from 'react';
import { LotteryDefinition, ExtendedHistoryAnalysis } from '../types';
import clsx from 'clsx';
import { Grid, MousePointerClick, Info, Flame, Snowflake } from 'lucide-react';

interface CombinatorialPanelProps {
  lottery: LotteryDefinition;
  selection: number[];
  setSelection: (numbers: number[]) => void;
  analysis?: ExtendedHistoryAnalysis | null;
}

const CombinatorialPanel: React.FC<CombinatorialPanelProps> = ({ lottery, selection, setSelection, analysis }) => {
  const toggleNumber = (num: number) => {
    if (selection.includes(num)) {
      setSelection(selection.filter(n => n !== num));
    } else {
      if (selection.length >= 21) {
         alert('Limite de seguranca: Máximo de 21 números (para evitar travamento do navegador com >50k combinações).');
         return;
      }
      setSelection([...selection, num].sort((a, b) => a - b));
    }
  };

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

  const totalCombinations = combinationsCount(selection.length, lottery.gameSize);
  const totalCost = totalCombinations * (lottery.basePrice || 0);
  
  // Calculate grid columns
  const cols = Math.min(lottery.cols, 10); // Max 10 cols for better mobile view

  // Heatmap logic
  const getHeatStats = () => {
      if (!analysis || !analysis.allStats) return null;
      const counts = analysis.allStats.map(s => s.count);
      return {
          max: Math.max(...counts),
          min: Math.min(...counts),
          getIntensity: (num: number) => {
              const stat = analysis.allStats.find(s => s.number === num);
              if (!stat) return 0.3;
              const range = Math.max(...counts) - Math.min(...counts);
              if (range === 0) return 0.5;
              return (stat.count - Math.min(...counts)) / range;
          },
          isHot: (num: number) => analysis.hotNumbers.includes(num),
          isCold: (num: number) => analysis.coldNumbers?.includes(num) || false
      };
  };
  const heatStats = getHeatStats();

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
           <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                   <Grid className="w-6 h-6" />
               </div>
               <div>
                   <h2 className="text-xl font-bold text-gray-800">Seletor de Fechamento</h2>
                   <p className="text-sm text-gray-500">Selecione os números para gerar todas as combinações possíveis (Desdobramento Total).</p>
               </div>
           </div>

           {/* Stats Bar */}
           <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
               <div className="flex-1">
                   <div className="text-xs text-gray-500 uppercase font-semibold">Números Selecionados</div>
                   <div className="text-2xl font-bold text-gray-800">
                      {selection.length} <span className="text-sm text-gray-400 font-normal">/ {lottery.totalNumbers}</span>
                   </div>
               </div>
               <div className="flex-1">
                   <div className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1">
                       Jogos Gerados
                       <Info className="w-3 h-3 text-gray-400" />
                   </div>
                   <div className={clsx("text-2xl font-bold", totalCombinations > 1000 ? "text-orange-600" : "text-green-600")}>
                      {totalCombinations.toLocaleString()}
                   </div>
                   <div className="text-xs text-gray-400">
                       Combinacão {lottery.gameSize} a {lottery.gameSize}
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
                  const intensity = heatStats?.getIntensity(num) || 0.3;
                  const isHot = heatStats?.isHot(num);
                  const isCold = heatStats?.isCold(num);
                  
                  // Heatmap shadow: hotter = more intense red shadow, colder = blue tint
                  const heatShadow = heatStats 
                      ? isHot 
                          ? `0 0 ${8 + intensity * 12}px rgba(239,68,68,${0.3 + intensity * 0.5})` 
                          : isCold 
                              ? `0 0 ${6 + intensity * 8}px rgba(59,130,246,${0.2 + intensity * 0.3})`
                              : `0 0 ${4 + intensity * 6}px rgba(0,0,0,${0.05 + intensity * 0.1})`
                      : undefined;
                  
                  return (
                      <button
                        key={num}
                        onClick={() => toggleNumber(num)}
                        title={heatStats ? `Freq: ${(intensity * 100).toFixed(0)}%${isHot ? ' 🔥 Quente' : ''}${isCold ? ' ❄️ Frio' : ''}` : undefined}
                        className={clsx(
                            "aspect-square flex items-center justify-center font-bold text-sm sm:text-base rounded-lg transition-all transform hover:scale-105 relative",
                            isSelected 
                               ? "text-white shadow-md ring-2 ring-offset-2 ring-transparent" 
                               : "hover:bg-gray-100 border border-gray-100",
                            !isSelected && isHot && "text-red-600 bg-red-50 border-red-200",
                            !isSelected && isCold && "text-blue-600 bg-blue-50 border-blue-200",
                            !isSelected && !isHot && !isCold && "bg-gray-50 text-gray-500"
                        )}
                        style={{ 
                            backgroundColor: isSelected ? lottery.color : undefined,
                            boxShadow: !isSelected ? heatShadow : undefined
                        }}
                      >
                          {num}
                          {isHot && !isSelected && <Flame className="absolute -top-1 -right-1 w-3 h-3 text-orange-500" />}
                          {isCold && !isSelected && <Snowflake className="absolute -top-1 -right-1 w-3 h-3 text-blue-400" />}
                      </button>
                  );
              })}
           </div>

           {/* Legend */}
           {heatStats && (
              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span>Quentes (Top 10)</span>
                  </div>
                  <div className="flex items-center gap-1">
                      <Snowflake className="w-4 h-4 text-blue-400" />
                      <span>Frios (Bottom 10)</span>
                  </div>
                  <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-gradient-to-r from-red-200 to-blue-200"></div>
                      <span>Intensidade = Frequência</span>
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
