import React, { useState } from 'react';
import { Clover, Copy, Check } from 'lucide-react';
import { Game, LotteryDefinition } from '../types';
import clsx from 'clsx';

interface GameTicketProps {
  game: Game;
  index: number;
  lottery: LotteryDefinition;
}

const GameTicket: React.FC<GameTicketProps> = ({ game, index, lottery }) => {
  const [copied, setCopied] = useState(false);

  // Format game for Caixa app - numbers only, padded
  const formatGameForCaixa = () => {
    // Main numbers (exclude extras which are > 100)
    const mainNumbers = game
      .filter(n => n <= lottery.totalNumbers)
      .sort((a, b) => a - b)
      .map(n => n.toString().padStart(2, '0'))
      .join(' ');

    // Extras (Trevos) for +Milionária
    if (lottery.hasExtras) {
      const offset = lottery.extrasOffset || 100;
      const extras = game
        .filter(n => n > offset)
        .map(n => n - offset)
        .sort((a, b) => a - b)
        .join(' ');
      
      if (extras) {
        return `${mainNumbers} | ${lottery.extrasName || 'Trevos'}: ${extras}`;
      }
    }
    
    return mainNumbers;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatGameForCaixa());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  // Generate numbers based on lottery total
  const allNumbers = Array.from({ length: lottery.totalNumbers }, (_, i) => i + 1);
  
  // Use visualCols for the UI layout (matches mobile apps), fallback to logic cols if undefined
  const columns = lottery.visualCols || lottery.cols;
  
  const gridStyle = {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
  };

  // Determine styling based on density
  // With 5 columns, we generally have more space horizontally, but vertical height grows
  const isCompact = columns > 5; // Use compact mode only if we are forced to show many columns
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
           <span className="bg-gray-100 text-gray-600 w-6 h-6 flex items-center justify-center rounded text-xs">
             {index + 1}
           </span>
           Palpite
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className={clsx(
              "p-1.5 rounded-lg transition-all text-xs flex items-center gap-1",
              copied 
                ? "bg-green-100 text-green-600" 
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
            )}
            title="Copiar para usar no app Caixa"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
          <span 
              className="text-[10px] text-white px-2 py-1 rounded-full font-bold uppercase tracking-wider"
              style={{ backgroundColor: lottery.color }}
          >
            {lottery.gameSize} Dezenas
          </span>
        </div>
      </div>
      
      <div 
        className={clsx(
            "grid mx-auto",
            isCompact ? "gap-1" : "gap-2"
        )}
        style={gridStyle}
      >
        {allNumbers.map((num) => {
          const isSelected = game.includes(num);
          
          // Lotomania display fix: 100 becomes 00
          const displayNum = (lottery.id === 'lotomania' && num === 100) 
            ? '00' 
            : num.toString().padStart(2, '0');

          return (
            <div
              key={num}
              className={clsx(
                "flex items-center justify-center rounded-full font-bold transition-all select-none border",
                // Size adjustment
                isCompact 
                    ? "w-6 h-6 text-[9px] sm:w-7 sm:h-7 sm:text-[10px]" 
                    : "w-8 h-8 text-xs sm:w-10 sm:h-10 sm:text-sm", 
                isSelected
                  ? "text-white shadow-sm border-transparent transform scale-105"
                  : "bg-white text-gray-400 border-gray-100"
              )}
              style={isSelected ? { backgroundColor: lottery.color } : undefined}
            >
              {displayNum}
            </div>
          );
        })}
      </div>

      {/* Extras / Trevos Section */}
      {lottery.hasExtras && (
        <div className="mt-3 pt-2 border-t border-dashed border-gray-200">
           <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center justify-center gap-1">
              <Clover className="w-3 h-3" /> {lottery.extrasName || 'Trevos'}
           </h4>
           <div className="flex gap-2 justify-center flex-wrap">
              {Array.from({ length: lottery.extrasTotalNumbers || 6 }, (_, i) => i + 1).map((num) => {
                 const offset = lottery.extrasOffset || 100;
                 const isSelected = game.includes(num + offset);
                 return (
                    <div
                      key={num}
                      className={clsx(
                        "flex items-center justify-center rounded-full font-bold transition-all select-none border w-8 h-8 text-xs",
                        isSelected
                          ? "text-white shadow-sm border-transparent transform scale-110"
                          : "bg-gray-50 text-gray-400 border-gray-100"
                      )}
                      style={isSelected ? { backgroundColor: lottery.color } : undefined}
                    >
                      {num}
                    </div>
                 );
              })}
           </div>
        </div>
      )}
      
      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500 font-medium">
        <div className="flex gap-3">
            <span>Pares: <strong className="text-gray-700">
                {game.filter(n => (n <= lottery.totalNumbers) && n % 2 === 0).length}
            </strong></span>
            <span>Ímpares: <strong className="text-gray-700">
                {game.filter(n => (n <= lottery.totalNumbers) && n % 2 !== 0).length}
            </strong></span>
        </div>
        <span className="text-gray-400">Soma: {game.filter(n => n <= lottery.totalNumbers).reduce((a,b) => a+b, 0)}</span>
      </div>
    </div>
  );
};

export default GameTicket;