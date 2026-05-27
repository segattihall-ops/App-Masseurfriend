import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, TrendingUp, Search, Loader2, AlertCircle, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { generateMarketSpikes } from '../services/geminiService';
import { MarketSpike } from '../types';

export const MarketSpikes: React.FC = () => {
  const [days, setDays] = useState(7);
  const [location, setLocation] = useState('');
  const [spikes, setSpikes] = useState<MarketSpike[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(new Date());

  const fetchSpikes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await generateMarketSpikes(location, days);
      setSpikes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch market spikes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpikes();
  }, []);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    const monthName = viewDate.toLocaleString('default', { month: 'long' });

    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="h-24 sm:h-32 border-b border-r border-gray-100 bg-gray-50/30" />);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const daySpikes = spikes.find(s => s.date.startsWith(dateStr));

      calendarDays.push(
        <div key={day} className="h-24 sm:h-32 border-b border-r border-gray-100 p-1 sm:p-2 overflow-y-auto no-scrollbar hover:bg-gray-50 transition-colors">
          <span className="text-[10px] sm:text-xs font-bold text-gray-400">{day}</span>
          <div className="mt-1 space-y-1">
            {daySpikes?.cities.map((city, idx) => (
              <div 
                key={idx} 
                className={`p-1 rounded text-[8px] sm:text-[10px] font-bold truncate cursor-help
                  ${city.intensity === 'high' ? 'bg-red-50 text-red-600 border border-red-100' : 
                    city.intensity === 'medium' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 
                    'bg-blue-50 text-blue-600 border border-blue-100'}`}
                title={`${city.name}: ${city.reason}`}
              >
                {city.name}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-bold text-gray-800">{monthName} {year}</h3>
            <div className="flex items-center gap-1">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-white rounded-full border border-transparent hover:border-gray-200 transition-all">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <button onClick={handleNextMonth} className="p-1 hover:bg-white rounded-full border border-transparent hover:border-gray-200 transition-all">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> High</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500" /> Med</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Low</div>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center border-b border-gray-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/30">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 p-4 sm:p-6 space-y-6 overflow-y-auto no-scrollbar">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#FF385C]" />
            Market Spikes
          </h2>
          <p className="text-sm text-gray-500">Identify high-demand opportunities across the map.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Filter by Country, State or City..."
              value={location || ''}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#FF385C] transition-all"
            />
          </div>
          <select 
            value={days || 7}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#FF385C]"
          >
            <option value={7}>Next 7 Days</option>
            <option value={14}>Next 14 Days</option>
            <option value={30}>Next 30 Days</option>
          </select>
          <button 
            onClick={fetchSpikes}
            disabled={isLoading}
            className="px-6 py-2 bg-[#FF385C] text-white rounded-xl text-sm font-bold hover:bg-[#d9304e] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
            Analyze
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      <div className="flex-1">
        {isLoading && spikes.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-[#FF385C] animate-spin" />
            <p className="text-gray-500 font-bold animate-pulse">Scanning global market data...</p>
          </div>
        ) : (
          renderCalendar()
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Top Spike Insights</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {spikes.slice(0, 3).flatMap(s => s.cities).slice(0, 3).map((city, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className={`p-2 rounded-lg ${city.intensity === 'high' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{city.name}</p>
                <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{city.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
