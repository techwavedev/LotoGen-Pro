import React, { useState } from 'react';
import { X, Eye, AlertTriangle, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';

interface FilterExamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXAMPLES = [
  {
    id: 'sequences',
    label: 'Sequência Total',
    desc: 'Jogos onde todos os 15 números são consecutivos (ex: 1 ao 15).',
    numbers: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
    highlight: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]
  },
  {
    id: 'fullLines',
    label: 'Linha Cheia',
    desc: 'Bloqueia qualquer jogo que complete uma linha inteira (5 números na mesma linha).',
    numbers: [1,2,3,4,5, 7, 9, 12, 14, 17, 19, 21, 23, 25],
    highlight: [1,2,3,4,5]
  },
  {
    id: 'fullCols',
    label: 'Coluna Cheia',
    desc: 'Bloqueia jogos com colunas completas (5 números na mesma coluna).',
    numbers: [1,6,11,16,21, 3, 5, 8, 12, 14, 18, 19, 23, 25],
    highlight: [1,6,11,16,21]
  },
  {
    id: 'altLines',
    label: 'Linhas Alternadas',
    desc: 'Jogos formados exatamente pelas 3 linhas alternadas completas (Linhas 1, 3 e 5, ou 2 e 4).',
    numbers: [1,2,3,4,5, 11,12,13,14,15, 21,22,23,24,25],
    highlight: [1,2,3,4,5, 11,12,13,14,15, 21,22,23,24,25]
  },
  {
    id: 'altCols',
    label: 'Colunas Alternadas',
    desc: 'Jogos formados exatamente pelas 3 colunas alternadas completas (Colunas 1, 3 e 5).',
    numbers: [1,6,11,16,21, 3,8,13,18,23, 5,10,15,20,25],
    highlight: [1,6,11,16,21, 3,8,13,18,23, 5,10,15,20,25]
  }
];

const FilterExamplesModal: React.FC<FilterExamplesModalProps> = ({ isOpen, onClose }) => {
  const [selectedExample, setSelectedExample] = useState(EXAMPLES[0]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-0 md:p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white md:rounded-xl shadow-2xl w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] overflow-hidden flex flex-col md:flex-row">
        
        {/* Mobile Header with Close */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Eye className="w-5 h-5 text-loto-purple" />
            Visualizar Filtros
          </h3>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full active:bg-gray-200">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Sidebar (List of filters) */}
        <div className="w-full md:w-1/3 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 p-2 md:p-4 flex flex-col max-h-[35vh] md:max-h-full overflow-y-auto">
          <div className="hidden md:block mb-4">
             <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
               <Eye className="w-5 h-5 text-loto-purple" />
               Visualizar Filtros
             </h3>
             <p className="text-xs text-gray-500 mt-1">
               Selecione um filtro para ver o padrão que ele exclui.
             </p>
          </div>
          
          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 px-2 md:px-0 scrollbar-hide">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.id}
                onClick={() => setSelectedExample(ex)}
                className={clsx(
                  "flex-shrink-0 md:w-full text-left px-4 py-2 md:py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap md:whitespace-normal border",
                  selectedExample.id === ex.id
                    ? "bg-loto-purple text-white shadow-md border-loto-purple"
                    : "bg-white text-gray-700 hover:bg-purple-50 border-gray-200"
                )}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 md:p-6 relative flex flex-col overflow-y-auto bg-white">
          {/* Desktop Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors hidden md:block"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="mb-4 md:mb-6 pr-0 md:pr-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">{selectedExample.label}</h2>
            <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{selectedExample.desc}</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-start md:justify-center bg-gray-50 rounded-xl p-4 md:p-8 border border-gray-100 min-h-[300px]">
             <div className="grid grid-cols-5 gap-2 md:gap-3">
               {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => {
                 const isSelected = selectedExample.numbers.includes(num);
                 const isHighlighted = selectedExample.highlight.includes(num);
                 
                 return (
                   <div 
                     key={num}
                     className={clsx(
                       "w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full text-sm md:text-base font-bold shadow-sm transition-all",
                       isHighlighted 
                         ? "bg-red-500 text-white ring-2 ring-red-300 ring-offset-2 md:scale-110 z-10"
                         : isSelected 
                            ? "bg-loto-purple/20 text-loto-purple border border-loto-purple/30"
                            : "bg-white text-gray-300 border border-gray-100"
                     )}
                   >
                     {num.toString().padStart(2, '0')}
                   </div>
                 );
               })}
             </div>
             <div className="mt-6 flex flex-wrap justify-center items-center gap-4 text-xs md:text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full"></div>
                  <span>Padrão Excluído</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 md:w-4 md:h-4 bg-loto-purple/20 border border-loto-purple/30 rounded-full"></div>
                  <span>Outros</span>
                </div>
             </div>
          </div>

          <button 
            onClick={onClose}
            className="md:hidden mt-6 w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-bold border border-gray-300 active:bg-gray-200"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterExamplesModal;