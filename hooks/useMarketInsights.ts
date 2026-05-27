import { useState, useCallback } from 'react';
import { MarketInsight } from '../types';

export const useMarketInsights = () => {
  const [insights, setInsights] = useState<MarketInsight | null>(null);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);

  const fetchInsights = useCallback(async () => {
    setIsInsightsLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockInsights: MarketInsight = {
      trendingKeywords: [
        { keyword: "Gay Massage Austin", volume: 92, growth: "+45%" },
        { keyword: "Male Massage Therapist NYC", volume: 88, growth: "+32%" },
        { keyword: "Sensual Massage Chicago", volume: 75, growth: "+18%" },
        { keyword: "Professional Male Massage LA", volume: 70, growth: "+12%" },
        { keyword: "LGBTQ Friendly Massage Miami", volume: 65, growth: "+25%" }
      ],
      topClusters: [
        { city: "Austin, TX", score: 98, tags: ["High Velocity", "Tech Hub", "LGBTQ+ Friendly"], date: "2026-03-28" },
        { city: "New York, NY", score: 95, tags: ["Volume Leader", "Premium Market", "Diverse"], date: "2026-03-29" },
        { city: "Chicago, IL", score: 88, tags: ["Steady Growth", "Midwest Hub", "Emerging"], date: "2026-03-30" },
        { city: "Los Angeles, CA", score: 85, tags: ["Established", "High Competition", "Luxury"], date: "2026-03-31" },
        { city: "Miami, FL", score: 82, tags: ["Seasonal Spike", "Tourism Driven", "Vibrant"], date: "2026-04-01" }
      ],
      seasonalAdvice: "Spring is seeing a significant uptick in wellness travel. Focus on 'renewal' and 'detox' themes in your marketing. Austin and Miami are currently showing the highest growth velocity for male-to-male therapeutic services.",
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    setInsights(mockInsights);
    setIsInsightsLoading(false);
  }, []);

  return { insights, isInsightsLoading, fetchInsights };
};
