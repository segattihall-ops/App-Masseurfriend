import { TravelMode, TripFormData, AppSettings } from './types';

export const DEFAULT_FORM_DATA: TripFormData = {
  origin: '',
  destination: '',
  destinationDate: '',
  startDate: '',
  endDate: '',
  duration: undefined,
  mandatoryStops: [],
  numberOfStops: 4,
  maxDriveHours: 0, // 0 represents 'Auto'
  travelMode: TravelMode.Car,
  routePreference: 'fastest',
  interests: [],
  budgetLevel: 'medium',
  mixedTravelLegs: [],
  minimumScore: 0,
  forecastSettings: {
    forecastWindow: 60,
    accuracyTarget: 85,
    useProphet: true,
    strategicMode: true
  }
};

export const DEFAULT_SETTINGS: AppSettings = {
  defaultTravelMode: TravelMode.Car,
  units: 'imperial',
  currency: 'USD'
};

export const GEMINI_MODEL = 'gemini-3.1-pro-preview';
export const GEMINI_FLASH_MODEL = 'gemini-3-flash-preview';