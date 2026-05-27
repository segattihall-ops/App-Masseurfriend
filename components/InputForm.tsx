import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, MapPin, Calendar, Clock, Car, Bus, Plane, Shuffle, Search, Info, Edit2, Check, ChevronDown, AlertCircle, Sparkles, Trash2, Moon, Locate, LocateFixed, Train, Compass } from 'lucide-react';
import { TripFormData, TravelMode, MandatoryStop, ValidationErrors, MixedTravelLeg } from '../types';
import { DEFAULT_FORM_DATA } from '../constants';
import { CustomDatePicker } from './CustomDatePicker';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { validateTripData } from '../utils/validation';

import { analytics } from '../services/analytics';

interface InputFormProps {
  initialData: TripFormData;
  importedData?: TripFormData | null;
  onSubmit: (data: TripFormData, isAlternative: boolean) => void;
  isLoading: boolean;
  validationErrors?: ValidationErrors;
}

const STORAGE_KEY = 'roadTripPro_formData';

const EMPTY_STOP: MandatoryStop = { location: '' };

const POPULAR_CITIES = [
  "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Phoenix, AZ"
];

// Helper for robust ID generation across environments
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback
    }
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const InputForm: React.FC<InputFormProps> = ({ initialData, importedData, onSubmit, isLoading, validationErrors }) => {
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);

  useEffect(() => {
    if (!placesLib) return;
    setAutocompleteService(new placesLib.AutocompleteService());
  }, [placesLib]);

  useEffect(() => {
    if (!geocodingLib) return;
    setGeocoder(new geocodingLib.Geocoder());
  }, [geocodingLib]);

  const getSuggestions = useCallback(async (input: string) => {
    if (!autocompleteService || !input || input.length < 2) return [];
    try {
      const response = await autocompleteService.getPlacePredictions({
        input,
        types: ['(cities)']
      });
      return response.predictions.map(p => p.description);
    } catch (e) {
      console.error("Autocomplete error:", e);
      return [];
    }
  }, [autocompleteService]);

  // Initialize state from localStorage or fall back to initialData
  const [formData, setFormData] = useState<TripFormData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return initialData;
      
      const parsed = JSON.parse(saved);
      // Merge with default and ensure no nulls for controlled inputs
      return {
        ...DEFAULT_FORM_DATA,
        ...parsed,
        origin: parsed.origin ?? '',
        destination: parsed.destination ?? '',
        destinationDate: parsed.destinationDate ?? '',
        startDate: parsed.startDate ?? '',
        endDate: parsed.endDate ?? '',
        numberOfStops: parsed.numberOfStops || 4,
        maxDriveHours: parsed.maxDriveHours || 0,
        minimumScore: parsed.minimumScore || 0,
        forecastSettings: {
          ...DEFAULT_FORM_DATA.forecastSettings,
          ...(parsed.forecastSettings || {})
        },
        mixedTravelLegs: (parsed.mixedTravelLegs || []).map((leg: any) => ({
          ...leg,
          mode: leg.mode ?? 'Flight',
          description: leg.description ?? '',
          estimatedDuration: leg.estimatedDuration ?? ''
        }))
      };
    } catch (e) {
      console.warn('Failed to load form data from local storage', e);
      return initialData;
    }
  });

  // Effect to load imported data (from Saved Trips)
  useEffect(() => {
    if (importedData) {
        setFormData(importedData);
    }
  }, [importedData]);

  // Modal State
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null); // null means adding new
  const [tempStop, setTempStop] = useState<MandatoryStop>(EMPTY_STOP);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<{ message: string; suggestion: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Autocomplete State for Stop Modal
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Autocomplete State for Origin
  const [originSuggestions, setOriginSuggestions] = useState<string[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);

  // Autocomplete State for Destination
  const [destSuggestions, setDestSuggestions] = useState<string[]>([]);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [localValidationErrors, setLocalValidationErrors] = useState<ValidationErrors>({});
  const [tempStopErrors, setTempStopErrors] = useState<ValidationErrors>({});

  // Merge prop errors with local errors
  const allValidationErrors = { ...validationErrors, ...localValidationErrors };

  // Persist to localStorage whenever formData changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    } catch (e) {
      console.warn('Failed to save form data to local storage', e);
    }
  }, [formData]);

  const handleChange = (field: keyof TripFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // --- Mixed Mode Legs Logic ---
  const addLeg = () => {
      const newLeg: MixedTravelLeg = {
          id: generateId(),
          mode: 'Flight',
          description: '',
          estimatedDuration: ''
      };
      handleChange('mixedTravelLegs', [...(formData.mixedTravelLegs || []), newLeg]);
  };

  const updateLeg = (id: string, field: keyof MixedTravelLeg, value: string) => {
      const updated = (formData.mixedTravelLegs || []).map(leg => 
          leg.id === id ? { ...leg, [field]: value } : leg
      );
      handleChange('mixedTravelLegs', updated);
  };

  const deleteLeg = (id: string) => {
      const updated = (formData.mixedTravelLegs || []).filter(leg => leg.id !== id);
      handleChange('mixedTravelLegs', updated);
  };

  // --- Geolocation Logic ---
  const performGeolocation = useCallback((isAuto: boolean) => {
    // Clear previous errors before starting
    setLocationError(null);
    
    if (!navigator.geolocation) {
      if (!isAuto) setLocationError({
        message: "Geolocation is not supported by your browser",
        suggestion: "Please try manually entering your location or use a different browser."
      });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const latLng = { lat: latitude, lng: longitude };
        
        try {
            // Priority 1: Use Google Geocoder if available
            if (geocoder) {
              const res = await geocoder.geocode({ location: latLng });
              if (res.results && res.results.length > 0) {
                // Try to find the city/state from address components
                const result = res.results[0];
                let city = '';
                let state = '';
                
                for (const component of result.address_components) {
                  if (component.types.includes('locality')) {
                    city = component.long_name;
                  } else if (component.types.includes('administrative_area_level_1')) {
                    state = component.short_name;
                  }
                }

                if (city) {
                  const locString = state ? `${city}, ${state}` : city;
                  setFormData(prev => ({ ...prev, origin: locString }));
                  analytics.trackEvent('geolocation_success', { location: locString, provider: 'google' });
                  setIsLocating(false);
                  return;
                }
              }
            }

            // Priority 2: Fallback to BigDataCloud API if Google fails or is unavailable
            const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            
            if (!response.ok) throw new Error('Geocoding failed');
            
            const data = await response.json();
            
            // Extract meaningful names with fallbacks
            const city = data.city || data.locality || '';
            const state = data.principalSubdivisionCode || data.principalSubdivision || '';
            const country = data.countryCode || '';

            let locString = '';

            if (city) {
                locString = city;
                if (state) locString += `, ${state}`;
                else if (country) locString += `, ${country}`;
            } else if (state) {
                 locString = `${state}, ${country}`;
            }

            if (!locString.trim()) {
                 locString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            }

            setFormData(prev => ({ ...prev, origin: locString }));
            analytics.trackEvent('geolocation_success', { location: locString, provider: 'bigdatacloud' });
        } catch (error) {
            console.warn("Reverse geocoding failed", error);
            const locString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setFormData(prev => ({ ...prev, origin: locString }));
            analytics.trackEvent('geolocation_success', { location: locString, geocodingFailed: true });
        } finally {
            setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        if (!isAuto) {
            let msg = "Unable to retrieve location.";
            let suggestion = "Enter location manually";
            
            if (error.code === 1) {
                msg = "Location access is blocked";
                suggestion = "Please allow location access in your browser settings (look for a lock icon in the address bar) and try again.";
            } else if (error.code === 2) {
                msg = "Position unavailable";
                suggestion = "We couldn't get a location fix. Try checking your internet connection or GPS settings.";
            } else if (error.code === 3) {
                msg = "Request timed out";
                suggestion = "The location request took too long. Please try again or enter your city manually.";
            }
            
            setLocationError({ message: msg, suggestion });
            analytics.trackEvent('geolocation_failed', { error: msg, code: error.code });
        }
        setIsLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, [geocoder]);

  useEffect(() => {
    if (!formData.origin) {
        performGeolocation(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geocoder]);

  const handleGeolocationClick = () => {
    performGeolocation(false);
  };

  // --- Modal Logic ---

  const openAddStopModal = () => {
    setTempStop({ ...EMPTY_STOP });
    setSuggestions([]);
    setShowSuggestions(false);
    setEditingIndex(null);
    setTempStopErrors({});
    setIsStopModalOpen(true);
  };

  const openEditStopModal = (index: number) => {
    setTempStop({ ...formData.mandatoryStops[index] });
    setSuggestions([]);
    setShowSuggestions(false);
    setEditingIndex(index);
    setTempStopErrors({});
    setIsStopModalOpen(true);
  };

  const handleTempStopChange = (field: keyof MandatoryStop, value: string | number) => {
    setTempStop(prev => ({ ...prev, [field]: value }));
  };

  // Stop Autocomplete Logic
  const handleCityInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleTempStopChange('location', value);

    if (value.length > 1) {
      const filtered = await getSuggestions(value);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (city: string) => {
    handleTempStopChange('location', city);
    setShowSuggestions(false);
  };

  // Origin Autocomplete Logic
  const handleOriginChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleChange('origin', value);

    if (value.length > 1) {
      const filtered = await getSuggestions(value);
      setOriginSuggestions(filtered);
      setShowOriginSuggestions(filtered.length > 0);
    } else {
      setOriginSuggestions([]);
      setShowOriginSuggestions(false);
    }
  };

  const selectOriginSuggestion = (city: string) => {
    handleChange('origin', city);
    setShowOriginSuggestions(false);
  };

  // Destination Autocomplete Logic
  const handleDestinationChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleChange('destination', value);

    if (value.length > 1) {
      const filtered = await getSuggestions(value);
      setDestSuggestions(filtered);
      setShowDestSuggestions(filtered.length > 0);
    } else {
      setDestSuggestions([]);
      setShowDestSuggestions(false);
    }
  };
  
  const selectDestSuggestion = (city: string) => {
    handleChange('destination', city);
    setShowDestSuggestions(false);
  };

  const validateStop = (stop: MandatoryStop): ValidationErrors => {
    const errors: ValidationErrors = {};
    const tripStart = formData.startDate ? new Date(`${formData.startDate}T00:00:00Z`) : null;
    const tripEnd = formData.endDate ? new Date(`${formData.endDate}T00:00:00Z`) : null;

    if (!stop.location || stop.location.trim().length < 2) {
      errors.location = { 
        message: "Location required", 
        suggestion: "Please enter a valid city name (e.g. Austin, TX)" 
      };
    }

    const dateStr = stop.arrivalDate || stop.date;
    if (dateStr && tripStart && tripEnd) {
      const stopDate = new Date(`${dateStr}T00:00:00Z`);
      if (stopDate < tripStart || stopDate > tripEnd) {
        errors.arrivalDate = { 
          message: "Out of range", 
          suggestion: `Date must be between ${formData.startDate} and ${formData.endDate}` 
        };
      }
    }

    if (stop.nights !== undefined && (stop.nights < 1 || stop.nights > 14)) {
      errors.nights = { 
        message: "Invalid duration", 
        suggestion: "Stay must be between 1 and 14 nights" 
      };
    }

    return errors;
  };

  const saveStop = () => {
    const errors = validateStop(tempStop);
    if (Object.keys(errors).length > 0) {
      setTempStopErrors(errors);
      return;
    }

    const newStops = [...formData.mandatoryStops];
    if (editingIndex !== null) {
      newStops[editingIndex] = tempStop;
    } else {
      newStops.push(tempStop);
    }
    handleChange('mandatoryStops', newStops);
    setIsStopModalOpen(false);
    setTempStopErrors({});
  };

  const removeStop = (index: number) => {
    const newStops = formData.mandatoryStops.filter((_, i) => i !== index);
    handleChange('mandatoryStops', newStops);
  };

  const deleteCurrentStop = () => {
    if (editingIndex !== null) {
      removeStop(editingIndex);
    }
    setIsStopModalOpen(false);
  };

  // --- Helper Renderers ---

  const getModeIcon = (mode: string) => {
    // Normalizes input to handle cases like 'Train' vs 'train'
    const normalizedMode = mode?.toLowerCase() || '';
    if (normalizedMode.includes('car')) return <Car className="w-5 h-5" />;
    if (normalizedMode.includes('bus')) return <Bus className="w-5 h-5" />;
    if (normalizedMode.includes('plane') || normalizedMode.includes('flight')) return <Plane className="w-5 h-5" />;
    if (normalizedMode.includes('train')) return <Train className="w-5 h-5" />;
    return <Shuffle className="w-5 h-5" />;
  };

  const renderError = (fieldName: string, errors: ValidationErrors | undefined = allValidationErrors) => {
      if (!errors || !errors[fieldName]) return null;
      const err = errors[fieldName];
      
    // Enhanced suggestions for location-related fields
    let suggestion = err.suggestion;
    const msg = err.message.toLowerCase();
    
    if (!suggestion) {
      if (fieldName === 'location' || fieldName === 'origin' || fieldName === 'destination') {
        if (msg.includes('denied') || msg.includes('permission')) {
          suggestion = "Try enabling location services in your browser settings (click the lock icon in the address bar) or enter the location manually.";
        } else if (msg.includes('failed') || msg.includes('unavailable') || msg.includes('geocoding')) {
          suggestion = "Geocoding failed. Please check your internet connection or enter the location manually.";
        } else if (msg.includes('timeout')) {
          suggestion = "The request timed out. Please try again or enter the location manually.";
        } else if (msg.includes('required')) {
          suggestion = `Please provide a ${fieldName} to help us map the best route for your journey.`;
        }
      } else if (fieldName === 'startDate') {
         if (msg.includes('required')) {
            suggestion = 'Please select a valid start date for your trip to ensure accurate route availability and weather forecasting.';
         } else if (msg.includes('past')) {
            suggestion = 'Start date cannot be in the past. Please select today or a future date.';
         }
      } else if (fieldName === 'endDate') {
         if (msg.includes('required')) {
            suggestion = 'Please select a return date so the AI knows the total timeframe to optimize stops.';
         } else if (msg.includes('before') || msg.includes('after')) {
            suggestion = 'The return date must obviously fall after the start date. Please adjust.';
         }
      } else if (fieldName === 'duration') {
         if (msg.includes('invalid') || msg.includes('number')) {
            suggestion = 'Duration must be a positive number of days (e.g., 5).';
         }
      }
    }

      return (
          <div className="mt-2 flex items-start gap-2 animate-in slide-in-from-top-1 fade-in duration-300">
             <div className="min-w-[4px] h-full bg-red-400 rounded-full mt-1"></div>
             <div>
                <p className="text-xs font-bold text-red-600 leading-tight">{err.message}</p>
                <p className="text-[10px] text-red-400 font-medium mt-0.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 flex-none" />
                  <span className="leading-tight">{suggestion}</span>
                </p>
             </div>
          </div>
      );
  };

  const getInputClass = (fieldName: string, baseClass: string, errors: ValidationErrors | undefined = allValidationErrors) => {
      const hasError = errors && errors[fieldName];
      return `${baseClass} ${hasError ? 'bg-red-50/50 text-red-900 placeholder-red-300 border-red-200' : 'bg-transparent text-gray-900 placeholder-gray-400'}`;
  };

  const getContainerClass = (fieldName: string, baseClass: string, errors: ValidationErrors | undefined = allValidationErrors) => {
       const hasError = errors && errors[fieldName];
       return `${baseClass} ${hasError ? 'bg-red-50 border-red-200' : ''}`;
  };

  const validateStops = () => {
    const errors: string[] = [];
    const tripStart = new Date(formData.startDate);
    const tripEnd = new Date(formData.endDate);

    formData.mandatoryStops.forEach((stop, index) => {
      const dateStr = stop.date || stop.arrivalDate;
      if (dateStr) {
        const stopDate = new Date(dateStr);
        if (stopDate < tripStart || stopDate > tripEnd) {
          errors.push(`Stop ${index + 1} (${stop.location}) must be between trip dates.`);
        }
      }
    });
    return errors;
  };

  const onFormSubmitClick = (e: React.FormEvent, isAlt: boolean = false) => {
    e.preventDefault();
    setFormError(null);
    setLocalValidationErrors({});

    // 1. Client-side Validation (Primary check)
    const errors = validateTripData(formData);
    if (Object.keys(errors).length > 0) {
      setLocalValidationErrors(errors);
      // Scroll to the first error if possible, or just let users see them
      return;
    }

    // 2. Validate stops specifically for inter-date consistency (secondary)
    const stopErrors = validateStops();
    if (stopErrors.length > 0) {
      setFormError(stopErrors.join(' '));
      return;
    }

    onSubmit(formData, isAlt);
  };

  return (
    <div className="h-auto lg:h-full flex flex-col bg-white relative">
      <div className="p-4 lg:p-6 pb-2 border-b border-gray-100 lg:border-none flex items-center justify-between sticky top-0 bg-white z-40 lg:relative lg:z-auto">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-800">Road Trip</h2>
          <p className="text-gray-500 text-[10px] lg:text-sm mt-1">AI-powered multi-city journey planning.</p>
        </div>
        {/* Mobile Jump to Results Button */}
        <button 
          onClick={() => document.getElementById('itinerary-results')?.scrollIntoView({ behavior: 'smooth' })}
          className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-[10px] font-bold transition-all border border-gray-200"
        >
          <Compass className="w-3.5 h-3.5" />
          Results
        </button>
      </div>

      <div className="px-4 lg:px-6 py-2">
        {/* AI Intelligence Badge */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="bg-[#FF385C] p-1.5 rounded-lg text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#FF385C] uppercase tracking-wider">AI Intelligence 10x</p>
              <p className="text-[8px] lg:text-[10px] text-gray-500">Forecast-Driven & 85% Accuracy Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-red-100">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[8px] font-bold text-gray-600 uppercase">Perfection</span>
          </div>
        </div>
      </div>

      <div className="flex-none lg:flex-1 lg:overflow-y-auto p-4 lg:p-6 space-y-6 custom-scrollbar">
        {/* Origin & Destination Card */}
        <div className={`bg-white border rounded-2xl shadow-[0_6px_16px_rgba(0,0,0,0.08)] overflow-visible transition-colors border-gray-200 z-30 relative`}>
          {/* Origin */}
          <div className={getContainerClass('origin', 'relative p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors rounded-t-2xl z-50')}>
            <div className="flex justify-between items-center mb-1">
                <label className={`text-[10px] font-bold uppercase tracking-wider block ${allValidationErrors?.origin ? 'text-red-500' : 'text-gray-500'}`}>Origin</label>
                {isLocating && (
                    <span className="text-[10px] font-bold text-blue-500 flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                        Fetching location...
                    </span>
                )}
            </div>
            <div className="flex items-center gap-2 relative">
                <input
                type="text"
                value={formData.origin || ''}
                onChange={handleOriginChange}
                onBlur={() => setTimeout(() => setShowOriginSuggestions(false), 200)}
                className={getInputClass('origin', "w-full font-semibold text-lg focus:outline-none")}
                placeholder="Where are you starting from?"
                />
                <button 
                  onClick={handleGeolocationClick}
                  disabled={isLocating}
                  className={`p-2 rounded-full transition-colors ${isLocating ? 'bg-blue-50 text-blue-400' : 'hover:bg-gray-100 text-gray-400 hover:text-[#FF385C]'}`}
                  title="Use Current Location"
                >
                    {isLocating ? <LocateFixed className="w-5 h-5 animate-spin text-blue-500" /> : <Locate className="w-5 h-5" />}
                </button>
            </div>

            {/* Origin Autocomplete Dropdown */}
            {showOriginSuggestions && originSuggestions.length > 0 && (
                <ul className="absolute left-0 top-full z-50 w-full bg-white border border-gray-200 rounded-b-xl shadow-xl max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 mt-1">
                {originSuggestions.map((city, idx) => (
                    <li 
                        key={`${city}-${idx}`}
                        onMouseDown={() => selectOriginSuggestion(city)}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm font-bold text-gray-700 border-b border-gray-50 last:border-none flex items-center gap-2 group transition-colors"
                    >
                        <div className="bg-gray-100 p-1 rounded-full group-hover:bg-[#FF385C] group-hover:text-white transition-colors">
                            <MapPin className="w-3 h-3" />
                        </div>
                        {city}
                    </li>
                ))}
                </ul>
            )}
            
            {locationError && (
                 <div className="mt-3 p-3 bg-red-50/80 border border-red-200 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-1 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-400"></div>
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 pr-6">
                        <h4 className="text-xs font-bold text-red-700 mb-0.5">{locationError.message}</h4>
                        <p className="text-[11px] font-medium text-red-600/90 leading-relaxed">
                          {locationError.suggestion}
                        </p>
                        <button 
                          onClick={() => performGeolocation(false)}
                          className="mt-2 text-[10px] font-bold text-red-700 underline hover:text-red-900 transition-colors"
                        >
                          Try Again
                        </button>
                    </div>
                    <button 
                        onClick={() => setLocationError(null)}
                        className="absolute right-2 top-2 p-1 hover:bg-red-100 rounded-md text-red-400 hover:text-red-600 transition-colors"
                        aria-label="Dismiss"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                 </div>
            )}
            
            {renderError('origin')}
          </div>

          {/* Destination */}
          <div className={getContainerClass('destination', 'relative p-4 hover:bg-gray-50 transition-colors z-40')}>
            <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${allValidationErrors?.destination ? 'text-red-500' : 'text-gray-500'}`}>Destination</label>
            <div className="relative">
                <input
                    type="text"
                    value={formData.destination || ''}
                    onChange={handleDestinationChange}
                    onBlur={() => setTimeout(() => setShowDestSuggestions(false), 200)}
                    className={getInputClass('destination', "w-full font-semibold text-lg focus:outline-none")}
                    placeholder="Where are you heading?"
                />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                     {allValidationErrors?.destination ? <AlertCircle className="w-5 h-5 text-red-500" /> : <MapPin className="w-5 h-5 text-gray-400" />}
                </div>

                {/* Destination Autocomplete Dropdown */}
                {showDestSuggestions && destSuggestions.length > 0 && (
                    <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl mt-2 shadow-xl max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                    {destSuggestions.map((city, idx) => (
                        <li 
                            key={`${city}-${idx}`}
                            onMouseDown={() => selectDestSuggestion(city)}
                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm font-bold text-gray-700 border-b border-gray-50 last:border-none flex items-center gap-2 group transition-colors"
                        >
                            <div className="bg-gray-100 p-1 rounded-full group-hover:bg-[#FF385C] group-hover:text-white transition-colors">
                                <MapPin className="w-3 h-3" />
                            </div>
                            {city}
                        </li>
                    ))}
                    </ul>
                )}
            </div>
             {renderError('destination')}
          </div>
           {/* Destination Date */}
           <div className="relative p-4 border-t border-gray-100 hover:bg-gray-50 transition-colors bg-gray-50/50 rounded-b-2xl">
            <CustomDatePicker 
              label="Target Arrival Date (Optional)"
              value={formData.destinationDate || ''}
              onChange={(val) => handleChange('destinationDate', val)}
              placeholder="Select arrival date"
              inputClassName={getInputClass('destinationDate', "w-full font-semibold text-lg focus:outline-none")}
              icon={<Calendar className={`w-4 h-4 ${allValidationErrors?.destinationDate ? 'text-red-400' : 'text-gray-400'}`} />}
              hasError={!!allValidationErrors?.destinationDate}
            />
            {renderError('destinationDate')}
          </div>
        </div>

        {/* Dates Card */}
        <div className={`bg-white border rounded-2xl shadow-[0_6px_16px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col transition-colors border-gray-200`}>
           <div className="flex sm:flex-row flex-col">
              <div className={getContainerClass('startDate', 'flex-1 p-4 border-b sm:border-b-0 sm:border-r border-gray-100 hover:bg-gray-50 transition-colors')}>
                <div className="flex justify-between mb-1">
                    <label className={`text-[10px] font-bold uppercase tracking-wider block ${allValidationErrors?.startDate ? 'text-red-500' : 'text-gray-500'}`}>Start Date</label>
                    {allValidationErrors?.startDate && <AlertCircle className="w-3 h-3 text-red-500" />}
                </div>
                <CustomDatePicker 
                  value={formData.startDate || ''}
                  onChange={(val) => handleChange('startDate', val)}
                  placeholder="Select start"
                  className="w-full"
                  inputClassName={getInputClass('startDate', "w-full font-semibold text-lg focus:outline-none")}
                  icon={<Calendar className={`w-4 h-4 ${allValidationErrors?.startDate ? 'text-red-400' : 'text-gray-400'}`} />}
                  hasError={!!allValidationErrors?.startDate}
                />
                {renderError('startDate')}
              </div>
              <div className={getContainerClass('endDate', 'flex-1 p-4 hover:bg-gray-50 transition-colors')}>
                <div className="flex justify-between mb-1">
                    <label className={`text-[10px] font-bold uppercase tracking-wider block ${allValidationErrors?.endDate ? 'text-red-500' : 'text-gray-500'}`}>Return Date</label>
                    {allValidationErrors?.endDate && <AlertCircle className="w-3 h-3 text-red-500" />}
                </div>
                <CustomDatePicker 
                  value={formData.endDate || ''}
                  onChange={(val) => handleChange('endDate', val)}
                  placeholder="Select return"
                  className="w-full"
                  align="right"
                  inputClassName={getInputClass('endDate', "w-full font-semibold text-lg focus:outline-none")}
                  icon={<Calendar className={`w-4 h-4 ${allValidationErrors?.endDate ? 'text-red-400' : 'text-gray-400'}`} />}
                  hasError={!!allValidationErrors?.endDate}
                />
                {renderError('endDate')}
              </div>
           </div>
        </div>

        {/* Duration Card (Optional) */}
        <div className={`bg-white border rounded-2xl shadow-[0_6px_16px_rgba(0,0,0,0.08)] p-4 transition-colors border-gray-200`}>
          <div className="flex justify-between mb-1">
              <label className={`text-[10px] font-bold uppercase tracking-wider block ${allValidationErrors?.duration ? 'text-red-500' : 'text-gray-500'}`}>Trip Duration (Optional)</label>
              {allValidationErrors?.duration && <AlertCircle className="w-3 h-3 text-red-500" />}
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 p-2 rounded-lg">
              <Clock className="w-4 h-4 text-gray-400" />
            </div>
            <input 
              type="number"
              min="1"
              max="30"
              value={formData.duration || ''}
              onChange={(e) => handleChange('duration', parseInt(e.target.value) || undefined)}
              placeholder="Number of days"
              className={getInputClass('duration', "w-full font-semibold text-lg focus:outline-none bg-transparent")}
            />
            <span className="text-sm font-bold text-gray-400">Days</span>
          </div>
          {renderError('duration')}
          <p className="text-[10px] text-gray-400 mt-2 italic">Specify days if you want AI to suggest a destination for a specific length of time.</p>
        </div>

        {/* Mandatory Stops */}
        <div>
          <div className="flex items-center justify-between mb-3">
             <label className="text-sm font-bold text-gray-800">Must-visit Cities</label>
          </div>
          
          <div className="space-y-3">
            {formData.mandatoryStops.map((stop, index) => {
              const hasError = allValidationErrors && allValidationErrors[`stop_${index}`];
              return (
                <div key={index} className="flex flex-col">
                    <div 
                        onClick={() => openEditStopModal(index)}
                        className={`bg-white border ${hasError ? 'border-red-300' : 'border-gray-200'} hover:border-[#FF385C] rounded-xl p-3 flex items-center justify-between group cursor-pointer transition-all shadow-sm hover:shadow-md`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${hasError ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500 group-hover:bg-[#FF385C] group-hover:text-white'}`}>
                            <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                            <h4 className={`text-sm font-bold leading-tight ${hasError ? 'text-red-700' : 'text-gray-900'}`}>{stop.location || 'Untitled Stop'}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-gray-500 font-medium bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                    {stop.arrivalDate || stop.date || 'Flexible'}
                                </span>
                                <span className="text-[10px] text-gray-500 font-medium">
                                    {stop.nights} Night{stop.nights !== 1 ? 's' : ''}
                                </span>
                            </div>
                            </div>
                        </div>
                        <div className="text-gray-300 group-hover:text-[#FF385C]">
                            <Edit2 className="w-4 h-4" />
                        </div>
                    </div>
                    {hasError && (
                        <div className="mt-1 ml-2 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1">
                            <div className="flex items-center gap-1.5">
                                <AlertCircle className="w-3 h-3 text-red-500" />
                                <span className="text-xs font-bold text-red-600">{allValidationErrors[`stop_${index}`].message}</span>
                            </div>
                            {allValidationErrors[`stop_${index}`].suggestion && (
                                <div className="flex items-center gap-1 ml-5">
                                    <Sparkles className="w-2.5 h-2.5 text-red-400" />
                                    <span className="text-[10px] text-red-400 font-medium">{allValidationErrors[`stop_${index}`].suggestion}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
              );
            })}
            
            <button
              onClick={openAddStopModal}
              className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 font-bold text-sm hover:border-[#FF385C] hover:text-[#FF385C] hover:bg-[#FF385C]/5 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Mandatory Stop
            </button>
          </div>
        </div>

        {/* Preferences */}
        <div>
           <label className="text-sm font-bold text-gray-800 mb-3 block">Travel Preferences</label>
           <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-5">
              
              {/* Travel Mode */}
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Mode of Transport</span>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {Object.values(TravelMode).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => handleChange('travelMode', mode)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                        formData.travelMode === mode
                          ? 'bg-gray-900 border-gray-900 text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {getModeIcon(mode)}
                      <span className="text-[10px] font-bold mt-1">{mode}</span>
                    </button>
                  ))}
                </div>

                {/* Route Preference (Car/Mixed) */}
                {(formData.travelMode === TravelMode.Car || formData.travelMode === TravelMode.Mixed) && (
                    <div className="mb-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Route Preference</span>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'fastest', label: 'Fastest' },
                                { id: 'scenic', label: 'Scenic Route' },
                                { id: 'avoidTolls', label: 'No Tolls' }
                            ].map((pref) => (
                            <button
                                key={pref.id}
                                onClick={() => handleChange('routePreference', pref.id)}
                                className={`py-2.5 px-1 rounded-xl text-[10px] sm:text-xs font-bold uppercase transition-all border flex items-center justify-center text-center leading-tight ${
                                formData.routePreference === pref.id 
                                ? 'bg-white border-gray-300 text-gray-900 shadow-sm ring-1 ring-gray-200' 
                                : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                                }`}
                            >
                                {pref.label}
                            </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Keywords / Themes */}
                <div className="mb-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Trip Keywords & Themes (Optional)</span>
                    <input
                        type="text"
                        placeholder="e.g. food, tech, history, spooky, nature"
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                        value={formData.keywords || ''}
                        onChange={(e) => handleChange('keywords', e.target.value)}
                    />
                    <p className="text-[10px] text-gray-400 mt-1.5 ml-1 leading-snug">
                        Use keywords to influence the type of locations, activities, and overall vibe the AI generates.
                    </p>
                </div>

                {/* Interests */}
                <div className="mb-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Interests (Comma separated)</span>
                    <input
                        type="text"
                        placeholder="e.g. national parks, live music, fine dining"
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF385C]"
                        value={formData.interests?.join(', ') || ''}
                        onChange={(e) => handleChange('interests', e.target.value.split(',').map(i => i.trim()))}
                    />
                </div>

                {/* Budget */}
                <div className="mb-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Budget Level</span>
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => handleChange('budgetLevel', level)}
                          className={`flex-1 py-2 px-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-all border ${
                            formData.budgetLevel === level
                            ? 'bg-white border-gray-300 text-gray-900 shadow-sm ring-1 ring-gray-200'
                            : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                </div>

                {/* Minimum Market Score */}
                <div className="mb-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Min. Destination Score</span>
                        <span className="text-xs font-bold text-[#FF385C]">{formData.minimumScore > 0 ? `${formData.minimumScore}+` : 'Any'}</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="90"
                        step="10"
                        value={formData.minimumScore || 0}
                        onChange={(e) => handleChange('minimumScore', parseInt(e.target.value) || 0)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF385C]"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 font-medium mt-1">
                        <span>Any</span>
                        <span>50</span>
                        <span>90+</span>
                    </div>
                </div>

                {/* Advanced Forecasting Settings */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#FF385C]" />
                            <span className="text-sm font-bold text-gray-800">Advanced AI Forecasting</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prophet Engine</span>
                            <button 
                                type="button"
                                onClick={() => handleChange('forecastSettings', { ...formData.forecastSettings, useProphet: !formData.forecastSettings.useProphet })}
                                className={`w-8 h-4 rounded-full relative transition-colors ${formData.forecastSettings.useProphet ? 'bg-[#FF385C]' : 'bg-gray-200'}`}
                            >
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${formData.forecastSettings.useProphet ? 'left-4.5' : 'left-0.5'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Forecast Window */}
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Forecast Window</span>
                                <span className="text-xs font-bold text-gray-700">{formData.forecastSettings.forecastWindow} Days</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {[30, 60, 90].map((days) => (
                                    <button
                                        key={days}
                                        type="button"
                                        onClick={() => handleChange('forecastSettings', { ...formData.forecastSettings, forecastWindow: days })}
                                        className={`py-2 rounded-lg text-[10px] font-bold transition-all border ${
                                            formData.forecastSettings.forecastWindow === days 
                                            ? 'bg-white border-gray-300 text-gray-900 shadow-sm' 
                                            : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600'
                                        }`}
                                    >
                                        {days}D
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Accuracy Target */}
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Accuracy Target</span>
                                <span className="text-xs font-bold text-[#FF385C]">{formData.forecastSettings.accuracyTarget}%</span>
                            </div>
                            <input
                                type="range"
                                min="70"
                                max="99"
                                step="1"
                                value={formData.forecastSettings.accuracyTarget}
                                onChange={(e) => handleChange('forecastSettings', { ...formData.forecastSettings, accuracyTarget: parseInt(e.target.value) })}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF385C]"
                            />
                        </div>

                        {/* Strategic Mode Toggle */}
                        <div 
                            onClick={() => handleChange('forecastSettings', { ...formData.forecastSettings, strategicMode: !formData.forecastSettings.strategicMode })}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                formData.forecastSettings.strategicMode 
                                ? 'bg-red-50 border-red-100' 
                                : 'bg-gray-50 border-gray-200'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${formData.forecastSettings.strategicMode ? 'bg-[#FF385C] text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    <Moon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-800">10x Strategic Mode</p>
                                    <p className="text-[10px] text-gray-500">Enhanced reasoning & market analysis</p>
                                </div>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.forecastSettings.strategicMode ? 'border-[#FF385C] bg-[#FF385C]' : 'border-gray-300'}`}>
                                {formData.forecastSettings.strategicMode && <Check className="w-3 h-3 text-white" />}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mixed Mode Multi-Leg Editor */}
                {formData.travelMode === TravelMode.Mixed && (
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Info className="w-3 h-3 text-gray-500" />
                        <span className="text-[10px] font-bold uppercase text-gray-500">Journey Legs</span>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                          {formData.mixedTravelLegs?.map((leg, i) => (
                              <div key={leg.id} className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm group">
                                  <div className="flex items-center gap-2 mb-2">
                                      <span className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">{i + 1}</span>
                                      
                                      {/* Visual Icon for Leg */}
                                      <div className="text-gray-400">
                                         {getModeIcon(leg.mode)}
                                      </div>

                                      <select 
                                        value={leg.mode || 'Flight'}
                                        onChange={(e) => updateLeg(leg.id, 'mode', e.target.value)}
                                        className="text-xs font-bold bg-gray-50 border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:border-blue-400"
                                      >
                                          <option value="Flight">Flight</option>
                                          <option value="Car">Car</option>
                                          <option value="Train">Train</option>
                                          <option value="Bus">Bus</option>
                                      </select>
                                      <div className="ml-auto">
                                          <button onClick={() => deleteLeg(leg.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                                              <X className="w-3.5 h-3.5" />
                                          </button>
                                      </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                      <div className="col-span-2">
                                          <input 
                                            type="text" 
                                            placeholder="e.g. NYC to LON"
                                            value={leg.description || ''}
                                            onChange={(e) => updateLeg(leg.id, 'description', e.target.value)}
                                            className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
                                          />
                                      </div>
                                      <div>
                                          <input 
                                            type="text" 
                                            placeholder="Dur. (e.g. 7h)"
                                            value={leg.estimatedDuration || ''}
                                            onChange={(e) => updateLeg(leg.id, 'estimatedDuration', e.target.value)}
                                            className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
                                          />
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>

                      <button 
                        onClick={addLeg}
                        className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 hover:border-gray-400 transition-all flex items-center justify-center gap-1.5"
                      >
                          <Plus className="w-3.5 h-3.5" />
                          Add Travel Leg
                      </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                        Max Drive Hours <Clock className="w-3 h-3" />
                      </span>
                      <div className="relative">
                          <select
                            value={formData.maxDriveHours || 0}
                            onChange={(e) => handleChange('maxDriveHours', parseInt(e.target.value) || 0)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm font-bold text-gray-900 focus:outline-none focus:border-gray-400 appearance-none"
                          >
                            <option value={0}>Auto (Recommended)</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(h => (
                              <option key={h} value={h}>{h} Hours</option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                  </div>
                    <div>
                       <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Target Stops (Optional)</span>
                        <div className="relative">
                             <select
                               value={formData.numberOfStops || 0}
                               onChange={(e) => handleChange('numberOfStops', parseInt(e.target.value) || 0)}
                               className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm font-bold text-gray-900 focus:outline-none focus:border-gray-400 appearance-none"
                             >
                               <option value={0}>Auto (Recommended)</option>
                               {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(n => (
                                 <option key={n} value={n}>{n} Stops</option>
                               ))}
                             </select>
                             <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                   </div>
              </div>

           </div>
        </div>

      </div>

      <div className="p-4 lg:p-6 border-t border-gray-100 bg-white">
        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 animate-in fade-in slide-in-from-bottom-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-none" />
            <div className="flex-1">
              <p className="text-xs font-bold leading-tight">{formError}</p>
            </div>
            <button onClick={() => setFormError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <button
          onClick={(e) => onFormSubmitClick(e, false)}
          disabled={isLoading}
          className={`w-full py-4 rounded-xl font-bold text-white text-lg shadow-[0_6px_20px_rgba(255,56,92,0.4)] transition-all transform hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 ${
            isLoading 
              ? 'bg-gray-300 cursor-not-allowed shadow-none' 
              : 'bg-gradient-to-r from-[#FF385C] to-[#BD1E59]'
          }`}
        >
          {isLoading ? (
             'Generating...' 
          ) : (
            <>
                <Search className="w-5 h-5" />
                Explore Plan
            </>
          )}
        </button>
        
        <button
          onClick={(e) => onFormSubmitClick(e, true)}
          disabled={isLoading}
          className="w-full mt-3 py-3 rounded-xl font-bold text-gray-600 bg-transparent border border-gray-200 hover:bg-gray-50 transition-all text-sm"
        >
           Generate Alternative Route
        </button>
      </div>

      {/* --- Stop Editor Modal --- */}
      {isStopModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-[4px] p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-md sm:max-w-sm rounded-3xl shadow-2xl p-5 sm:p-6 animate-in zoom-in-95 duration-200 border border-gray-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5 sm:mb-6 sticky top-0 bg-white z-10 pb-2">
                 <h3 className="text-lg sm:text-xl font-black text-gray-800">
                   {editingIndex !== null ? 'Edit Stop' : 'Add Stop'}
                 </h3>
                 <button 
                  onClick={() => setIsStopModalOpen(false)} 
                  className="p-2 sm:p-2.5 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close Modal"
                 >
                    <X className="w-5 h-5 text-gray-500" />
                 </button>
              </div>

              <div className="space-y-5 sm:space-y-6">
                 <div>
                    <label className={`text-[10px] font-black uppercase block mb-2 ml-1 tracking-widest ${tempStopErrors.location ? 'text-red-500' : 'text-gray-400'}`}>City Location</label>
                    <div className="relative">
                       <MapPin className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${tempStopErrors.location ? 'text-red-400' : 'text-gray-400'}`} />
                       <input 
                         type="text" 
                         value={tempStop.location || ''}
                         onChange={handleCityInputChange}
                         onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                         className={getInputClass('location', "w-full pl-10 pr-4 py-3.5 sm:py-4 border rounded-2xl font-bold text-sm sm:text-base focus:outline-none focus:border-[#FF385C] focus:bg-white transition-all placeholder-gray-400", tempStopErrors)}
                         placeholder="e.g. Austin, TX"
                         autoFocus
                       />
                       {renderError('location', tempStopErrors)}
                       
                       {/* Autocomplete Dropdown */}
                       {showSuggestions && suggestions.length > 0 && (
                          <ul className="absolute z-[110] w-full bg-white border border-gray-200 rounded-2xl mt-2 shadow-2xl max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5">
                            {suggestions.map((city, idx) => (
                                <li 
                                    key={`${city}-${idx}`}
                                    onMouseDown={() => selectSuggestion(city)}
                                    className="px-4 py-3.5 hover:bg-gray-50 cursor-pointer text-sm font-bold text-gray-700 border-b border-gray-50 last:border-none flex items-center gap-3 group transition-colors"
                                >
                                    <div className="bg-gray-100 p-1.5 rounded-full group-hover:bg-[#FF385C] group-hover:text-white transition-colors">
                                       <MapPin className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="truncate">{city}</span>
                                </li>
                            ))}
                          </ul>
                       )}
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-4">
                    <div>
                      <label className={`text-[10px] font-black uppercase block mb-2 ml-1 tracking-widest ${tempStopErrors.arrivalDate ? 'text-red-500' : 'text-gray-400'}`}>Arrival (Optional)</label>
                      <CustomDatePicker 
                        value={tempStop.arrivalDate || tempStop.date || ''}
                        onChange={(val) => handleTempStopChange('arrivalDate', val)}
                        placeholder="Select date"
                        inputClassName={getInputClass('arrivalDate', "w-full pl-3 pr-2 py-3.5 sm:py-4 border rounded-2xl font-bold text-xs sm:text-sm focus-within:border-[#FF385C] focus-within:bg-white transition-all", tempStopErrors)}
                        icon={<Calendar className={`w-4 h-4 ${tempStopErrors.arrivalDate ? 'text-red-400' : 'text-gray-400'}`} />}
                        hasError={!!tempStopErrors.arrivalDate}
                      />
                      {renderError('arrivalDate', tempStopErrors)}
                    </div>
                    <div>
                      <label className={`text-[10px] font-black uppercase block mb-2 ml-1 tracking-widest ${tempStopErrors.nights ? 'text-red-500' : 'text-gray-400'}`}>Duration (Optional)</label>
                      <div className="relative">
                         <Moon className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${tempStopErrors.nights ? 'text-red-400' : 'text-gray-400'}`} />
                         <input 
                           type="number"
                           min={1}
                           max={14}
                           value={tempStop.nights === undefined ? '' : tempStop.nights}
                           onChange={(e) => handleTempStopChange('nights', e.target.value ? parseInt(e.target.value) : undefined as any)}
                           className={getInputClass('nights', "w-full pl-10 pr-4 py-3.5 sm:py-4 border rounded-2xl font-bold text-sm sm:text-base focus:outline-none focus:border-[#FF385C] focus:bg-white transition-all", tempStopErrors)}
                           placeholder="1"
                         />
                         <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-wider pointer-events-none">Nights</span>
                      </div>
                      {renderError('nights', tempStopErrors)}
                    </div>
                 </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center gap-3 mt-8 sm:mt-10">
                 {editingIndex !== null && (
                   <button 
                     onClick={deleteCurrentStop}
                     className="w-full sm:w-auto p-4 sm:p-4 rounded-2xl border border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2"
                     title="Delete Stop"
                   >
                     <Trash2 className="w-5 h-5" />
                     <span className="sm:hidden font-bold">Delete Stop</span>
                   </button>
                 )}
                 <button 
                   onClick={saveStop}
                   className="w-full flex-1 py-4 bg-[#FF385C] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-[#d9304e] transition-all flex items-center justify-center gap-2"
                 >
                   <Check className="w-5 h-5" />
                   {editingIndex !== null ? 'Save Changes' : 'Add Stop'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};