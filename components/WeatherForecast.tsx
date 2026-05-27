import React, { useEffect, useState } from 'react';
import { Stop } from '../types';
import { addDays, format, differenceInDays } from 'date-fns';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning } from 'lucide-react';

interface WeatherForecastProps {
  lat: number;
  lng: number;
  date: Date;
  daysToStay: number;
}

const getWeatherIcon = (code: number) => {
  if (code <= 3) return <Sun className="w-5 h-5 text-yellow-500" />;
  if (code <= 48) return <Cloud className="w-5 h-5 text-gray-400" />;
  if (code <= 67 || (code >= 80 && code <= 82)) return <CloudRain className="w-5 h-5 text-blue-400" />;
  if (code <= 77 || code === 85 || code === 86) return <CloudSnow className="w-5 h-5 text-cyan-300" />;
  if (code >= 95) return <CloudLightning className="w-5 h-5 text-purple-500" />;
  return <Sun className="w-5 h-5 text-yellow-500" />;
};

export const WeatherForecast: React.FC<WeatherForecastProps> = ({ lat, lng, date, daysToStay }) => {
  const [forecast, setForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchWeather = async () => {
      try {
        const today = new Date();
        const diffDays = differenceInDays(date, today);
        
        // Open-Meteo provides up to 16 days forecast. If the date is beyond that, we can't show it reliably.
        if (diffDays > 14) {
          if (active) {
            setForecast([]);
            setLoading(false);
          }
          return;
        }

        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
        if (!res.ok) throw new Error('Weather API error');
        const data = await res.json();
        
        if (active && data.daily) {
          const targetDateStr = format(date, 'yyyy-MM-dd');
          const startIndex = data.daily.time.findIndex((t: string) => t === targetDateStr);
          
          if (startIndex !== -1) {
            const endIndex = Math.min(startIndex + Math.max(1, daysToStay), data.daily.time.length);
            const days = [];
            for (let i = startIndex; i < endIndex; i++) {
              days.push({
                date: data.daily.time[i],
                maxTemp: Math.round(data.daily.temperature_2m_max[i]),
                minTemp: Math.round(data.daily.temperature_2m_min[i]),
                code: data.daily.weathercode[i]
              });
            }
            setForecast(days);
          }
        }
      } catch (error) {
        console.error("Failed to fetch weather", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchWeather();
    return () => { active = false; };
  }, [lat, lng, date, daysToStay]);

  if (loading) return <div className="animate-pulse h-12 bg-gray-100 rounded-lg"></div>;
  if (!forecast || forecast.length === 0) return null; // Can't forecast this far out or error

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <h5 className="text-xs font-bold text-gray-500 uppercase mb-3">Weather Forecast</h5>
      <div className="flex flex-wrap gap-3">
        {forecast.map((day, idx) => (
          <div key={idx} className="flex flex-col items-center bg-gray-50 rounded-lg p-2 border border-gray-100 min-w-[70px]">
            <span className="text-[10px] text-gray-500 font-medium mb-1">
              {format(new Date(day.date), 'MMM d')}
            </span>
            {getWeatherIcon(day.code)}
            <div className="mt-1 flex items-center justify-center gap-1 text-xs">
              <span className="font-bold text-gray-800">{day.maxTemp}°</span>
              <span className="text-gray-400">{day.minTemp}°</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
