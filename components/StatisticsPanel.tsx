import React from 'react';
import { HistoryAnalysis, NumberStat, BalanceStat, LotteryDefinition, ExtendedHistoryAnalysis, ExtrasAdvancedStats } from '../types';
import { BarChart, TrendingUp, TrendingDown, Grid, BarChart2, ArrowRightLeft, Scale, Copy, Repeat, History, Clock, Clover, Zap, Timer, Users } from 'lucide-react';
import clsx from 'clsx';


interface StatisticsPanelProps {
  analysis: ExtendedHistoryAnalysis | null;
  lottery: LotteryDefinition;
}

const StatRow: React.FC<{ stat: NumberStat; rank: number; type: 'hot' | 'cold'; color: string }> = ({ stat, rank, type, color }) => (
  <div className="flex items-center justify-between p-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
    <div className="flex items-center gap-3">
      <span 
        className={clsx(
            "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 shadow-sm",
            type === 'cold' && "bg-blue-100 text-blue-700"
        )}
        style={type === 'hot' ? { backgroundColor: color, color: 'white' } : undefined}
      >
        {rank}
      </span>
      <div className="flex items-center gap-2">
        <span className="font-bold text-gray-800 w-6 text-center text-lg">{stat.number.toString().padStart(2, '0')}</span>
      </div>
    </div>
    <div className="text-right">
      <span className="text-sm font-semibold text-gray-700">{stat.percentage}%</span>
      <span className="text-xs text-gray-400 block">({stat.count})</span>
    </div>
  </div>
);

const BalanceRow: React.FC<{ stat: BalanceStat; isMostCommon: boolean; color: string }> = ({ stat, isMostCommon, color }) => (
  <div className={clsx(
    "flex items-center justify-between p-3 border-b border-gray-100 last:border-0",
    isMostCommon ? "bg-gray-50" : "hover:bg-gray-50"
  )}>
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-center">
        <span className="text-sm font-bold" style={{ color: color }}>{stat.hotCount}</span>
        <span className="text-[10px] text-gray-500 uppercase">Quentes</span>
      </div>
      <div className="h-8 w-px bg-gray-200"></div>
      <div className="flex flex-col items-center">
        <span className="text-sm font-bold text-blue-600">{stat.coldCount}</span>
        <span className="text-[10px] text-gray-500 uppercase">Frios</span>
      </div>
    </div>
    <div className="text-right">
      <div className="flex items-center justify-end gap-2">
         <span className={clsx("text-sm font-bold", isMostCommon ? "text-gray-900" : "text-gray-700")}>
           {stat.percentage}%
         </span>
         {isMostCommon && <span className="text-[10px] text-white px-1.5 rounded-sm" style={{ backgroundColor: color }}>Top</span>}
      </div>
      <span className="text-xs text-gray-400 block">{stat.occurrences} jogos</span>
    </div>
  </div>
);

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ analysis, lottery }) => {
  if (!analysis) return null;

  const maxCount = Math.max(...analysis.allStats.map(s => s.count));
  const minCount = Math.min(...analysis.allStats.map(s => s.count));

  const getHeatOpacity = (count: number) => {
     // Return opacity from 0.1 to 1 based on frequency
     if (maxCount === minCount) return 0.5;
     return 0.1 + ((count - minCount) / (maxCount - minCount)) * 0.9;
  };

  // Helper labels based on lottery type
  const getLabel = (type: 'max' | 'mid1' | 'mid2') => {
      const { id, drawSize } = lottery;
      if (type === 'max') {
          if (id === 'megasena') return 'Senas Repetidas';
          if (id === 'quina') return 'Quinas Repetidas';
          if (id === 'lotofacil') return '15 Pontos Repetidos';
          if (id === 'lotomania') return '20 Pontos Repetidos';
          return `${drawSize} Acertos (Repetidos)`;
      }
      if (type === 'mid1') {
          if (id === 'megasena') return 'Quinas Repetidas';
          if (id === 'quina') return 'Quadras Repetidas';
          if (id === 'lotofacil') return '14 Pontos Repetidos';
          if (id === 'lotomania') return '19 Pontos Repetidos';
          return `${drawSize - 1} Acertos (Repetidos)`;
      }
      if (type === 'mid2') {
          if (id === 'megasena') return 'Quadras Repetidas';
          if (id === 'quina') return 'Ternos Repetidos';
          if (id === 'lotofacil') return '13 Pontos Repetidos';
          if (id === 'lotomania') return '18 Pontos Repetidos';
          return `${drawSize - 2} Acertos (Repetidos)`;
      }
      return '';
  };

  // Delay 3D Logic
  const [delay3DData, setDelay3DData] = React.useState<{x: number[], y: number[], z: number[][]} | null>(null);
  const [loading3D, setLoading3D] = React.useState(false);

  React.useEffect(() => {
    const fetch3DData = async () => {
        setLoading3D(true);
        try {
            // Check if API is available (we might be in offline/demo mode)
            // But we can only support 3D map with backend.
            // If offline, maybe skip?
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const res = await fetch(`${apiUrl}/api/stats/delay-3d/${lottery.id}?limit=200`);
            if (res.ok) {
                const data = await res.json();
                if (data.z && data.z.length > 0) {
                    setDelay3DData(data);
                }
            }
        } catch (e) {
            console.error("Failed to fetch 3D data", e);
        } finally {
            setLoading3D(false);
        }
    };
    
    fetch3DData();
  }, [lottery.id]);

  // Dynamic import for Plotly to avoid SSR issues or heavy bundle load if not needed immediately
  // But standard import is fine for client-side React.
  // Using a simple lazy load or just conditional render.
  
  // We need to lazy load Plot component because it depends on window/document
  const Plot = React.useMemo(() => React.lazy(() => import('react-plotly.js')), []);


  // ... (in container component)



  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden animate-fade-in">
      <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
          <BarChart className="w-5 h-5" style={{ color: lottery.color }} />
          Análise Estatística
        </h2>
        <span className="text-xs md:text-sm bg-white px-2 py-1 md:px-3 rounded-full border border-gray-200 shadow-sm text-gray-600">
          Base: <strong>{analysis.totalGames}</strong>
        </span>
      </div>

      {/* Repetition Statistics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 md:p-6 border-b border-gray-100 bg-white">
          <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center justify-center border border-gray-100 hover:shadow-sm transition-shadow">
             <div className="flex items-center gap-2 mb-1 text-gray-500 text-sm font-medium uppercase tracking-wider text-center">
               <Copy className="w-4 h-4 text-purple-500" />
               {getLabel('max')}
             </div>
             <div className="text-2xl font-bold text-gray-800">
               {analysis.repetitionStats.duplicates}
             </div>
             <div className="text-xs text-gray-400">
               Sorteios idênticos
             </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center justify-center border border-gray-100 hover:shadow-sm transition-shadow">
             <div className="flex items-center gap-2 mb-1 text-gray-500 text-sm font-medium uppercase tracking-wider text-center">
               <Repeat className="w-4 h-4 text-blue-500" />
               {getLabel('mid1')}
             </div>
             <div className="text-2xl font-bold text-gray-800">
               {analysis.repetitionStats.nearMiss1}
             </div>
             <div className="text-xs text-gray-400">
               {lottery.drawSize - 1} números em comum
             </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center justify-center border border-gray-100 hover:shadow-sm transition-shadow">
             <div className="flex items-center gap-2 mb-1 text-gray-500 text-sm font-medium uppercase tracking-wider text-center">
               <History className="w-4 h-4 text-green-500" />
               {getLabel('mid2')}
             </div>
             <div className="text-2xl font-bold text-gray-800">
               {analysis.repetitionStats.nearMiss2}
             </div>
             <div className="text-xs text-gray-400">
               {lottery.drawSize - 2} números em comum
             </div>
          </div>
      </div>

      {/* Bar Chart Section */}
      <div className="p-4 md:p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
           <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider">
             <BarChart2 className="w-4 h-4 text-gray-400" />
             Frequência Geral
           </h3>
           <span className="text-[10px] text-gray-400 md:hidden flex items-center gap-1">
             <ArrowRightLeft className="w-3 h-3" />
             Deslize
           </span>
        </div>
        
        <div className="relative h-40 w-full overflow-x-auto overflow-y-hidden pb-2 scrollbar-hide">
          <div className="absolute inset-0 flex items-end gap-[2px] md:gap-1 min-w-[600px] md:min-w-full">
            {analysis.allStats.map((stat) => (
              <div 
                key={stat.number}
                className="flex-1 flex flex-col justify-end group relative hover:opacity-100 transition-opacity"
                style={{ height: '100%' }}
              >
                 <div 
                    className="w-full rounded-t-sm transition-all duration-500 hover:bg-gray-800 relative"
                    style={{ 
                        height: `${(stat.count / maxCount) * 100}%`,
                        backgroundColor: lottery.color,
                        opacity: getHeatOpacity(stat.count)
                    }}
                 >
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-10 pointer-events-none">
                        Bola {stat.number}: {stat.count}x
                    </div>
                 </div>
                 <span className="text-[8px] md:text-[10px] text-gray-400 text-center mt-1 group-hover:text-gray-900 font-medium">
                    {stat.number}
                 </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      
      {/* EXTRAS Statistics Section (Trevos) - Versão Avançada */}
      {lottery.hasExtras && analysis.extrasStats && (
        <div className="p-4 md:p-6 border-b border-gray-100 bg-gradient-to-br from-emerald-50 to-white">
             <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-700 uppercase tracking-wider">
                  <Clover className="w-4 h-4 text-emerald-500" />
                  Análise de {lottery.extrasName || 'Trevos'} (Sorteio Separado)
                </h3>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                  {lottery.extrasGameSize} de {lottery.extrasTotalNumbers}
                </span>
             </div>
             
             {/* Frequência dos Trevos */}
             <div className="mb-6">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Frequência de Cada Trevo</h4>
                <div className="flex gap-3 flex-wrap justify-center sm:justify-start">
                   {analysis.extrasStats.allStats.map(stat => {
                       const isHot = analysis.extrasStats?.hotExtras?.includes(stat.number);
                       const isCold = analysis.extrasStats?.coldExtras?.includes(stat.number);
                       return (
                         <div 
                            key={stat.number} 
                            className={clsx(
                              "flex flex-col items-center p-3 border rounded-lg hover:shadow-sm transition-all min-w-[80px]",
                              isHot && "bg-emerald-50 border-emerald-200",
                              isCold && "bg-blue-50 border-blue-200",
                              !isHot && !isCold && "bg-gray-50 border-gray-100"
                            )}
                         >
                             <span 
                                 className={clsx(
                                   "w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold shadow-sm mb-1 border-2 border-white",
                                   isHot && "bg-emerald-500 text-white",
                                   isCold && "bg-blue-400 text-white",
                                   !isHot && !isCold && "bg-gray-400 text-white"
                                 )}
                             >
                                 {stat.number}
                             </span>
                             <span className="text-sm font-bold text-gray-700">{stat.percentage}%</span>
                             <span className="text-xs text-gray-400">{stat.count}x</span>
                             {isHot && <span className="text-[9px] text-emerald-600 font-medium mt-1">🔥 Quente</span>}
                             {isCold && <span className="text-[9px] text-blue-600 font-medium mt-1">❄️ Frio</span>}
                         </div>
                       );
                   })}
                </div>
             </div>

             {/* Estatísticas Avançadas dos Trevos em Grid */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Atrasos dos Trevos */}
                <div className="bg-white rounded-lg border border-gray-100 p-4">
                   <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase mb-3">
                      <Timer className="w-3 h-3" />
                      Atrasos
                   </h4>
                   <div className="space-y-2">
                      {analysis.extrasStats.delayStats.slice(0, 6).map(d => (
                        <div key={d.number} className="flex items-center justify-between text-sm">
                           <span className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">
                                {d.number}
                              </span>
                              <span className="text-gray-600">Trevo {d.number}</span>
                           </span>
                           <span className={clsx(
                             "font-bold",
                             d.delay >= 5 ? "text-orange-500" : "text-gray-700"
                           )}>
                             {d.delay} sorteios
                           </span>
                        </div>
                      ))}
                   </div>
                   <p className="text-[10px] text-gray-400 mt-2 italic">
                     Média atraso: {analysis.extrasStats.delayStats.reduce((a, b) => a + b.avgDelay, 0) / analysis.extrasStats.delayStats.length > 0 
                       ? (analysis.extrasStats.delayStats.reduce((a, b) => a + b.avgDelay, 0) / analysis.extrasStats.delayStats.length).toFixed(1) 
                       : '0'} sorteios
                   </p>
                </div>

                {/* Pares Mais Frequentes */}
                <div className="bg-white rounded-lg border border-gray-100 p-4">
                   <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase mb-3">
                      <Users className="w-3 h-3" />
                      Pares Mais Frequentes
                   </h4>
                   <div className="space-y-2">
                      {analysis.extrasStats.pairFrequency.slice(0, 5).map((pf, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                           <span className="flex items-center gap-1">
                              <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                                {pf.pair[0]}
                              </span>
                              <span className="text-gray-400">+</span>
                              <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                                {pf.pair[1]}
                              </span>
                           </span>
                           <span className="font-bold text-gray-700">
                             {pf.percentage}% <span className="text-gray-400 font-normal">({pf.count}x)</span>
                           </span>
                        </div>
                      ))}
                   </div>
                   <p className="text-[10px] text-gray-400 mt-2 italic">
                     Top 5 combinações de trevos
                   </p>
                </div>

                {/* Repetição entre Sorteios */}
                <div className="bg-white rounded-lg border border-gray-100 p-4">
                   <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase mb-3">
                      <Repeat className="w-3 h-3" />
                      Repetição entre Sorteios
                   </h4>
                   <div className="space-y-2">
                      {Object.entries(analysis.extrasStats.repeatBetweenDraws.distribution)
                        .sort((a, b) => Number(b[0]) - Number(a[0]))
                        .map(([repeats, count]) => (
                        <div key={repeats} className="flex items-center justify-between text-sm">
                           <span className="text-gray-600">
                             {repeats === '0' ? 'Nenhum repetido' : 
                              repeats === '1' ? '1 trevo repetido' : 
                              `${repeats} trevos repetidos`}
                           </span>
                           <span className="font-bold text-gray-700">
                             {((Number(count) / analysis.totalGames) * 100).toFixed(1)}%
                           </span>
                        </div>
                      ))}
                   </div>
                   <p className="text-[10px] text-gray-400 mt-2 italic">
                     Média: {analysis.extrasStats.repeatBetweenDraws.avgRepeats} trevos repetidos
                   </p>
                </div>
             </div>

             {/* Tendências dos Trevos */}
             {analysis.extrasStats.trendStats && (
               <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                     <h4 className="flex items-center gap-1 text-xs font-semibold text-emerald-700 uppercase mb-2">
                        <TrendingUp className="w-3 h-3" />
                        Trevos em Alta
                     </h4>
                     <div className="flex gap-2">
                        {analysis.extrasStats.trendStats.emerging.map(n => (
                          <span key={n} className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                            {n}
                          </span>
                        ))}
                     </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                     <h4 className="flex items-center gap-1 text-xs font-semibold text-blue-700 uppercase mb-2">
                        <TrendingDown className="w-3 h-3" />
                        Trevos em Baixa
                     </h4>
                     <div className="flex gap-2">
                        {analysis.extrasStats.trendStats.declining.map(n => (
                          <span key={n} className="w-8 h-8 bg-blue-400 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                            {n}
                          </span>
                        ))}
                     </div>
                  </div>
               </div>
             )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Hot/Cold Tables */}
        <div className="p-4 border-b lg:border-b-0 lg:border-r border-gray-100">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
             <TrendingUp className="w-4 h-4 text-green-500" />
             Mais Sorteados & Menos Sorteados
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <span className="text-xs text-gray-400 font-medium block mb-2 text-center">Top 5 Quentes</span>
                    {analysis.mostFrequent.slice(0, 5).map((stat, i) => (
                        <StatRow key={stat.number} stat={stat} rank={i + 1} type="hot" color={lottery.color} />
                    ))}
                </div>
                <div className="space-y-1">
                     <span className="text-xs text-gray-400 font-medium block mb-2 text-center">Top 5 Frias</span>
                    {analysis.leastFrequent.slice(0, 5).map((stat, i) => (
                        <StatRow key={stat.number} stat={stat} rank={i + 1} type="cold" color={lottery.color} />
                    ))}
                </div>
            </div>
        </div>

        {/* Balance Analysis */}
        <div className="p-4">
             <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
             <Scale className="w-4 h-4 text-purple-500" />
             Equilíbrio (Quentes x Frias)
            </h3>
             <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                {analysis.balanceStats.map((stat, i) => (
                    <BalanceRow 
                        key={stat.hotCount} 
                        stat={stat} 
                        isMostCommon={i === 0} 
                        color={lottery.color}
                    />
                ))}
            </div>
             <p className="text-[10px] text-gray-400 mt-2 italic">
                *Mostra quantos números "Quentes" (do Top {analysis.hotNumbers.length}) costumam sair juntos num mesmo sorteio.
            </p>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPanel;