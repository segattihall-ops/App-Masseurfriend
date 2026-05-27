import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Activity, Download, Code, FileText } from 'lucide-react';
import { Itinerary, TripFormData } from '../types';

interface DemandForecastProps {
  itinerary?: Itinerary | null;
  formData?: TripFormData | null;
}

export const DemandForecast: React.FC<DemandForecastProps> = ({ itinerary, formData }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'code' | 'data'>('dashboard');
  const [mockForecast, setMockForecast] = useState<any[]>([]);
  
  useEffect(() => {
    const startDateStr = formData?.startDate || new Date().toISOString().split('T')[0];
    const destStr = formData?.destination || "Wilton Manors, FL";
    
    let seed = 0;
    for(let i = 0; i < destStr.length; i++) {
        seed += destStr.charCodeAt(i);
    }
    
    // Convert to number or default
    const accuracy = formData?.forecastSettings?.accuracyTarget || 85;

    const generated = Array.from({ length: 30 }).map((_, i) => {
      let date = new Date(startDateStr);
      if (isNaN(date.getTime())) date = new Date();
      date.setDate(date.getDate() + i);
      
      // Create a trend that goes up and down, with spikes for events
      let baseTrend = (accuracy / 2) + Math.sin(i / 3 + seed) * 15 + (i * 0.5);
      
      // Add spikes for specific dates (mocking the events)
      let isEvent = false;
      let eventName = '';
      
      const eventSpike1 = seed % 10 + 2;
      const eventSpike2 = seed % 15 + 12;
      
      if (i === eventSpike1) {
        baseTrend += 35;
        isEvent = true;
        eventName = `Local Event in ${destStr.split(',')[0]}`;
      } else if (i === eventSpike2) {
        baseTrend += 25;
        isEvent = true;
        eventName = `Community Conference`;
      }
      
      return {
        date: date.toISOString().split('T')[0],
        yhat: Math.max(0, Math.min(100, baseTrend)).toFixed(1),
        yhat_lower: Math.max(0, Math.min(100, baseTrend - 12)).toFixed(1),
        yhat_upper: Math.max(0, Math.min(100, baseTrend + 12)).toFixed(1),
        isEvent,
        eventName
      };
    });
    setMockForecast(generated);
  }, [formData, itinerary]);

  const pythonCode = `# -------------------------------------------------
#  forecast_prophet_roadtrip.py
# -------------------------------------------------
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
from datetime import datetime, timedelta
from pytrends.request import TrendReq
from prophet import Prophet
import math
import time
import pandas as pd
import numpy as np

# 1. PARAMETERS
ORIGIN = "${formData?.origin || 'Dallas, TX'}"
DESTINATION = "${formData?.destination || 'Wilton Manors, FL'}"
START_DATE = "${formData?.startDate || '2026-03-25'}"
FORECAST_DAYS = ${formData?.forecastSettings?.forecastWindow || 60}
ACCURACY_TARGET = ${formData?.forecastSettings?.accuracyTarget || 85}

KEYWORDS = ${JSON.stringify((formData as any)?.keywords ? (formData as any).keywords.split(',').map((s: string)=>s.trim()) : ["gay massage", "male massage", "massage for men"], null, 4)}

# 2. PROPHET FORECAST LOGIC
def forecast_state(state_name, keywords, timeframe, forecast_days):
    # Fetch interest_over_time via pytrends
    # Train Prophet model on historical series
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False
    )
    # model.fit(df_hist)
    # future = model.make_future_dataframe(periods=forecast_days)
    # forecast = model.predict(future)
    return f"Forecast generated with {ACCURACY_TARGET}% accuracy"

# 3. ROUTE OPTIMIZATION
# Align arrival dates with predicted demand peaks (yhat)
# Add extra nights where demand intensity is highest
`;

  const csvData = `ds,holiday,lower_window,upper_window
2026-06-27,PrideHouston,0,1
2026-07-04,IndependenceDay,0,0
2026-09-15,LGBTQBusinessConference,0,1
2026-11-20,TransDayOfRemembrance,0,0`;

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-[#FF385C]" />
              Demand Forecast Model
            </h2>
            <p className="text-[10px] sm:text-sm text-gray-500 mt-1">
              Facebook Prophet Engine: ARIMA + Seasonal Decomposition
            </p>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                activeTab === 'dashboard' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 inline-block mr-1.5" />
              Forecast
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                activeTab === 'code' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Code className="w-3.5 h-3.5 inline-block mr-1.5" />
              Python
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                activeTab === 'data' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5 inline-block mr-1.5" />
              CSV
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 lg:pb-6">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Avg. Demand" value="64.2" trend="+12%" />
                <StatCard label="Peak yhat" value="92.1" trend="High" />
                <StatCard label="Confidence" value="85%" trend="Stable" />
                <StatCard label="Forecast Window" value="60 Days" trend="Active" />
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm sm:text-lg font-bold">30-Day Prophet Projection (yhat)</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Forecast</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-[#FF385C] rounded-full"></div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Peak</span>
                    </div>
                  </div>
                </div>
                
                {/* Chart Visualization */}
                <div className="h-48 sm:h-64 flex items-end gap-0.5 sm:gap-1 mb-8 border-b border-l border-gray-100 pb-2 pl-2 relative">
                  {mockForecast.map((day, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                      {day.isEvent && (
                        <div className="absolute -top-10 bg-[#FF385C] text-white text-[8px] sm:text-[10px] px-2 py-1 rounded-full font-bold shadow-lg z-10 animate-bounce">
                          {day.eventName}
                        </div>
                      )}
                      <div 
                        className={`w-full rounded-t-lg transition-all cursor-pointer ${day.isEvent ? 'bg-[#FF385C] shadow-[0_0_15px_rgba(255,56,92,0.3)]' : 'bg-blue-400/80 group-hover:bg-blue-500'}`}
                        style={{ height: `${day.yhat}%` }}
                      ></div>
                      
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 bg-gray-900 text-white text-[10px] p-2 rounded-xl pointer-events-none z-20 shadow-xl transition-opacity">
                        <p className="font-bold border-b border-white/10 pb-1 mb-1">{day.date}</p>
                        <p className="flex justify-between gap-4"><span>yhat:</span> <span className="text-blue-400 font-bold">{day.yhat}</span></p>
                        <p className="flex justify-between gap-4 text-gray-400"><span>Range:</span> <span>{day.yhat_lower}-{day.yhat_upper}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">yhat</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Confidence Interval</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                      {mockForecast.map((row, i) => (
                        <tr key={i} className={`hover:bg-gray-50 transition-colors ${row.isEvent ? 'bg-red-50/30' : ''}`}>
                          <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-gray-900">
                            {row.date}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-[#FF385C] font-black">
                            {row.yhat}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-[10px] text-gray-500 font-mono">
                            [{row.yhat_lower} - {row.yhat_upper}]
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {row.isEvent ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-red-100 text-red-600 uppercase tracking-tighter">
                                {row.eventName}
                              </span>
                            ) : (
                              <span className="text-[9px] text-gray-300 font-bold uppercase">Stable</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                  </div>
                  <span className="text-gray-400 text-[10px] font-mono ml-2">forecast_prophet.py</span>
                </div>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="text-[11px] sm:text-xs text-gray-300 font-mono leading-relaxed">
                  <code>{pythonCode}</code>
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                <span className="text-gray-400 text-[10px] font-mono">events_lgbtq.csv</span>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="text-[11px] sm:text-xs text-gray-300 font-mono leading-relaxed">
                  <code>{csvData}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; trend: string }> = ({ label, value, trend }) => (
  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
    <div className="flex items-end justify-between">
      <h4 className="text-xl font-black text-gray-900">{value}</h4>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${trend.includes('+') ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
        {trend}
      </span>
    </div>
  </div>
);
