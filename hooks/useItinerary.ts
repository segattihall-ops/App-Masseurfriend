import { useState, useCallback } from 'react';
import { TripFormData, Itinerary, ValidationErrors } from '../types';
import { generateItinerary } from '../services/geminiService';
import { validateTripData } from '../utils/validation';

export const useItinerary = () => {
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [lastData, setLastData] = useState<TripFormData | null>(null);

  const handleGenerate = useCallback(async (data: TripFormData, isAlternative: boolean = false) => {
    setIsLoading(true);
    setError(null);
    setValidationErrors({});
    
    // 1. Client-side Validation
    const errors = validateTripData(data);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setIsLoading(false);
      return false;
    }

    setLastData(data);

    // 2. Call Gemini Service
    try {
      const result = await generateItinerary(data, isAlternative);
      setItinerary(result);
      return true;
    } catch (err: any) {
      console.error("Itinerary Generation Error:", err);
      // Provide a user-friendly error message
      const msg = err.message || "Failed to generate itinerary. Please check your connection and try again.";
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setItinerary(null);
    setError(null);
    setValidationErrors({});
    setLastData(null);
  }, []);

  return { 
    itinerary, 
    isLoading, 
    error, 
    validationErrors, 
    lastData, 
    handleGenerate, 
    setError,
    reset,
    setItinerary // Exposed to allow loading from saved state
  };
};