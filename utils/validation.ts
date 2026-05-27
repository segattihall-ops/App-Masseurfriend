import { TripFormData, ValidationErrors } from '../types';

export const validateTripData = (data: TripFormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  let tripStart: Date | null = null;
  let tripEnd: Date | null = null;

  // Origin Validation
  if (!data.origin || data.origin.trim().length < 2) {
    errors.origin = { 
      message: "Origin required", 
      suggestion: "Please enter a starting city or use the 'Locate' button" 
    };
  }

  // Destination Validation
  const isAnywhere = !data.destination || data.destination.trim().toLowerCase() === 'anywhere';
  if (!data.destination || data.destination.trim().length < 2) {
    errors.destination = { 
      message: "Destination required", 
      suggestion: "Where are you heading? Enter a city or type 'Anywhere' for a random adventure!" 
    };
  }

  // Mandatory Dates
  if (!data.startDate) {
    errors.startDate = {
      message: "Start date required",
      suggestion: "Select the date you plan to set off."
    };
  }

  if (!data.endDate) {
    errors.endDate = {
      message: "Return date required",
      suggestion: "When do you plan to be back home?"
    };
  }

  if (data.startDate) tripStart = new Date(`${data.startDate}T00:00:00Z`);
  if (data.endDate) tripEnd = new Date(`${data.endDate}T00:00:00Z`);

  if (tripStart && tripEnd) {
    // Current date for comparison
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const today = new Date(`${now.toISOString().split('T')[0]}T00:00:00Z`);

    if (tripStart < today) {
      errors.startDate = { message: "Date in past", suggestion: "Trips must start today or in the future." };
    }

    if (tripStart.getTime() > tripEnd.getTime()) {
      errors.startDate = { message: "Invalid range", suggestion: "Start date must be before return date" };
      errors.endDate = { message: "Invalid range", suggestion: "Return date must be after start date" };
    }
    
    // Check if trip is too long (optional safety)
    const diffTime = Math.abs(tripEnd.getTime() - tripStart.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 30) {
      errors.endDate = { message: "Trip too long", suggestion: "RoadTripPro currently supports trips up to 30 days." };
    }
  }

  // Validate mandatory arrival date if provided
  if (data.destinationDate && tripStart && tripEnd) {
    const destDate = new Date(`${data.destinationDate}T00:00:00Z`);
    if (destDate < tripStart || destDate > tripEnd) {
      errors.destinationDate = {
        message: "Out of trip range",
        suggestion: `Must be between ${data.startDate} and ${data.endDate}`
      };
    }
  }

  // Validate Mandatory Stops
  if (tripStart && tripEnd && data.mandatoryStops.length > 0) {
      data.mandatoryStops.forEach((stop, index) => {
          const dateStr = stop.arrivalDate || stop.date;
          if (dateStr) {
              const stopDate = new Date(`${dateStr}T00:00:00Z`);
              if (stopDate < tripStart! || stopDate > tripEnd!) {
                   errors[`stop_${index}`] = { 
                       message: `Date outside trip range`, 
                       suggestion: `Must be between ${data.startDate} and ${data.endDate}` 
                   };
              }
          }
      });
  }

  return errors;
};