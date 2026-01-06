import React from 'react';
import { FilterConfig, LotteryDefinition } from '../types';
import { AlertTriangle, CheckCircle, Ban, Eye, Scale, Flame, Snowflake } from 'lucide-react';
import clsx from 'clsx';

interface SettingsPanelProps {
  config: FilterConfig;
  setConfig: React.Dispatch<React.SetStateAction<FilterConfig>>;
  historyCount: number;
  onOpenExamples: () => void;
  lottery: LotteryDefinition;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, setConfig, historyCount, onOpenExamples, lottery }) => {
  const toggle = (key: keyof FilterConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setNumber = (key: keyof FilterConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const hasHistory = historyCount > 0;
  const isLotofacil = lottery.id === 'lotofacil';

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Ban className="w-5 h-5 text-red-500" />
          Configuração de Filtros
        </h2>
        <button 
          onClick={onOpenExamples}
          className="text-sm flex items-center gap-1.5 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors font-medium"
          style={{ color: lottery.color }}
        >
          <Eye className="w-4 h-4" />
          Visualizar Exemplos
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Historical Filters */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Histórico (Proximidade)</h3>
          {hasHistory ? (
             <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.exclude15Hits} 
                  onChange={() => toggle('exclude15Hits')}
                  className="w-5 h-5 rounded focus:ring-offset-0"
                  style={{ color: lottery.color }}
                />
                <span className="text-gray-700">Evitar {lottery.gameSize} acertos (Repetição)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.exclude14Hits} 
                  onChange={() => toggle('exclude14Hits')}
                  className="w-5 h-5 rounded"
                  style={{ color: lottery.color }}
                />
                <span className="text-gray-700">Evitar {lottery.gameSize - 1} acertos anteriores</span>
              </label>

               <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={config.exclude13Hits} 
                  onChange={() => toggle('exclude13Hits')}
                  className="w-5 h-5 rounded"
                  style={{ color: lottery.color }}
                />
                <span className="text-gray-700">Evitar {lottery.gameSize - 2} acertos anteriores</span>
              </label>
              
               {lottery.gameSize <= 20 && (
                <div className="pt-2 border-t border-gray-200 mt-2">
                    <p className="text-xs text-gray-500 mb-2">Filtros Avançados (Mais lento)</p>
                    <label className="flex items-center gap-3 cursor-pointer mb-2">
                    <input 
                        type="checkbox" 
                        checked={config.exclude12Hits} 
                        onChange={() => toggle('exclude12Hits')}
                        className="w-5 h-5 text-gray-400 rounded focus:ring-gray-500"
                    />
                    <span className="text-gray-600 text-sm">Evitar {lottery.gameSize - 3} acertos</span>
                    </label>
                </div>
               )}
             </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-2 rounded">
              <AlertTriangle className="w-4 h-4" />
              Carregue o histórico primeiro.
            </div>
          )}
        </div>

        {/* Pattern Filters */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Padrões Básicos</h3>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={config.excludeSequences} 
              onChange={() => toggle('excludeSequences')}
              className="w-5 h-5 rounded"
              style={{ color: lottery.color }}
            />
            <span className="text-gray-700">Bloquear Sequência Total</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={config.excludeAllEven} 
              onChange={() => toggle('excludeAllEven')}
              className="w-5 h-5 rounded"
              style={{ color: lottery.color }}
            />
            <span className="text-gray-700">Bloquear Todos Pares</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={config.excludeAllOdd} 
              onChange={() => toggle('excludeAllOdd')}
              className="w-5 h-5 rounded"
              style={{ color: lottery.color }}
            />
            <span className="text-gray-700">Bloquear Todos Ímpares</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={config.excludeAllPrimes} 
              onChange={() => toggle('excludeAllPrimes')}
              className="w-5 h-5 rounded"
              style={{ color: lottery.color }}
            />
            <span className="text-gray-700">Bloquear Todos Primos</span>
          </label>
        </div>

        {/* Geometric Filters */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Geometria (Volante)</h3>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={config.excludeFullLines} 
              onChange={() => toggle('excludeFullLines')}
              className="w-5 h-5 rounded"
              style={{ color: lottery.color }}
            />
            <span className="text-gray-700">Bloquear Linha Cheia</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={config.excludeFullColumns} 
              onChange={() => toggle('excludeFullColumns')}
              className="w-5 h-5 rounded"
              style={{ color: lottery.color }}
            />
            <span className="text-gray-700">Bloquear Coluna Cheia</span>
          </label>

          {isLotofacil && (
              <>
                <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                    type="checkbox" 
                    checked={config.excludeAlternatingLines} 
                    onChange={() => toggle('excludeAlternatingLines')}
                    className="w-5 h-5 rounded"
                    style={{ color: lottery.color }}
                    />
                    <span className="text-gray-700">Bloquear Linhas Alternadas</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                    type="checkbox" 
                    checked={config.excludeAlternatingColumns} 
                    onChange={() => toggle('excludeAlternatingColumns')}
                    className="w-5 h-5 rounded"
                    style={{ color: lottery.color }}
                    />
                    <span className="text-gray-700">Bloquear Colunas Alternadas</span>
                </label>
              </>
          )}
        </div>

        {/* Hot Numbers Strategy */}
        <div 
            className="space-y-3 p-4 rounded-lg md:col-span-2 lg:col-span-3 border"
            style={{ backgroundColor: `${lottery.color}0D`, borderColor: `${lottery.color}33` }} // 0D = 5% opacity, 33 = 20%
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: lottery.color }}>
              <Flame className="w-4 h-4" />
              Estratégia de Quentes x Frias
            </h3>
             <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                <input 
                  type="checkbox" 
                  checked={config.useHotColdFilter} 
                  onChange={() => toggle('useHotColdFilter')}
                  className="w-4 h-4 rounded"
                  style={{ color: lottery.color }}
                />
                <span className="text-sm font-medium text-gray-700">Ativar Filtro</span>
              </label>
          </div>
          
          <div className={clsx("grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 transition-opacity", !config.useHotColdFilter && "opacity-50 pointer-events-none")}>
            <p className="text-sm text-gray-600 sm:col-span-2">
              Define quantos números do grupo dos "Top 12 mais sorteados" devem aparecer em cada jogo gerado.
              <br/>
              <span className="text-xs text-gray-500">
                Recomendado para {lottery.name}: entre {Math.max(0, Math.floor(lottery.gameSize * 0.4))} e {Math.floor(lottery.gameSize * 0.7)}.
              </span>
            </p>

            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
               <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Mínimo de Quentes:</span>
               <input 
                type="number" 
                min="0" 
                max={lottery.gameSize}
                value={config.minHotNumbers}
                onChange={(e) => setNumber('minHotNumbers', parseInt(e.target.value))}
                className="w-full bg-white text-gray-900 border border-gray-300 rounded px-2 py-1 font-bold focus:ring-2 outline-none"
                style={{ caretColor: lottery.color }}
               />
            </div>

            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
               <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Máximo de Quentes:</span>
               <input 
                type="number" 
                min="0" 
                max={lottery.gameSize}
                value={config.maxHotNumbers}
                onChange={(e) => setNumber('maxHotNumbers', parseInt(e.target.value))}
                className="w-full bg-white text-gray-900 border border-gray-300 rounded px-2 py-1 font-bold focus:ring-2 outline-none"
                style={{ caretColor: lottery.color }}
               />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;