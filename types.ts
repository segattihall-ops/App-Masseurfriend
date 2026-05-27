export enum TravelMode {
  Car = 'Car',
  Bus = 'Bus',
  Plane = 'Plane',
  Mixed = 'Mixed'
}

export type RoutePreference = 'fastest' | 'scenic' | 'avoidTolls';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Stop {
  city: string;
  day: number;
  activity: string;
  profitabilityJustification: string;
  demandScore: number; // 0-100
  trendVelocity: string;
  clusterInfo?: {
    anchorCity: string;
    clusterVolume: string;
  };
  travelToNext: string;
  travelTimeFromPrev?: string;
  transportMode?: string;
  trafficCondition?: string;
  nightsToStay: number;
  targetArrivalDate?: string;
  estimatedCost?: string;
  wildcardDetour?: {
    name: string;
    description: string;
  };
  localLexicon?: {
    slang: string;
    meaning: string;
  };
  regionalSoundtrack?: string[];
  trafficWeatherReport?: string;
  routeComplexity?: 'Easy' | 'Moderate' | 'Challenging';
  coordinates?: {
    lat: number;
    lng: number;
  };
  stopSources?: GroundingSource[]; // Sources specific to this city/stop
}

export interface Itinerary {
  origin?: string;
  destination?: string;
  routeName: string;
  totalDistance: string;
  totalDuration: string;
  totalEstimatedCost?: string;
  stops: Stop[];
  summary: string;
  startDate?: string;
  travelMode?: TravelMode;
  sources?: GroundingSource[];
}

export interface MandatoryStop {
  location: string;
  date?: string;
  arrivalDate?: string;
  nights?: number;
}

export interface MixedTravelLeg {
  id: string;
  mode: string; // e.g., 'Flight', 'Car', 'Train'
  description: string; // e.g., 'JFK to LHR'
  estimatedDuration: string; // e.g., '7h'
}

export interface TripFormData {
  origin: string;
  destination: string;
  destinationDate: string;
  startDate: string;
  endDate: string;
  duration?: number;
  mandatoryStops: MandatoryStop[];
  numberOfStops?: number;
  maxDriveHours?: number;
  travelMode: TravelMode;
  travelModeDetail?: string;
  mixedTravelLegs: MixedTravelLeg[];
  routePreference: RoutePreference;
  minimumScore: number;
  keywords?: string;
  interests?: string[];
  budgetLevel?: 'low' | 'medium' | 'high';
  forecastSettings: {
    forecastWindow: number; // 30, 60, 90
    accuracyTarget: number; // 0-100
    useProphet: boolean;
    strategicMode: boolean;
  };
}

export interface MarketInsight {
  trendingKeywords: {
    keyword: string;
    volume: number;
    growth: string;
  }[];
  topClusters: {
    city: string;
    score: number;
    tags: string[];
    date?: string;
  }[];
  seasonalAdvice: string;
  lastUpdated: string;
}

export interface MarketSpike {
  date: string;
  cities: {
    name: string;
    reason: string;
    intensity: 'high' | 'medium' | 'low';
    trend: 'up' | 'down' | 'stable';
  }[];
}

export type ViewMode = 'planner' | 'insights' | 'profile' | 'spikes' | 'forecast' | 'hotels' | 'services' | 'community' | 'bnb';

export interface AppSettings {
  defaultTravelMode: TravelMode;
  units: 'imperial' | 'metric';
  currency: string;
}

export interface SavedTrip {
  id: string;
  name: string;
  createdDate: string;
  formData: TripFormData;
  itinerary: Itinerary;
}

export interface Hotel {
  id: string;
  name: string;
  city: string;
  price: number;
  rating: number;
  image: string;
  amenities: string[];
}

export interface ServiceListing {
  id: string;
  providerName: string;
  category: 'Barber' | 'Nail' | 'Wax' | 'Food Prep' | 'Studio Rental' | 'Other';
  city: string;
  description: string;
  price: number;
  rating: number;
  contact: string;
  imageUrl?: string;
}

export interface ForumPost {
  id: string;
  authorName: string;
  authorId: string;
  title: string;
  content: string;
  category: string;
  createdAt: any;
  replies: number;
  likes: number;
}

export interface BnBListing {
  id: string;
  hostName: string;
  city: string;
  title: string;
  description: string;
  pricePerNight: number;
  category: string;
  image: string;
  rating: number;
  reviews: { author: string; comment: string; rating: number }[];
}

export type ValidationErrors = Record<string, { message: string; suggestion: string }>;
