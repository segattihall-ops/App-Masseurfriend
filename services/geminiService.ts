import { GoogleGenAI, Type } from "@google/genai";
import { TripFormData, Itinerary, TravelMode, MarketInsight, GroundingSource, Stop, MarketSpike, Hotel } from "../types";
import { GEMINI_MODEL, GEMINI_FLASH_MODEL } from "../constants";

const getClient = () => {
  let apiKey: string | undefined;
  
  try {
    apiKey = process.env.GEMINI_API_KEY;
  } catch (e) {
    console.warn("Failed to access process.env", e);
  }

  if (apiKey) {
    apiKey = apiKey.trim();
    // Strip surrounding quotes if present
    if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
      console.log("Stripping surrounding quotes from API Key");
      apiKey = apiKey.substring(1, apiKey.length - 1);
    }

    // Mask for console logging to help debug without leaking the whole key
    const masked = apiKey.length > 8 
      ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` 
      : "Too short";
    console.log(`Using Gemini API Key: ${masked} (Length: ${apiKey.length})`);
  }

  if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey.includes("YOUR_")) {
    throw new Error("Gemini API Key is invalid or missing. Please ensure GEMINI_API_KEY is correctly configured in your settings.");
  }
  return new GoogleGenAI({ apiKey });
};

import { jsonrepair } from 'jsonrepair';

const cleanJsonString = (text: string): string => {
    if (!text) return "{}";
    let clean = text.trim();
    
    // Remove markdown code blocks if present
    clean = clean.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    
    try {
        return jsonrepair(clean);
    } catch (e) {
        return clean;
    }
};

const safeJsonParse = <T>(text: string, fallback: T): T => {
    try {
        const cleanText = cleanJsonString(text);
        return JSON.parse(cleanText) as T;
    } catch (error) {
        console.error("JSON Parse Error. Raw text:", text);
        console.error("Cleaned text:", cleanJsonString(text));
        console.error("Error details:", error);
        return fallback;
    }
};

const KEYWORD_MARKET_DATA = `
TARGET NICHE KEYWORDS (Prophet Forecast Input):
- gay massage, male massage, male massage near me, gay massage therapist
- lgbt massage, massage for men, 4 hands gay massage, sensual gay massage
- erotic gay massage, tantric gay massage, male bodywork, male full body massage
- gay m4m massage, deep tissue male massage, sports massage for men
- relaxing male massage, gay massage florida, gay massage texas
- masseur, gay masseur, traveling masseur, mobile masseur
- MasseurFinder, Masseur Finder, rent masseur, rentmasseur gay massage
`;

const isQuotaError = (error: any): boolean => {
    const e = error.error || error;
    const code = e.code || e.status;
    const message = (e.message || JSON.stringify(e)).toLowerCase();
    return (code === 429 || message.includes('429') || message.includes('quota') || message.includes('resource_exhausted') || message.includes('overloaded'));
};

const callWithRetry = async (ai: any, prompt: string, config: any, initialModel: string = GEMINI_MODEL) => {
    const maxRetries = 3;
    const baseDelay = 1000;

    const execute = async (model: string, canRetryOnQuota: boolean) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // If we've failed twice (maybe due to tool permissions), try without search
                const currentConfig = (attempt >= 2 && config.tools?.[0]?.googleSearch) 
                    ? { ...config, tools: [] } 
                    : config;
                
                if (attempt >= 2 && config.tools?.[0]?.googleSearch) {
                    console.log("Retrying without Google Search tool to rule out permission issues.");
                }

                return await ai.models.generateContent({ model, contents: prompt, config: currentConfig });
            } catch (error: any) {
                const code = error.status || error.code;
                const msg = (error.message || '').toLowerCase();
                
                console.error(`Gemini call failed (attempt ${attempt + 1}):`, msg);

                // Check for invalid API key early
                if (msg.includes("api key not valid") || msg.includes("api_key_invalid")) {
                    throw error;
                }

                let retryable = false;
                // Retry on transient server errors (5xx) or network issues
                if (code >= 500 && code < 600) retryable = true;
                if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) retryable = true;
                
                // If it's a 400 Bad Request, it might be the search tool
                if (msg.includes('invalid_argument') && attempt < 2) {
                    retryable = true;
                }
                
                // Only retry on quota errors if explicitly allowed (usually for Flash fallback)
                if (canRetryOnQuota && isQuotaError(error)) {
                    retryable = true;
                }

                if (!retryable || attempt === maxRetries - 1) throw error;
                
                const delay = baseDelay * Math.pow(2, attempt) + (Math.random() * 200);
                console.log(`Retrying in ${Math.round(delay)}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    };

    try {
        // 1. Attempt with the initial model (usually Pro)
        return await execute(initialModel, initialModel === GEMINI_FLASH_MODEL);
    } catch (error: any) {
        // 2. If Pro hits quota, fallback to Flash immediately
        if (initialModel === GEMINI_MODEL && isQuotaError(error)) {
            console.warn("Pro model quota exceeded, falling back to Flash model.");
            return await execute(GEMINI_FLASH_MODEL, true);
        }
        throw error;
    }
};

export const generateItinerary = async (data: TripFormData, isAlternative: boolean = false): Promise<Itinerary> => {
  const ai = getClient();
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const mandatoryStopsText = data.mandatoryStops.length > 0 ? data.mandatoryStops.map(s => `${s.location}${s.arrivalDate ? ` (Arrive: ${s.arrivalDate})` : ''}`).join(', ') : 'None';
  const originText = data.origin || "Flexible/User-Decided";
  const destinationText = (data.destination && data.destination.toLowerCase() !== 'anywhere') ? data.destination : "ANYWHERE (Suggest the highest revenue/demand destination based on market data)";
  const durationText = data.duration ? `${data.duration} days` : (data.startDate && data.endDate ? "Determined by dates" : "Flexible");
  const datesText = (data.startDate && data.endDate) ? `From ${data.startDate} to ${data.endDate}.` : (data.startDate ? `Starting on ${data.startDate} for ${durationText}.` : `Flexible dates for a ${durationText} trip.`);

  const driveConstraint = (data.maxDriveHours && data.maxDriveHours > 0) ? `${data.maxDriveHours} hours per leg` : "Auto-optimized";
  const stopsConstraint = (data.numberOfStops && data.numberOfStops > 0) ? `Aim for approximately ${data.numberOfStops} stops along the route.` : "Auto-optimize the number of stops for maximum market opportunity.";
  const routePrefMap: Record<string, string> = {
    'fastest': 'Prioritize efficiency and highways.',
    'scenic': 'Prioritize scenic byways and nature views.',
    'avoidTolls': 'Strictly avoid toll roads.'
  };
  const routeConstraint = routePrefMap[data.routePreference] || routePrefMap['fastest'];
  const keywordsText = data.keywords ? `\n    KEYWORDS/THEMES: ${data.keywords}\n    CRITICAL: Ensure the whole itinerary aligns with these themes.` : '';
  const interestsText = data.interests && data.interests.length > 0 ? `\n    INTERESTS: ${data.interests.join(', ')}` : '';
  const budgetText = data.budgetLevel ? `\n    BUDGET LEVEL: ${data.budgetLevel}` : '';

  let transportContext = `Primary Mode: ${data.travelMode}`;
  if (data.travelMode === TravelMode.Mixed && data.mixedTravelLegs?.length > 0) {
      transportContext = `Mixed Multi-Modal Journey: ${data.mixedTravelLegs.map((l, i) => `Leg ${i+1}: ${l.mode} (${l.description})`).join('; ')}`;
  }

  const scoreConstraint = data.minimumScore > 0 
    ? `CRITICAL: Every suggested stop/city MUST have a demandScore of AT LEAST ${data.minimumScore}/100. Do not include any locations that fall below this minimum score threshold.` 
    : '';

  const forecastContext = `
    FORECAST CONFIGURATION:
    - Forecast Window: ${data.forecastSettings.forecastWindow} Days
    - Accuracy Target: ${data.forecastSettings.accuracyTarget}%
    - Prophet Engine: ${data.forecastSettings.useProphet ? 'ENABLED (Use seasonal decomposition & yhat projections)' : 'DISABLED'}
    - Strategic Mode: ${data.forecastSettings.strategicMode ? '10x INTELLIGENCE (Deep reasoning, market-spike alignment, and logistics optimization)' : 'Standard'}
  `;

  const prompt = `
    TODAY'S DATE: ${today}
    ROUTE: From ${originText} to ${destinationText}
    TRIP PARAMETERS: ${datesText}
    You are a professional travel researcher and local expert using the world's most advanced routing engine. Your goal is to give ONLY accurate, up-to-date, and trustworthy recommendations that the user can safely rely on.
    
    Rules you MUST follow for every recommendation:
    - You MUST STRICTLY follow the established ROUTE above. Ensure the stops geographically make sense when driving/flying from the origin to the destination.
    - PRECISE ROUTING: Use real-time Google Search to calculate the most efficient segments, taking into account current traffic patterns and road closures for ${today}.
    - Only recommend places that currently exist and have recent positive activity (within the last 6–12 months).
    - Always verify using real-time search before suggesting anything.
    - Never invent names, addresses, ratings, or details.
    - If you are not 100% sure, clearly say "I recommend double-checking this on Google Maps before visiting."
    - Prioritize highly-rated places (4.5+ stars) that locals actually like, not just tourist traps.
    - Consider the user's exact route, preferences, budget, travel style, and dates.
    - For traffic/weather: Use real-time Google Search to get current road conditions, traffic bottlenecks, and detailed weather for the next 24-48 hours for key city stops.
    - For recommendations: Tailor ALL stops, activities, and dining to the user's INTERESTS and BUDGET LEVEL.
    
    ${forecastContext}

    CONSTRAINTS: 
    - Transport: ${transportContext}
    - Max Drive: ${driveConstraint}
    - Target Stops: ${stopsConstraint}
    - Route Style: ${routeConstraint} (Optimized for world-class precision)
    - Mandatory Stops: ${mandatoryStopsText}
    ${scoreConstraint}${keywordsText}${interestsText}${budgetText}
    
    INSTRUCTIONS:
    1. Optimize the route according to the constraints using Advanced Dynamic Route Optimization logic.
    2. The VERY FIRST stop in your 'stops' array MUST be the origin: ${originText}.
    3. If the destination is explicit (not 'ANYWHERE'), the VERY LAST stop in your 'stops' array MUST geographically be: ${destinationText}. If it is 'ANYWHERE', pick a high-demand destination.
    4. All intermediate stops must form a logical, geographically accurate driving sequence between the origin and destination.
    5. Provide a detailed summary explaining the reasoning behind the chosen route and stops, citing real-world traffic data if applicable.
    6. Ensure all coordinates are precise to 6 decimal places.
    7. For each stop, provide at least 1-2 'stopSources' (URLs) found via Google Search that justify the recommendation. These sources MUST be real, relevant URLs.
    8. Provide a generalized 'estimatedCost' for each stop including lodging and activities for the duration of the stay.
    9. NEW UNIQUE FEATURES FOR EVERY STOP:
       - 'wildcardDetour': A highly-rated but bizarre, unusual, or obscure local point of interest.
       - 'localLexicon': A piece of local slang or an unwritten rule of the city.
       - 'regionalSoundtrack': Provide 3 exact songs (Title - Artist).
       - 'trafficWeatherReport': A concise 1-2 sentence real-time traffic and weather forecast summary for this stop (next 24-48 hours), identifying specific road hazards or peak traffic hours.
       - 'routeComplexity': A rating (Easy, Moderate, Challenging) for the drive to this stop, considering twists, elevation, and traffic.
    10. ACCURACY: Your analysis MUST be based on real-time data retrieved via Google Search. Do not hallucinate.
  `;

  const itinerarySchema = {
    type: Type.OBJECT,
    properties: {
      routeName: { type: Type.STRING },
      totalDistance: { type: Type.STRING },
      totalDuration: { type: Type.STRING },
      totalEstimatedCost: { type: Type.STRING },
      summary: { type: Type.STRING },
      stops: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            day: { type: Type.NUMBER },
            city: { type: Type.STRING },
            activity: { type: Type.STRING },
            demandScore: { type: Type.NUMBER },
            nightsToStay: { type: Type.NUMBER },
            travelTimeFromPrev: { type: Type.STRING },
            estimatedCost: { type: Type.STRING, description: "Estimated cost for this stop (e.g. '$150-$300')" },
            wildcardDetour: {
              type: Type.OBJECT,
              properties: { name: { type: Type.STRING }, description: { type: Type.STRING } },
              required: ["name", "description"]
            },
            localLexicon: {
              type: Type.OBJECT,
              properties: { slang: { type: Type.STRING }, meaning: { type: Type.STRING } },
              required: ["slang", "meaning"]
            },
            regionalSoundtrack: { type: Type.ARRAY, items: { type: Type.STRING } },
            trafficWeatherReport: { type: Type.STRING },
            routeComplexity: { type: Type.STRING, enum: ["Easy", "Moderate", "Challenging"] },
            coordinates: { type: Type.OBJECT, properties: { lat: { type: Type.NUMBER }, lng: { type: Type.NUMBER } } },
            stopSources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  uri: { type: Type.STRING },
                },
                required: ["title", "uri"],
              },
            },
          },
          required: ["day", "city", "activity", "demandScore", "nightsToStay"],
        },
      },
    },
    required: ["routeName", "stops", "summary"],
  };

  const modelConfig = {
    maxOutputTokens: 8192,
    tools: [{ googleSearch: {} }],
    responseMimeType: "application/json",
    responseSchema: itinerarySchema,
  };

  try {
    const response = await callWithRetry(ai, prompt, modelConfig);
    const text = response.text;
    const result = safeJsonParse<Itinerary>(text, {} as Itinerary);
    
    if (!result.routeName || !result.stops) {
        throw new Error("Invalid itinerary format received from AI.");
    }
    
    if (!result.summary) {
        result.summary = "Enjoy your trip! (Note: the summary was truncated).";
    }
    
    result.startDate = data.startDate;
    result.origin = data.origin;
    result.destination = data.destination;
    return result;
  } catch (error: any) {
    console.error("Itinerary generation error:", error);
    throw new Error(error.message || "Route calculation failed.");
  }
};

export const generateMarketInsights = async (): Promise<MarketInsight> => {
    const ai = getClient();
    const today = new Date().toISOString().split('T')[0];
    const prompt = `
      DATE: ${today}.
      You are a professional travel researcher and local expert. Your goal is to give ONLY accurate, up-to-date, and trustworthy recommendations that the user can safely rely on.

      TASK: Generate a general Market Intelligence Report for tourism and events. Focus on travel trends and events happening in the next 90 days.
      
      CRITICAL: Use Google Search to:
      1. VALIDATE travel demand based on real-time search trends and news.
      2. IDENTIFY specific local events (festivals, conventions, sports) that drive tourism demand.
      3. CHECK venue density and competition in top-performing cities.
      4. Cross-reference data points to ensure high accuracy.
      5. Only recommend places that currently exist and have recent positive activity.
    `;
    const insightSchema = {
      type: Type.OBJECT,
      properties: {
        trendingKeywords: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { keyword: { type: Type.STRING }, volume: { type: Type.NUMBER }, growth: { type: Type.STRING } } } },
        topClusters: { 
          type: Type.ARRAY, 
          items: { 
            type: Type.OBJECT, 
            properties: { 
              city: { type: Type.STRING }, 
              score: { type: Type.NUMBER }, 
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              date: { type: Type.STRING, description: "The specific date or month of the projected demand peak." }
            } 
          } 
        },
        seasonalAdvice: { type: Type.STRING },
      },
      required: ["trendingKeywords", "topClusters", "seasonalAdvice"],
    };
    const modelConfig = { maxOutputTokens: 8192, tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: insightSchema };
    try {
      const response = await callWithRetry(ai, prompt, modelConfig);
      const text = response.text;
      return safeJsonParse<MarketInsight>(text, { 
        trendingKeywords: [], 
        topClusters: [], 
        seasonalAdvice: "",
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Market insights error:", error);
      throw error;
    }
};

export const generateMarketSpikes = async (location: string, days: number): Promise<MarketSpike[]> => {
    const ai = getClient();
    const today = new Date().toISOString().split('T')[0];
    const prompt = `
      DATE: ${today}. 
      You are a professional travel researcher and local expert.
      TASK: Identify high-demand travel spikes (events, festivals, holidays) for the next ${days} days. 
      LOCATION: ${location || 'USA'}. 
      
      CRITICAL: Use Google Search to:
      1. FIND specific events, holidays, or festivals that drive tourism spikes on those exact dates.
      2. VALIDATE the intensity of these spikes based on hotel occupancy or ticket sales if possible.
      3. Identify the EXACT reason for each spike.
      4. Only recommend events that actually exist and have up-to-date information.
    `;
    const spikeSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING },
          cities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, reason: { type: Type.STRING }, intensity: { type: Type.STRING, enum: ['high', 'medium', 'low'] }, trend: { type: Type.STRING, enum: ['up', 'down', 'stable'] } }, required: ['name', 'reason', 'intensity', 'trend'] } },
        },
        required: ['date', 'cities'],
      },
    };
    const modelConfig = { maxOutputTokens: 8192, tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: spikeSchema };
    try {
      const response = await callWithRetry(ai, prompt, modelConfig, GEMINI_FLASH_MODEL);
      const text = response.text;
      return safeJsonParse<MarketSpike[]>(text, []);
    } catch (error) {
      console.error("Market spikes error:", error);
      throw error;
    }
};

export const fetchHotelsFromGoogle = async (city: string): Promise<Hotel[]> => {
    const ai = getClient();
    const prompt = `
      TASK: Find top-rated hotels in ${city} that are suitable for wellness-conscious travelers.
      Use Google Search to find real, current hotel data including pricing, ratings, and amenities.
      Return a list of 5-8 hotels.
    `;
    const hotelSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          city: { type: Type.STRING },
          price: { type: Type.NUMBER },
          rating: { type: Type.NUMBER },
          image: { type: Type.STRING },
          amenities: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["id", "name", "city", "price", "rating", "image", "amenities"],
      },
    };
    const modelConfig = { maxOutputTokens: 4096, tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseSchema: hotelSchema };
    try {
      const response = await callWithRetry(ai, prompt, modelConfig, GEMINI_FLASH_MODEL);
      return safeJsonParse<Hotel[]>(response.text, []);
    } catch (error) {
      console.error("Fetch hotels error:", error);
      return [];
    }
};

export const chatWithAI = async (message: string, context?: { itinerary?: Itinerary, formData?: TripFormData }): Promise<string> => {
    const ai = getClient();
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    let contextStr = '';
    if (context?.itinerary) {
        contextStr += `\nCURRENT ITINERARY: ${JSON.stringify(context.itinerary)}`;
    }
    if (context?.formData) {
        contextStr += `\nTRIP PREFERENCES: ${JSON.stringify(context.formData)}`;
        contextStr += `\nFORECAST SETTINGS: ${JSON.stringify(context.formData.forecastSettings)}`;
    }

    const prompt = `
        TODAY'S DATE: ${today}
        ROLE: Professional travel researcher and local expert.
        GOAL: Give ONLY accurate, up-to-date, and trustworthy recommendations that the user can safely rely on.

        Rules you MUST follow for every recommendation:
        - Only recommend places that currently exist and have recent positive activity (within the last 6–12 months).
        - Always verify using real-time search before suggesting anything.
        - Never invent names, addresses, ratings, or details.
        - If you are not 100% sure, clearly say "I recommend double-checking this on Google Maps before visiting."
        - Prioritize highly-rated places (4.5+ stars) that locals actually like, not just tourist traps.
        - Consider the user's exact route, preferences, budget, travel style, and dates.
        
        ${contextStr}
        
        USER QUESTION: ${message}
    `;

    const modelConfig = {
        maxOutputTokens: 2048,
        tools: [{ googleSearch: {} }],
    };

    try {
        const response = await callWithRetry(ai, prompt, modelConfig, GEMINI_MODEL);
        return response.text;
    } catch (error: any) {
        console.error("Chat error:", error);
        return "I'm sorry, I encountered an error while processing your request. Please try again.";
    }
};
