import React from 'react';
import { HistoryAnalysis, NumberStat, BalanceStat, LotteryDefinition, ExtendedHistoryAnalysis } from '../types';
import { BarChart, TrendingUp, TrendingDown, Grid, BarChart2, ArrowRightLeft, Scale, Copy, Repeat, History, Clock } from 'lucide-react';
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

  // Delay Heatmap Logic
  const delayStats = analysis.delayStats;
  const renderDelayHeatmap = () => {
    if (!delayStats || delayStats.length === 0) return null;

    // Detect max delay to show (clamp at 50 to avoid massive tables, or dynamic?)
    // Let's find the max delay that has significant data.
    // Or just use a fixed range like 0-30.
    // For Mega Sena, delay can be 60.
    // Let's simply take the max delay from stats but limit to say 60 for display sanity.
    // If we want to show ALL, we need horizontal scroll.
    const MAX_DISPLAY_DELAY = 60; 
    
    // Calculate global max frequency for heatmap normalization
    let maxFreq = 0;
    delayStats.forEach(ds => {
        if (ds.delayDistribution) {
            (Object.values(ds.delayDistribution) as number[]).forEach(f => {
                if (f > maxFreq) maxFreq = f;
            });
        }
    });

    const getDelayColor = (freq: number) => {
        if (!freq) return 'transparent';
        const opacity = 0.2 + (freq / maxFreq) * 0.8;
        return `rgba(220, 38, 38, ${opacity})`; // Red-ish for delays
    };

    // Sorted by Number natural order (1..N)
    const sortedDelayStats = [...delayStats].sort((a, b) => a.number - b.number);

    return (
        <div className="p-4 md:p-6 border-b border-gray-100">
             <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-red-500" />
                    Mapa de Frequência de Atrasos
                </h3>
                <span className="text-[10px] text-gray-400 md:hidden flex items-center gap-1">
                    <ArrowRightLeft className="w-3 h-3" />
                    Deslize
                </span>
            </div>
            
            <div className="overflow-x-auto pb-2 scrollbar-hide">
                <div className="min-w-[800px] text-[10px]">
                    {/* Header Row */}
                    <div className="flex mb-1">
                        <div className="w-8 shrink-0 font-bold text-gray-400 text-center">Nº</div>
                        {Array.from({ length: MAX_DISPLAY_DELAY + 1 }).map((_, i) => (
                            <div key={i} className="w-6 shrink-0 text-center text-gray-300 font-medium">
                                {i}
                            </div>
                        ))}
                    </div>

                    {/* Data Rows */}
                    {sortedDelayStats.map((stat) => (
                         <div key={stat.number} className="flex items-center hover:bg-gray-50 transition-colors h-6">
                            <div className="w-8 shrink-0 font-bold text-gray-700 text-center border-r border-gray-100">
                                {stat.number}
                            </div>
                            {Array.from({ length: MAX_DISPLAY_DELAY + 1 }).map((_, delayVal) => {
                                const freq = stat.delayDistribution?.[delayVal] || 0;
                                return (
                                    <div 
                                        key={delayVal} 
                                        className="w-6 h-5 flex items-center justify-center relative group shrink-0"
                                        style={{ backgroundColor: getDelayColor(freq) }}
                                    >
                                        {freq > 0 && <span className="opacity-0 group-hover:opacity-100 text-[8px] absolute -top-4 bg-black text-white px-1 rounded z-10">{freq}x</span>}
                                    </div>
                                );
                            })}
                         </div>
                    ))}
                </div>
            </div>
             <p className="text-[10px] text-gray-400 mt-2 italic">
                *O gráfico mostra quantas vezes cada número ficou atrasado por X concursos. Intensidade da cor indica frequência.
            </p>
        </div>
    );
  };

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

      {/* DELAY HEATMAP SECTION */}
      {renderDelayHeatmap()}

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