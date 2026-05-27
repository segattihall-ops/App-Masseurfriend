import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Stop } from '../types';

interface DemandChartProps {
  stops: Stop[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-xl">
        <p className="font-bold text-gray-900 mb-1">{label}</p>
        <p className="text-[#FF385C] text-sm">
          Demand Score: <span className="font-mono font-bold">{payload[0].value}</span>
        </p>
        <p className="text-gray-500 text-xs mt-1 italic">
            {payload[0].payload.activity}
        </p>
      </div>
    );
  }
  return null;
};

export const DemandChart: React.FC<DemandChartProps> = ({ stops }) => {
  const data = stops.map(stop => ({
    name: stop.city.split(',')[0], // Shorten name
    score: stop.demandScore,
    fullCity: stop.city,
    activity: stop.activity
  }));

  return (
    <div className="w-full h-64 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider">Market Demand Analysis</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#9ca3af" 
            tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            dy={10}
          />
          <YAxis 
            stroke="#9ca3af"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
          <Bar dataKey="score" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.score >= 85 ? '#22c55e' : entry.score >= 60 ? '#3b82f6' : entry.score >= 40 ? '#eab308' : '#e5e7eb'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};