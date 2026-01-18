import React, { useState } from 'react';
import { LotteryDefinition } from '../types';
import clsx from 'clsx';
import { Info, Ticket, Grid, Zap, X } from 'lucide-react';

export type BetType = 'simple' | 'multiple' | 'surpresinha';

interface BetTypeSelectorProps {
  currentType: BetType;
  onTypeChange: (type: BetType) => void;
  lottery: LotteryDefinition;
  selectedGameSize: number;
  onGameSizeChange: (size: number) => void;
  gamesCount?: number; // Number of games to generate (for total cost)
}

const INFO_CONTENT = {
  simple: {
    title: 'Aposta Simples',
    icon: <Ticket className="w-6 h-6 text-blue-500" />,
    description: 'A modalidade clássica onde você escolhe a quantidade padrão de números (ex: 15 na Lotofácil).',
    details: 'É a aposta de menor custo. Suas chances são as probabilidades base da loteria. Ideal para quem quer jogar pouco dinheiro com frequência.',
    pros: ['Menor custo', 'Fácil de gerenciar', 'Permite fazer mais jogos diferentes'],
    cons: ['Menor probabilidade por bilhete']
  },
  multiple: {
    title: 'Aposta Múltipla (Bolão)',
    icon: <Grid className="w-6 h-6 text-purple-500" />,
    description: 'Jogue com mais números no mesmo bilhete (ex: 16, 17, 18...).',
    details: 'Ao marcar mais números, você está matematicamente fazendo várias apostas simples combinadas. O custo sobe exponencialmente, mas as chances de ganhar aumentam drasticamente. Se acertar, você ganha múltiplos prêmios (principal + faixas menores).',
    pros: ['Maior chance de acerto', 'Prêmios multiplicados', 'Ideal para Bolões'],
    cons: ['Custo elevado']
  },
  surpresinha: {
    title: 'Surpresinha',
    icon: <Zap className="w-6 h-6 text-amber-500" />,
    description: 'O sistema escolhe os números aleatoriamente para você.',
    details: 'Ideal para quem não quer analisar estatísticas ou tem pressa. Na nossa versão, ainda aplicamos filtros de segurança básicos para evitar combinações absurdas (como 1,2,3,4,5...), mas é focado em rapidez.',
    pros: ['Rápido e prático', 'Sem viés de escolha'],
    cons: ['Ignora estratégias avançadas']
  }
};

const BetTypeSelector: React.FC<BetTypeSelectorProps> = ({ 
  currentType, 
  onTypeChange, 
  lottery,
  selectedGameSize,
  onGameSizeChange,
  gamesCount = 1
}) => {
  const [modalInfo, setModalInfo] = useState<keyof typeof INFO_CONTENT | null>(null);

  const OPTIONS: { id: BetType; label: string; icon: React.ReactNode }[] = [
    { id: 'simple', label: 'Simples', icon: <Ticket className="w-5 h-5" /> },
    { id: 'multiple', label: 'Múltipla', icon: <Grid className="w-5 h-5" /> },
    { id: 'surpresinha', label: 'Surpresinha', icon: <Zap className="w-5 h-5" /> }
  ];

  return (
    <div className="mb-6 animate-fade-in">
      {/* Selector Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
        {OPTIONS.map((opt) => {
           const isActive = currentType === opt.id;
           return (
             <div 
               key={opt.id}
               className={clsx(
                 "relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all",
                 isActive 
                   ? "border-current bg-white shadow-md transform scale-105" 
                   : "border-transparent bg-gray-100 hover:bg-gray-200 text-gray-500"
               )}
               style={{ 
                 borderColor: isActive ? lottery.color : 'transparent',
                 color: isActive ? lottery.color : undefined
               }}
               onClick={() => onTypeChange(opt.id)}
             >
                <div className="mb-2">{opt.icon}</div>
                <span className="text-xs sm:text-sm font-bold text-center leading-tight">{opt.label}</span>
                
                {/* Info Icon */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalInfo(opt.id);
                  }}
                  className="absolute top-1 right-1 p-1 opacity-50 hover:opacity-100 transition-opacity"
                  title="Saiba mais"
                >
                  <Info className="w-4 h-4" />
                </button>
             </div>
           );
        })}
      </div>

      {/* Multiple Bet Size Selector */}
      {currentType === 'multiple' && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm animate-slide-up">
           <label className="block text-sm font-semibold text-gray-700 mb-2">
             Quantos números por jogo?
           </label>
           <div className="flex flex-wrap gap-2 mb-3">
             {Array.from({ length: lottery.maxGameSize - lottery.gameSize }, (_, i) => lottery.gameSize + i + 1).map(size => (
               <button
                 key={size}
                 onClick={() => onGameSizeChange(size)}
                 className={clsx(
                   "px-4 py-2 rounded-lg font-bold text-sm transition-colors border",
                   selectedGameSize === size 
                     ? "text-white border-transparent shadow-sm" 
                     : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                 )}
                 style={{ backgroundColor: selectedGameSize === size ? lottery.color : undefined }}
               >
                 {size}
               </button>
             ))}
           </div>
           
           {/* Price Calculation */}
           {(() => {
               // Combinations formula: n! / (k! * (n-k)!)
               // But usually we just need to know how many "simple bets" it represents.
               const combinations = (n: number, k: number) => {
                  let res = 1;
                  for(let i=1; i<=k; i++) res = res * (n - i + 1) / i;
                  return Math.round(res); // Combinations of 'n' taken 'k' (lottery.gameSize) at a time? 
                  // Wait. Multiple bet logic:
                  // You pick 'selectedGameSize' numbers. The official game size is 'lottery.gameSize'.
                  // The number of bets is C(selectedGameSize, lottery.gameSize).
               };
               
               const combos = combinations(selectedGameSize, lottery.gameSize);
               const totalCost = combos * (lottery.basePrice || 0);

               return (
                   <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex-1">
                            <span className="text-xs text-gray-500 uppercase font-bold">Equivalente a</span>
                            <div className="font-bold text-gray-800">{combos} apostas simples</div>
                        </div>
                        <div className="flex-1 border-l pl-3 border-gray-200">
                             <span className="text-xs text-gray-500 uppercase font-bold">Custo Estimado</span>
                             <div className="font-bold text-green-600 text-lg">
                                {totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                             </div>
                        </div>
                   </div>
               );
           })()}

           <p className="text-xs text-gray-500 mt-2">
             <Info className="w-3 h-3 inline mr-1" />
             O custo sobe porque você combina matematicamente mais jogos.
           </p>
        </div>
      )}

      {/* Info Modal */}
      {modalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setModalInfo(null)}>
           <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setModalInfo(null)}
                className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
              
              <div className="flex flex-col items-center text-center">
                 <div className="p-4 bg-gray-50 rounded-full mb-4">
                    {INFO_CONTENT[modalInfo].icon}
                 </div>
                 <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {INFO_CONTENT[modalInfo].title}
                 </h3>
                 <p className="text-gray-600 font-medium mb-4">
                    {INFO_CONTENT[modalInfo].description}
                 </p>
                 <div className="text-sm text-gray-500 text-left bg-gray-50 p-4 rounded-xl w-full space-y-3">
                    <p>{INFO_CONTENT[modalInfo].details}</p>
                    <div>
                      <span className="font-bold text-green-600 block mb-1">Vantagens:</span>
                      <ul className="list-disc list-inside space-y-0.5">
                        {INFO_CONTENT[modalInfo].pros.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                    <div>
                      <span className="font-bold text-red-500 block mb-1">Desvantagens:</span>
                      <ul className="list-disc list-inside space-y-0.5">
                        {INFO_CONTENT[modalInfo].cons.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                 </div>
              </div>
              
              <button 
                onClick={() => setModalInfo(null)}
                className="w-full mt-6 py-3 rounded-xl font-bold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: lottery.color }}
              >
                Entendi
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default BetTypeSelector;
