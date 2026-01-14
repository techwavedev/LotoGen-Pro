import React from 'react';
import { LotteryDefinition } from '../types';
import clsx from 'clsx';
import { Grid, MousePointerClick, Info } from 'lucide-react';

interface CombinatorialPanelProps {
  lottery: LotteryDefinition;
  selection: number[];
  setSelection: (numbers: number[]) => void;
}

const CombinatorialPanel: React.FC<CombinatorialPanelProps> = ({ lottery, selection, setSelection }) => {
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
                  return (
                      <button
                        key={num}
                        onClick={() => toggleNumber(num)}
                        className={clsx(
                            "aspect-square flex items-center justify-center font-bold text-sm sm:text-base rounded-lg transition-all transform hover:scale-105",
                            isSelected 
                               ? "text-white shadow-md ring-2 ring-offset-2 ring-transparent" 
                               : "bg-gray-50 text-gray-400 hover:bg-gray-100 border border-gray-100"
                        )}
                        style={{ 
                            backgroundColor: isSelected ? lottery.color : undefined,
                        }}
                      >
                          {num}
                      </button>
                  );
              })}
           </div>

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
