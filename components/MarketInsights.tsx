import React, { memo, useState, useEffect } from 'react';
import { MarketInsight } from '../types';
import { 
  TrendingUp, MapPin, Lightbulb, RefreshCw, 
  ArrowUpRight, ArrowDownRight, Activity, Zap, Search 
} from 'lucide-react';
import { getSparklinePath } from '../utils/chartHelpers';

interface MarketInsightsProps {
  insights: MarketInsight | null;
  isLoading: boolean;
  onRefresh: () => void;
}

// --- Memoized Sub-Components ---

const MarketSpikesSection = () => {
  const [spikes, setSpikes] = useState<{ city: string; increase: string; reason: string; date: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSpikes = () => {
    setLoading(true);
    // Mock data fetch
    setTimeout(() => {
      setSpikes([
        { city: 'Austin, TX', increase: '+45%', reason: 'SXSW Festival', date: '2026-03-15' },
        { city: 'Miami, FL', increase: '+30%', reason: 'Spring Break', date: '2026-03-20' },
        { city: 'Chicago, IL', increase: '+25%', reason: 'Tech Convention', date: '2026-03-25' },
      ]);
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    fetchSpikes();
  }, []);

  return (
    <section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden mt-8">
      <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#FF385C]" />
            Market Spikes
          </h3>
          <p className="text-sm text-gray-500 mt-1">Sudden increases in market demand and trends.</p>
        </div>
        <button onClick={fetchSpikes} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="w-8 h-8 text-[#FF385C] animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {spikes.map((spike, idx) => (
              <div key={idx} className="p-4 border border-gray-100 rounded-2xl bg-gray-50 hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900">{spike.city}</h4>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{spike.increase}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{spike.reason}</p>
                <p className="text-xs text-gray-400 font-medium">{spike.date}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const TrendSparkline = memo(({ growth }: { growth: string }) => {
  if (!growth) return null;
  const cleanGrowth = growth.replace(/[^0-9.-]/g, '');
  const value = parseFloat(cleanGrowth) || 0;
  const isPositive = value > 0;
  const color = isPositive ? '#10b981' : (value < 0 ? '#f43f5e' : '#9ca3af');

  return (
    <svg width="50" height="25" viewBox="0 0 50 25" className="opacity-80" aria-hidden="true">
      <path 
        d={getSparklinePath(growth)} 
        stroke={color} 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        fill="none"
      />
      {isPositive && <circle cx="50" cy="2" r="2" fill={color} />}
    </svg>
  );
});

const KeywordRow = memo(({ item, index }: { item: MarketInsight['trendingKeywords'][0], index: number }) => {
  if (!item) return null;
  const cleanGrowth = item.growth ? item.growth.replace(/[^0-9.-]/g, '') : '0';
  const growthValue = parseFloat(cleanGrowth) || 0;
  const isPositive = growthValue > 0;
  const volume = item.volume || 0;
  
  return (
    <div role="row" className="group flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-all border border-transparent hover:border-gray-100 mb-1">
      <div className="flex items-center gap-4 w-1/3">
        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${index < 3 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
          {index + 1}
        </span>
        <div className="flex flex-col">
            <span className="font-bold text-gray-900 text-sm">{item.keyword}</span>
            {/* Mobile-only volume bar */}
            <div className="lg:hidden mt-1 h-1 w-16 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-400" style={{ width: `${Math.min(volume, 100)}%` }} />
            </div>
        </div>
      </div>

      <div className="hidden lg:block w-1/4 px-4">
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden border border-transparent group-hover:border-gray-200">
          <div 
            className={`h-full transition-all duration-700 ${index === 0 ? 'bg-[#FF385C]' : 'bg-gray-800'}`} 
            style={{ width: `${Math.min(volume, 100)}%` }} 
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-6 w-1/3">
         <div className="text-right">
            <div className={`flex items-center justify-end gap-1 font-bold text-sm ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {item.growth || '0%'}
            </div>
            <span className="text-[10px] text-gray-400 font-medium uppercase">MoM</span>
         </div>
         <div className="hidden sm:block">
            <TrendSparkline growth={item.growth} />
         </div>
      </div>
    </div>
  );
});

const ClusterCard = memo(({ cluster, index }: { cluster: MarketInsight['topClusters'][0], index: number }) => {
  if (!cluster) return null;
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-[#FF385C] border-[#FF385C]';
    if (score >= 75) return 'text-purple-600 border-purple-600';
    return 'text-blue-600 border-blue-600';
  };

  return (
    <div className="relative bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg transition-all group overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-full -mr-4 -mt-4 group-hover:bg-gray-100 transition-colors"></div>

        <div className="relative z-10 flex justify-between items-start">
            <div>
                <div className="flex items-center gap-2 mb-1">
                   <MapPin className={`w-4 h-4 ${index === 0 ? 'text-[#FF385C]' : 'text-gray-400'}`} />
                   <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Opportunity Hub</span>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900">{cluster.city}</h3>
                {cluster.date && <p className="text-xs text-gray-400 font-medium mt-1">{cluster.date}</p>}
                
                <div className="flex flex-wrap gap-2 mt-3">
                    {cluster.tags?.map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold text-gray-600 group-hover:bg-white group-hover:border-gray-200 transition-colors">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            <div className="text-center">
                 {/* Radial Score Placeholder */}
                 <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center ${getScoreColor(cluster.score)} bg-white shadow-sm`}>
                    <span className="text-lg font-black">{cluster.score}</span>
                 </div>
                 <span className="text-[10px] font-bold text-gray-400 uppercase mt-1 block">Demand</span>
            </div>
        </div>
    </div>
  );
});

const LoadingState = () => (
  <div className="h-full flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[#FF385C] rounded-full border-t-transparent animate-spin"></div>
            <Activity className="absolute inset-0 m-auto text-[#FF385C] w-8 h-8 animate-pulse" />
      </div>
      <p className="font-bold text-gray-700 text-lg">Analyzing Market Data...</p>
      <p className="text-gray-500 mt-2 text-sm">Scanning real-time search trends...</p>
    </div>
  </div>
);

const EmptyState = ({ onRefresh }: { onRefresh: () => void }) => (
  <div className="h-full flex items-center justify-center p-8 bg-white">
    <div className="text-center max-w-md">
      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-sm">
          <Zap className="w-8 h-8 fill-current" />
      </div>
      <h3 className="text-xl font-bold text-gray-900">Unlock Intelligence</h3>
      <p className="text-gray-500 mt-2 mb-6">
        Generate a real-time report on keywords, high-demand cities, and seasonal opportunities.
      </p>
      <button 
        onClick={onRefresh} 
        className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold shadow-xl hover:bg-black transition-all flex items-center gap-2 mx-auto transform hover:scale-[1.02] active:scale-[0.98]"
      >
         <RefreshCw className="w-4 h-4" />
         Generate Report
      </button>
    </div>
  </div>
);

// --- Main Component ---

export const MarketInsights: React.FC<MarketInsightsProps> = ({ insights, isLoading, onRefresh }) => {
  if (isLoading) return <LoadingState />;
  if (!insights) return <EmptyState onRefresh={onRefresh} />;

  const hasKeywords = insights.trendingKeywords && insights.trendingKeywords.length > 0;
  const hasClusters = insights.topClusters && insights.topClusters.length > 0;

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50 custom-scrollbar">
      <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-gray-200">
            <div>
                <div className="flex items-center gap-2 text-[#FF385C] mb-1">
                    <Activity className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">Live Intelligence</span>
                </div>
                <h2 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">Market Pulse</h2>
                <p className="text-gray-500 mt-2 text-lg">Real-time demand signals from across the network.</p>
            </div>
            <div className="text-right">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Data Current As Of</p>
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm inline-block">
                    <span className="font-mono font-bold text-gray-700 text-sm">{insights.lastUpdated}</span>
                </div>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Strategy Card */}
             <section className="lg:col-span-1 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[300px]">
                 {/* Decorative Elements */}
                 <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF385C] opacity-[0.08] rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                 <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500 opacity-[0.1] rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

                 <div className="relative z-10">
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mb-6 border border-white/10">
                        <Lightbulb className="w-6 h-6 text-yellow-300" />
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-white">AI Strategy Note</h3>
                    <p className="text-gray-300 leading-relaxed font-medium text-sm lg:text-base">
                        "{insights.seasonalAdvice || 'Analysis pending...'}"
                    </p>
                 </div>
                 
                 <div className="relative z-10 mt-6 pt-6 border-t border-white/10 flex items-center gap-2 text-xs font-medium text-gray-400">
                    <Zap className="w-3 h-3" />
                    Generated via Gemini 3.0 Pro
                 </div>
             </section>

             {/* Top Clusters */}
             <section className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-900 text-lg">Top Opportunity Clusters</h3>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">High Revenue Potential</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hasClusters ? (
                        insights.topClusters.map((cluster, idx) => (
                            <ClusterCard key={cluster.city || idx} cluster={cluster} index={idx} />
                        ))
                    ) : (
                        <div className="col-span-2 p-8 text-center bg-white rounded-2xl border border-dashed border-gray-300 text-gray-400">
                            No cluster data available
                        </div>
                    )}
                </div>
             </section>
        </div>

        {/* Keywords Table */}
        <section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
                 <div>
                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-[#FF385C]" />
                        Trending Keywords
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Search terms with highest velocity this week.</p>
                 </div>
                 <button onClick={onRefresh} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                 </button>
            </div>
            <div className="p-4" role="table">
                 <div className="flex px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-2">
                    <div className="w-1/3">Keyword</div>
                    <div className="hidden lg:block w-1/4 px-4">Volume Share</div>
                    <div className="w-1/3 text-right pr-12">Growth Trend</div>
                 </div>
                 {hasKeywords ? (
                    insights.trendingKeywords.map((item, idx) => (
                        <KeywordRow key={item.keyword || idx} item={item} index={idx} />
                    ))
                 ) : (
                    <div className="p-8 text-center text-gray-400 italic">
                        No trending keywords found.
                    </div>
                 )}
            </div>
        </section>

        {/* Market Spikes Section */}
        <MarketSpikesSection />

      </div>
    </div>
  );
};