import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Itinerary, Stop } from '../types';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { addDays, format, parseISO } from 'date-fns';
import { WeatherForecast } from './WeatherForecast';
import { InteractiveMap } from './InteractiveMap';
import { 
  Calendar, 
  Map as MapIcon, 
  Clock, 
  Navigation, 
  Utensils, 
  Camera, 
  Car, 
  Moon, 
  RefreshCw, 
  Share2, 
  ChevronDown, 
  ChevronUp,
  TrendingUp,
  AlertTriangle,
  Copy,
  ExternalLink,
  Check,
  Download,
  Bookmark,
  CalendarPlus,
  DollarSign,
  Music,
  MessageSquare,
  Sparkles,
  Cloud,
  Sun,
  CloudRain,
  Snowflake,
  Fuel
} from 'lucide-react';

interface ItineraryDisplayProps {
  itinerary: Itinerary | null;
  isLoading: boolean;
  onGenerateAlternative: () => void;
  onSaveTrip?: (itinerary: Itinerary) => void;
}

// -- View Models --
interface Activity {
  time: string;
  location: string;
  description: string;
  type: 'food' | 'sightseeing' | 'drive' | 'rest' | 'other';
  meta?: {
    demandScore?: number;
    justification?: string;
    sources?: { title: string; uri: string }[];
    estimatedCost?: string;
    lat?: number;
    lng?: number;
    dayOffset?: number;
    daysToStay?: number;
    wildcardDetour?: { name: string; description: string };
    localLexicon?: { slang: string; meaning: string };
    regionalSoundtrack?: string[];
    trafficWeatherReport?: string;
    routeComplexity?: 'Easy' | 'Moderate' | 'Challenging';
  };
}

interface DayPlan {
  title: string;
  activities: Activity[];
}

export const ItineraryDisplay: React.FC<ItineraryDisplayProps> = ({ 
  itinerary, 
  isLoading, 
  onGenerateAlternative,
  onSaveTrip
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'logistics' | 'checklist'>('timeline');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  // --- Transform Data to View Model ---
  const dayPlans = useMemo<DayPlan[]>(() => {
    if (!itinerary?.stops) return [];

    // Group stops by day, but handle travel segments logic
    const plans: DayPlan[] = [];
    const groupedStops = new Map<number, Stop>();
    
    // Sort just in case
    const sortedStops = [...itinerary.stops].sort((a, b) => a.day - b.day);

    sortedStops.forEach(stop => {
        // Find or create day plan
        let dayPlan = plans.find(p => p.title.includes(`Day ${stop.day}`));
        
        if (!dayPlan) {
            // New Day
            dayPlan = {
                title: `${stop.city}`,
                activities: []
            };
            plans.push(dayPlan);
        }

        // 1. Add Drive Segment if applicable
        if (stop.travelTimeFromPrev) {
             dayPlan.activities.push({
                time: "Morning", // Approximate
                location: "En Route",
                description: `Drive from previous location. Duration: ${stop.travelTimeFromPrev}`,
                type: 'drive'
             });
        }

        // 2. Add Main Activity (Market Focus)
        dayPlan.activities.push({
            time: "Afternoon", 
            location: stop.city,
            description: stop.activity,
            type: 'sightseeing',
            meta: {
                demandScore: stop.demandScore,
                justification: stop.profitabilityJustification,
                sources: stop.stopSources,
                estimatedCost: stop.estimatedCost,
                lat: stop.coordinates?.lat,
                lng: stop.coordinates?.lng,
                dayOffset: stop.day - 1,
                daysToStay: stop.nightsToStay > 0 ? stop.nightsToStay : 1,
                wildcardDetour: stop.wildcardDetour,
                localLexicon: stop.localLexicon,
                regionalSoundtrack: stop.regionalSoundtrack,
                trafficWeatherReport: (stop as any).trafficWeatherReport,
                routeComplexity: (stop as any).routeComplexity
            }
        });

        // 3. Add Stay
        if (stop.nightsToStay > 0) {
             dayPlan.activities.push({
                time: "Evening",
                location: stop.city,
                description: `Check-in for ${stop.nightsToStay} night${stop.nightsToStay > 1 ? 's' : ''}.`,
                type: 'rest'
             });
        } else {
             dayPlan.activities.push({
                time: "Evening",
                location: stop.city,
                description: "Short stopover. Continuing journey.",
                type: 'other'
             });
        }
    });

    return plans;
  }, [itinerary]);

  const totalEstimatedCost = useMemo(() => {
    if (!itinerary?.stops) return 0;
    return itinerary.stops.reduce((sum, stop) => {
        const costStr = stop.estimatedCost || '$0';
        // Handle ranges like "$100-$200" by taking the average or max. Let's take max for safety.
        const matches = costStr.match(/\d+/g);
        if (matches) {
            const values = matches.map(Number);
            return sum + Math.max(...values);
        }
        return sum;
    }, 0);
  }, [itinerary]);

  const getGoogleMapsUrl = () => {
    if (!itinerary || !itinerary.stops.length) return '#';
    
    // Fallback if origin/dest are missing
    const origin = encodeURIComponent(itinerary.origin || itinerary.stops[0].city);
    const destination = encodeURIComponent(itinerary.destination || itinerary.stops[itinerary.stops.length - 1].city);
    
    // Filter stops to avoid duplicating origin/destination if they appear in the stop list
    // and take only the first 8 stops to adhere to common URL limits (total 10 points)
    const waypoints = itinerary.stops
        .filter(s => s.city !== itinerary.origin && s.city !== itinerary.destination)
        .slice(0, 8) 
        .map(s => encodeURIComponent(s.city))
        .join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
  };

  const handleCopyItinerary = () => {
    if (!itinerary) return;
    
    const text = [
        `ROAD TRIP: ${itinerary.routeName}`,
        `Route: ${itinerary.origin} -> ${itinerary.destination}`,
        `Stats: ${itinerary.totalDistance} | ${itinerary.totalDuration}`,
        `\n--- ITINERARY ---`,
        ...itinerary.stops.map(s => 
            `Day ${s.day}: ${s.city} (Score: ${s.demandScore})\nFocus: ${s.activity}\nStay: ${s.nightsToStay} nights`
        )
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadItinerary = () => {
    if (!itinerary) return;

    const content = [
        `ROAD TRIP PLAN: ${itinerary.routeName}`,
        `Generated on: ${new Date().toLocaleDateString()}`,
        `Route: ${itinerary.origin || 'Start'} to ${itinerary.destination || 'End'}`,
        `Total Distance: ${itinerary.totalDistance}`,
        `Total Duration: ${itinerary.totalDuration}`,
        `Summary: ${itinerary.summary}`,
        `----------------------------------------\n`,
        ...itinerary.stops.map(stop => 
            `DAY ${stop.day}: ${stop.city.toUpperCase()}\n` +
            `• Demand Score: ${stop.demandScore}/100 (${stop.trendVelocity})\n` +
            `• Strategy: ${stop.activity}\n` +
            `• Insight: ${stop.profitabilityJustification}\n` +
            `• Stay: ${stop.nightsToStay} Nights\n` +
            `• Est. Cost: ${stop.estimatedCost || 'N/A'}\n` +
            `• Travel: ${stop.travelToNext ? `Next leg ${stop.travelToNext}` : 'End of leg'}\n` +
            `----------------------------------------\n`
        ),
        `\nExported from RoadTripPro`
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RoadTrip-${(itinerary.origin || 'Plan').split(',')[0]}-to-${(itinerary.destination || 'End').split(',')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportICS = () => {
    if (!itinerary) return;

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//RoadTripPro//Itinerary//EN',
      'CALSCALE:GREGORIAN'
    ];

    const today = new Date();
    // Use the actual startDate from the itinerary if available, otherwise today
    const tripStartDate = itinerary.startDate ? parseISO(itinerary.startDate) : today;

    itinerary.stops.forEach((stop, index) => {
      // Approximate date per stop based on day number
      const eventDate = addDays(tripStartDate, stop.day - 1);
      const dtStart = format(eventDate, "yyyyMMdd'T'100000"); // 10:00 AM local
      const dtEnd = format(eventDate, "yyyyMMdd'T'180000"); // 6:00 PM local
      const dtStamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");

      icsContent.push(
        'BEGIN:VEVENT',
        `DTSTAMP:${dtStamp}`,
        `UID:stop-${index}-${dtStamp}@roadtrippro`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:RoadTrip: ${stop.city}`,
        `DESCRIPTION:Activity: ${stop.activity}\\n\\nStay: ${stop.nightsToStay} nights\\n\\nDemand Score: ${stop.demandScore}\\n\\nEst. Cost: ${stop.estimatedCost || 'N/A'}`,
        `LOCATION:${stop.city}`,
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RoadTrip-${(itinerary.origin || 'Plan').split(',')[0]}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!itinerary || !pdfRef.current) return;
    
    setIsExportingPDF(true);
    try {
      const element = pdfRef.current;
      const imgData = await toPng(element, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // We need to get the image dimensions to calculate the ratio
      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      const imgWidth = img.width;
      const imgHeight = img.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10; // Margin top
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`RoadTrip-${(itinerary.origin || 'Plan').split(',')[0]}-to-${(itinerary.destination || 'End').split(',')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleSave = () => {
      if (onSaveTrip && itinerary) {
          onSaveTrip(itinerary);
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
      }
  };

  // 1. Loading State (Detailed Skeleton UI)
  if (isLoading) {
    return (
      <div className="h-auto lg:h-full flex flex-col bg-white lg:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Skeleton Header */}
        <div className="flex-none p-4 lg:p-6 border-b border-gray-100 bg-white">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
            <div className="space-y-2">
              <div className="h-8 bg-gray-100 rounded-lg w-64 animate-pulse" />
              <div className="h-4 bg-gray-50 rounded w-48 animate-pulse" />
            </div>
            <div className="flex items-center gap-2 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-9 w-16 bg-gray-50 rounded-full animate-pulse" />
              ))}
            </div>
          </div>
          {/* Skeleton Tabs */}
          <div className="flex gap-6 mt-6 border-b border-gray-100 -mb-6">
            <div className="h-10 w-24 border-b-2 border-gray-100" />
            <div className="h-10 w-32 border-b-2 border-transparent" />
          </div>
        </div>

        {/* Skeleton Content */}
        <div className="flex-none lg:flex-1 lg:overflow-y-auto bg-gray-50/50 p-4 lg:p-6 space-y-8">
          {[1, 2].map((day) => (
            <div key={day} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-5 bg-gray-100 rounded w-20 animate-pulse" />
                    <div className="h-4 bg-gray-50 rounded w-32 animate-pulse" />
                  </div>
                </div>
                <div className="h-5 w-5 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="p-6 pl-10 relative space-y-8">
                <div className="absolute left-[52px] top-6 bottom-6 w-0.5 bg-gray-50" />
                {[1, 2].map((act) => (
                  <div key={act} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-gray-100 ring-4 ring-white animate-pulse z-10" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-gray-100 rounded w-1/4 animate-pulse" />
                      <div className="h-16 bg-gray-50 rounded-xl w-full animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Empty State
  if (!itinerary) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white/50 lg:bg-white lg:rounded-2xl lg:border border-gray-100 text-center p-8">
        <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <MapIcon className="w-10 h-10 text-[#FF385C]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to hit the road?</h2>
        <p className="text-gray-500 max-w-md leading-relaxed">
          Enter your trip details on the left to generate a perfectly curated day-by-day itinerary tailored to your preferences.
        </p>
      </div>
    );
  }

  // 3. Render Result
  return (
    <div className="h-auto lg:h-full flex flex-col bg-white lg:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      
      {/* Header Section */}
      <div className="flex-none p-4 lg:p-6 border-b border-gray-100 bg-white z-10">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <h2 className="text-lg lg:text-2xl font-bold text-gray-900 leading-tight">
              {itinerary.routeName || "Your Road Trip Adventure"}
            </h2>
            <p className="text-gray-500 mt-1 flex items-center gap-2 text-xs lg:text-sm">
              <Calendar className="w-3.5 h-3.5" />
              {itinerary.summary || "Custom curated itinerary"}
            </p>
          </div>
          
          <div className="flex overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap items-center gap-2 no-scrollbar">
             <button 
                onClick={handleSave}
                className={`flex-none px-3 py-1.5 sm:px-4 sm:py-2 border rounded-full text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 shadow-sm ${
                    saved 
                    ? 'bg-green-50 border-green-200 text-green-700' 
                    : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
            >
              {saved ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              <span>{saved ? "Saved" : "Save"}</span>
            </button>

            <button 
              onClick={onGenerateAlternative}
              className="flex-none px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-full text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Alt</span>
            </button>
            
            <button 
                onClick={handleCopyItinerary}
                className="flex-none px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-full text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              <span>Copy</span>
            </button>

            <button 
                onClick={handleDownloadItinerary}
                className="flex-none px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-full text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>TXT</span>
            </button>

            <button 
                onClick={handleExportICS}
                className="flex-none px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-full text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Cal .ics</span>
            </button>

            <button 
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                className="flex-none px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-900 hover:bg-black text-white rounded-full text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isExportingPDF ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isExportingPDF ? "..." : "PDF"}</span>
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-4 lg:gap-6 mt-6 border-b border-gray-100 -mb-6">
          <button 
            onClick={() => setActiveTab('timeline')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-[#FF385C] text-[#FF385C]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Timeline
          </button>
          <button 
            onClick={() => setActiveTab('logistics')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'logistics' ? 'border-[#FF385C] text-[#FF385C]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Logistics & Map
          </button>
          <button 
            onClick={() => setActiveTab('checklist')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'checklist' ? 'border-[#FF385C] text-[#FF385C]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Smart Checklist
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-none lg:flex-1 lg:overflow-y-auto bg-gray-50/50 p-4 lg:p-6 scroll-smooth custom-scrollbar">
        
        {activeTab === 'checklist' ? (
          <SmartChecklist itinerary={itinerary} />
        ) : activeTab === 'logistics' ? (
          <div className="max-w-3xl mx-auto space-y-6">
             {/* Navigation Card */}
             <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Navigation className="w-5 h-5 text-[#FF385C]" />
                            Route Navigation
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Get live turn-by-turn directions via Google Maps.</p>
                    </div>
                    <a 
                        href={getGoogleMapsUrl()} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 bg-[#FF385C] text-white rounded-lg font-bold shadow-md hover:bg-[#d9304e] transition-all flex items-center justify-center gap-2"
                    >
                        Open Full Route
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>

                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <span className="text-xs font-bold text-gray-400 uppercase">Total Dist</span>
                        <p className="text-lg lg:text-xl font-black text-gray-900 mt-1">{itinerary.totalDistance}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <span className="text-xs font-bold text-gray-400 uppercase">Est. Time</span>
                        <p className="text-lg lg:text-xl font-black text-gray-900 mt-1">{itinerary.totalDuration}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <span className="text-xs font-bold text-gray-400 uppercase">Total Stops</span>
                        <p className="text-lg lg:text-xl font-black text-gray-900 mt-1">{itinerary.stops.length}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <span className="text-xs font-bold text-gray-400 uppercase">Route Type</span>
                        <p className="text-lg lg:text-xl font-black text-gray-900 mt-1 capitalize">{itinerary.travelMode || "Car"}</p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                        <span className="text-xs font-bold text-emerald-500 uppercase">Total Est. Cost</span>
                        <p className="text-lg lg:text-xl font-black text-emerald-700 mt-1">${totalEstimatedCost.toLocaleString()}</p>
                    </div>
                </div>

                {/* Fuel Cost Estimator */}
                <FuelEstimator distanceStr={itinerary.totalDistance} />
             </div>

             {/* Interactive Map */}
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-2">
                 <InteractiveMap stops={itinerary.stops} origin={itinerary.origin} destination={itinerary.destination} />
             </div>

             {/* Stops Summary */}
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h4 className="font-bold text-gray-800">Waypoints Sequence</h4>
                </div>
                <div className="divide-y divide-gray-100">
                    <div className="p-4 flex items-center gap-3 bg-gray-50">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="font-bold text-gray-900">Start: {itinerary.origin || 'Start'}</span>
                    </div>
                    {itinerary.stops.map((stop, i) => (
                        <div key={i} className="p-4 flex items-center gap-3 pl-8 relative group">
                             <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                             <span className="w-6 h-6 rounded-full bg-white border border-gray-200 text-xs font-bold flex items-center justify-center z-10">
                                {i + 1}
                             </span>
                             <div className="flex-1 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-gray-900">{stop.city}</p>
                                    <p className="text-xs text-gray-500">Day {stop.day} • {stop.nightsToStay} Night Stay</p>
                                </div>
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.city)}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-gray-300 hover:text-[#FF385C] transition-colors"
                                  title="View on Map"
                                >
                                    <MapIcon className="w-4 h-4" />
                                </a>
                             </div>
                        </div>
                    ))}
                    <div className="p-4 flex items-center gap-3 bg-gray-50">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="font-bold text-gray-900">End: {itinerary.destination || 'End'}</span>
                    </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-8 pb-12">
            {dayPlans.map((day, index) => (
              <DayCard key={index} day={day} index={index} />
            ))}
          </div>
        )}
      </div>

      {/* Hidden PDF Template */}
      <div className="absolute opacity-0 pointer-events-none -z-50 overflow-hidden h-0">
        <div ref={pdfRef} className="p-10 bg-white w-[800px]" style={{ color: '#111827', backgroundColor: '#ffffff', fontFamily: 'sans-serif' }}>
          <div className="border-b-2 pb-6 mb-8" style={{ borderColor: '#FF385C' }}>
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#111827' }}>{itinerary.routeName || "Your Road Trip"}</h1>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-lg" style={{ color: '#4b5563' }}>{itinerary.origin} to {itinerary.destination}</p>
                <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>Generated by RoadTripPro on {new Date().toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold" style={{ color: '#FF385C' }}>{itinerary.totalDistance}</p>
                <p className="text-sm" style={{ color: '#6b7280' }}>{itinerary.totalDuration}</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold mb-3" style={{ color: '#1f2937' }}>Route Summary</h2>
            <p className="leading-relaxed" style={{ color: '#4b5563' }}>{itinerary.summary}</p>
          </div>

          <div className="space-y-8">
            {itinerary.stops.map((stop, i) => (
              <div key={i} className="border-l-4 pl-6 py-2" style={{ borderColor: '#f3f4f6' }}>
                <div className="flex justify-between items-baseline mb-2">
                  <h3 className="text-2xl font-bold" style={{ color: '#111827' }}>Day {stop.day}: {stop.city}</h3>
                  <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: '#fff1f2', color: '#FF385C' }}>
                    Score: {stop.demandScore}/100
                  </span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>Activity</p>
                    <p className="font-medium" style={{ color: '#374151' }}>{stop.activity}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>Stay</p>
                    <p className="font-medium" style={{ color: '#374151' }}>{stop.nightsToStay} Night{stop.nightsToStay !== 1 ? 's' : ''}</p>
                  </div>
                  {stop.estimatedCost && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>Est. Cost</p>
                      <p className="font-medium" style={{ color: '#059669' }}>{stop.estimatedCost}</p>
                    </div>
                  )}
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color: '#2563eb' }}>Market Insight</p>
                  <p className="text-sm italic leading-relaxed" style={{ color: '#4b5563' }}>{stop.profitabilityJustification}</p>
                </div>
                {stop.travelToNext && (
                  <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: '#9ca3af' }}>
                    <Car className="w-4 h-4" />
                    <span>Next leg: {stop.travelToNext}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 pt-6 border-t text-center text-xs" style={{ borderTopColor: '#f3f4f6', color: '#9ca3af' }}>
            <p>© {new Date().getFullYear()} RoadTripPro - Your Intelligent Travel Companion</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub-Components ---

const DayCard: React.FC<{ day: DayPlan; index: number }> = ({ day, index }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
      {/* Day Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 flex items-center justify-between cursor-pointer bg-gray-50/50 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#FF385C]/10 flex items-center justify-center text-[#FF385C] font-bold text-lg">
            {index + 1}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Day {index + 1}</h3>
            <p className="text-sm text-gray-500 font-medium">{day.title}</p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </div>

      {/* Activities Timeline */}
      {isExpanded && (
        <div className="p-4 pl-6 lg:pl-10 relative">
          {/* Vertical Line */}
          <div className="absolute left-9 lg:left-[52px] top-6 bottom-6 w-0.5 bg-gray-100" />
          
          <div className="space-y-6 relative">
            {day.activities.map((activity, actIndex) => (
              <ActivityItem key={actIndex} activity={activity} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ActivityItem: React.FC<{ activity: Activity }> = ({ activity }) => {
  const getIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'food': return <Utensils className="w-4 h-4" />;
      case 'sightseeing': return <Camera className="w-4 h-4" />;
      case 'drive': return <Car className="w-4 h-4" />;
      case 'rest': return <Moon className="w-4 h-4" />;
      default: return <Navigation className="w-4 h-4" />;
    }
  };

  const getColor = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'food': return 'bg-orange-100 text-orange-600';
      case 'sightseeing': return 'bg-blue-100 text-blue-600';
      case 'drive': return 'bg-gray-100 text-gray-600';
      default: return 'bg-rose-100 text-rose-600';
    }
  };

  return (
    <div className="flex gap-4 relative group">
      {/* Timeline Dot */}
      <div className={`w-8 h-8 rounded-full flex-none flex items-center justify-center z-10 ring-4 ring-white ${getColor(activity.type)}`}>
        {getIcon(activity.type)}
      </div>

      {/* Content */}
      <div className="flex-1 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 mb-1">
          <span className="text-xs font-bold text-gray-400 tracking-wide uppercase flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {activity.time}
          </span>
          <h4 className="font-semibold text-gray-900 text-sm">
            {activity.location || "En Route"}
          </h4>
        </div>
        <p className="text-gray-600 text-sm leading-relaxed">
          {activity.description}
        </p>

        {/* Market Data Injection */}
        {activity.meta?.demandScore !== undefined && (
            <div className="mt-3 bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-3 h-3 text-blue-500" />
                    <span className="text-xs font-bold text-blue-700">Market Intelligence</span>
                </div>
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                        <p className="text-xs text-blue-600/80 leading-snug mb-2">{activity.meta.justification}</p>
                        
                        {/* Grounding Sources */}
                        {activity.meta.sources && activity.meta.sources.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {activity.meta.sources.map((source, idx) => (
                                    <a 
                                        key={idx}
                                        href={source.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-100 rounded text-[10px] text-blue-500 hover:text-blue-700 hover:border-blue-300 transition-all group"
                                    >
                                        <ExternalLink className="w-2.5 h-2.5" />
                                        <span className="max-w-[120px] truncate">{source.title}</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="bg-white px-2 py-1 rounded border border-blue-100 shadow-sm text-center flex-none">
                        <span className="block text-xs font-black text-gray-900">{activity.meta.demandScore}</span>
                        <span className="block text-[8px] uppercase font-bold text-gray-400">Score</span>
                    </div>
                </div>
            </div>
        )}

        {activity.meta?.estimatedCost && (
            <div className="mt-2 flex items-center gap-1 text-sm text-emerald-600 font-medium bg-emerald-50 w-fit px-2 py-1 rounded-md">
                <DollarSign className="w-3.5 h-3.5" />
                Est. Cost: {activity.meta.estimatedCost}
            </div>
        )}

        {activity.meta?.lat && activity.meta?.lng && (
            <WeatherForecast 
                lat={activity.meta.lat} 
                lng={activity.meta.lng} 
                date={addDays(new Date(), activity.meta.dayOffset || 0)} 
                daysToStay={activity.meta.daysToStay || 1} 
            />
        )}
        
        {/* NEW UNIQUE FEATURES RENDERING */}
        {(activity.meta?.wildcardDetour || activity.meta?.localLexicon || activity.meta?.regionalSoundtrack) && (
            <div className="mt-4 border-t border-gray-100 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                {activity.meta?.wildcardDetour && (
                    <div className="bg-purple-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <span className="text-xs font-bold uppercase tracking-wider text-purple-800">Wildcard Detour</span>
                        </div>
                        <p className="text-sm font-semibold text-purple-900 mb-0.5">{activity.meta.wildcardDetour.name}</p>
                        <p className="text-xs text-purple-700 leading-relaxed">{activity.meta.wildcardDetour.description}</p>
                    </div>
                )}
                {activity.meta?.localLexicon && (
                    <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Local Lexicon</span>
                        </div>
                        <p className="text-sm font-semibold text-blue-900 mb-0.5">"{activity.meta.localLexicon.slang}"</p>
                        <p className="text-xs text-blue-700 leading-relaxed">{activity.meta.localLexicon.meaning}</p>
                    </div>
                )}
                {activity.meta?.regionalSoundtrack && activity.meta.regionalSoundtrack.length > 0 && (
                    <div className="bg-orange-50 rounded-lg p-3 md:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Music className="w-4 h-4 text-orange-600" />
                                <span className="text-xs font-bold uppercase tracking-wider text-orange-800">Regional Soundtrack</span>
                            </div>
                            <a 
                                href={`https://open.spotify.com/search/${encodeURIComponent(activity.meta.regionalSoundtrack.join(' '))}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-orange-600 hover:underline flex items-center gap-1"
                            >
                                Play on Spotify
                                <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {activity.meta.regionalSoundtrack.map((song, i) => (
                                <span key={i} className="bg-orange-100 text-orange-800 text-xs px-2.5 py-1 rounded-full font-medium">
                                    {song}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {activity.meta?.trafficWeatherReport && (
            <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                    {(() => {
                        const report = activity.meta.trafficWeatherReport.toLowerCase();
                        if (report.includes('rain')) return <CloudRain className="w-3.5 h-3.5 text-blue-600" />;
                        if (report.includes('snow')) return <Snowflake className="w-3.5 h-3.5 text-blue-400" />;
                        if (report.includes('sun') || report.includes('clear')) return <Sun className="w-3.5 h-3.5 text-amber-500" />;
                        if (report.includes('cloud')) return <Cloud className="w-3.5 h-3.5 text-gray-500" />;
                        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
                    })()}
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-tight">Live Traffic & Weather Report</span>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed italic">{activity.meta.trafficWeatherReport}</p>
                {activity.meta.routeComplexity && (
                    <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] font-black text-amber-500 uppercase">Drive Difficulty:</span>
                        <div className="flex gap-1">
                            {[1, 2, 3].map((_, i) => (
                                <div 
                                    key={i} 
                                    className={`w-3 h-1 rounded-full ${
                                        i === 0 ? 'bg-amber-400' : 
                                        i === 1 && (activity.meta.routeComplexity === 'Moderate' || activity.meta.routeComplexity === 'Challenging') ? 'bg-amber-400' :
                                        i === 2 && activity.meta.routeComplexity === 'Challenging' ? 'bg-amber-400' : 'bg-amber-100'
                                    }`} 
                                />
                            ))}
                        </div>
                        <span className="text-[10px] font-bold text-amber-600">{activity.meta.routeComplexity}</span>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

const FuelEstimator: React.FC<{ distanceStr: string }> = ({ distanceStr }) => {
    const [gasPrice, setGasPrice] = useState(3.5); // USD per gallon
    const [efficiency, setEfficiency] = useState(25); // MPG
    
    const distance = useMemo(() => {
        const match = distanceStr.match(/(\d+([.,]\d+)?)/);
        if (!match) return 0;
        let val = parseFloat(match[1].replace(',', ''));
        // If km, convert to miles for simple MPG calculation (or vice versa)
        if (distanceStr.toLowerCase().includes('km')) val *= 0.621371;
        return val;
    }, [distanceStr]);

    const estimatedCost = (distance / efficiency) * gasPrice;

    return (
        <div className="mt-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 mb-4">
                <Fuel className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-blue-900">Fuel Cost Estimator</h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Gas Price ($/gal)</label>
                        <input 
                            type="range" min="2" max="10" step="0.1" 
                            value={gasPrice} 
                            onChange={(e) => setGasPrice(parseFloat(e.target.value))}
                            className="w-full accent-blue-600"
                        />
                        <div className="flex justify-between text-xs font-bold text-blue-700 mt-1">
                            <span>$2.00</span>
                            <span className="bg-white px-2 rounded border border-blue-100">${gasPrice.toFixed(2)}</span>
                            <span>$10.00</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Vehicle Efficiency (MPG)</label>
                        <input 
                            type="range" min="10" max="60" step="1" 
                            value={efficiency} 
                            onChange={(e) => setEfficiency(parseFloat(e.target.value))}
                            className="w-full accent-blue-600"
                        />
                        <div className="flex justify-between text-xs font-bold text-blue-700 mt-1">
                            <span>10 MPG</span>
                            <span className="bg-white px-2 rounded border border-blue-100">{efficiency} MPG</span>
                            <span>60 MPG</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-blue-100 flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-blue-500 uppercase">Estimated Fuel Total</p>
                    <p className="text-2xl font-black text-blue-900">${estimatedCost.toFixed(2)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-blue-400 font-medium">Based on ~{Math.round(distance)} miles</p>
                </div>
            </div>
        </div>
    );
};

const SmartChecklist: React.FC<{ itinerary: Itinerary }> = ({ itinerary }) => {
    const items = useMemo(() => {
        const baseItems = [
            { category: "Essentials", items: ["Driver's License", "Physical Insurance Card", "Spare Key", "First Aid Kit"] },
            { category: "Tech", items: ["Phone Mount", "Dual USB Car Charger", "Offline Maps (Downloaded)", "Portable Power Bank"] }
        ];

        // Dynamic items based on activities
        const dynamic: string[] = [];
        const activityText = itinerary.stops.map(s => s.activity).join(' ').toLowerCase();
        
        if (activityText.includes('park') || activityText.includes('nature') || activityText.includes('hiking')) {
            dynamic.push("Hiking Boots", "Bug Spray", "Reusable Water Bottle");
        }
        if (activityText.includes('beach') || activityText.includes('water') || activityText.includes('swimming')) {
            dynamic.push("Quick-dry Towel", "Sunscreen (SPF 50+)", "Waterproof Phone Case");
        }
        if (activityText.includes('museum') || activityText.includes('fine dining') || activityText.includes('club')) {
            dynamic.push("Smart Casual Outfit", "Comfortable Walking Shoes");
        }

        if (dynamic.length > 0) {
            baseItems.push({ category: "Trip Specific", items: [...new Set(dynamic)] });
        }

        return baseItems;
    }, [itinerary]);

    return (
        <div className="max-w-3xl mx-auto space-y-6 py-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-emerald-100 p-2 rounded-xl">
                        <Check className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 leading-tight">Smart Packing Assistant</h3>
                        <p className="text-sm text-gray-500">AI-generated checklist based on your destination and activities.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {items.map((group, idx) => (
                        <div key={idx}>
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 border-b pb-1">{group.category}</h4>
                            <ul className="space-y-3">
                                {group.items.map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 group cursor-pointer">
                                        <div className="w-5 h-5 rounded border-2 border-gray-200 group-hover:border-emerald-400 transition-colors flex items-center justify-center">
                                            {/* In a real app this would be a real checkbox with state */}
                                            <div className="w-2 h-2 bg-emerald-400 rounded-sm opacity-0 group-hover:opacity-10 transition-opacity" />
                                        </div>
                                        <span className="text-sm text-gray-600 font-medium group-hover:text-gray-900">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                
                <div className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-emerald-500 mt-0.5" />
                    <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                        Pro Tip: Your itinerary includes outdoor activities. Don't forget to check your tire pressure and oil levels before departure!
                    </p>
                </div>
            </div>
        </div>
    );
};