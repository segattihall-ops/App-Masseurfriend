import React from 'react';
import { AlertCircle, Lightbulb, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onClose: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onClose }) => {
  const getErrorDetails = (errorMessage: string) => {
    const lowerMsg = errorMessage.toLowerCase();
    
    if (lowerMsg.includes('quota') || lowerMsg.includes('429') || lowerMsg.includes('resource_exhausted')) {
      return {
        title: "Service Capacity Limit",
        suggestions: [
          "The AI service is currently at capacity. Please wait 60 seconds and try again.",
          "Try a simpler route with fewer mandatory stops.",
          "If the issue persists, the service might be temporarily unavailable."
        ],
        type: 'api'
      };
    }

    if (lowerMsg.includes('json') || lowerMsg.includes('parse') || lowerMsg.includes('format')) {
      return {
        title: "Data Processing Error",
        suggestions: [
          "The AI returned an invalid response. Try slightly modifying your route preferences.",
          "Check if your city names have unusual characters.",
          "Try generating the plan again; this is often a one-time glitch."
        ],
        type: 'general'
      };
    }

    if (lowerMsg.includes('date') || lowerMsg.includes('start date') || lowerMsg.includes('end date')) {
      return {
        title: "Date Configuration Issue",
        suggestions: [
          "Ensure the start date is before the end date.",
          "Check if any mandatory stops have dates outside the trip range.",
          "Verify that the destination date is within your trip duration."
        ],
        type: 'date'
      };
    }

    if (lowerMsg.includes('location') || lowerMsg.includes('origin') || lowerMsg.includes('destination') || lowerMsg.includes('not found')) {
      return {
        title: "Location Recognition Issue",
        suggestions: [
          "Try using more specific city and state names (e.g., 'Austin, TX').",
          "Check for typos in your origin or destination fields.",
          "Ensure the locations are reachable by your selected travel mode."
        ],
        type: 'location'
      };
    }

    if (lowerMsg.includes('max drive') || lowerMsg.includes('no route') || lowerMsg.includes('could not find') || lowerMsg.includes('constraint')) {
      return {
        title: "Route Constraint Issue",
        suggestions: [
          "Try increasing 'Max Drive Hours' to allow longer segments.",
          "Reduce the number of mandatory stops.",
          "Check if your travel mode (e.g., Plane) is appropriate for the distance."
        ],
        type: 'constraint'
      };
    }

    if (lowerMsg.includes('api') || lowerMsg.includes('key') || lowerMsg.includes('quota') || lowerMsg.includes('network') || lowerMsg.includes('service')) {
      return {
        title: "Service Connectivity Issue",
        suggestions: [
          "Check your internet connection.",
          "The AI service might be experiencing high traffic or quota limits.",
          "Verify your API key configuration in the environment settings."
        ],
        type: 'api'
      };
    }

    return {
      title: "Planning Interrupted",
      suggestions: [
        "Try increasing 'Max Drive Hours' to open up more routes.",
        "Reduce constraints or mandatory stops to simplify the request.",
        "Try generating the plan again in a few moments."
      ],
      type: 'general'
    };
  };

  const details = getErrorDetails(message);

  const getStyles = (type: string) => {
    switch (type) {
      case 'date':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-100',
          accent: 'bg-amber-500',
          icon: 'text-amber-600',
          title: 'text-amber-900',
          text: 'text-amber-800',
          suggestionBg: 'bg-white/60',
          suggestionBorder: 'border-amber-100',
          suggestionIcon: 'text-amber-900/70',
          dot: 'bg-amber-400',
          suggestionText: 'text-amber-700'
        };
      case 'location':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-100',
          accent: 'bg-blue-500',
          icon: 'text-blue-600',
          title: 'text-blue-900',
          text: 'text-blue-800',
          suggestionBg: 'bg-white/60',
          suggestionBorder: 'border-blue-100',
          suggestionIcon: 'text-blue-900/70',
          dot: 'bg-blue-400',
          suggestionText: 'text-blue-700'
        };
      case 'constraint':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-100',
          accent: 'bg-orange-500',
          icon: 'text-orange-600',
          title: 'text-orange-900',
          text: 'text-orange-800',
          suggestionBg: 'bg-white/60',
          suggestionBorder: 'border-orange-100',
          suggestionIcon: 'text-orange-900/70',
          dot: 'bg-orange-400',
          suggestionText: 'text-orange-700'
        };
      case 'api':
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-100',
          accent: 'bg-purple-500',
          icon: 'text-purple-600',
          title: 'text-purple-900',
          text: 'text-purple-800',
          suggestionBg: 'bg-white/60',
          suggestionBorder: 'border-purple-100',
          suggestionIcon: 'text-purple-900/70',
          dot: 'bg-purple-400',
          suggestionText: 'text-purple-700'
        };
      default:
        return {
          bg: 'bg-red-50',
          border: 'border-red-100',
          accent: 'bg-red-500',
          icon: 'text-red-600',
          title: 'text-red-900',
          text: 'text-red-800',
          suggestionBg: 'bg-white/60',
          suggestionBorder: 'border-red-100',
          suggestionIcon: 'text-red-900/70',
          dot: 'bg-red-400',
          suggestionText: 'text-red-700'
        };
    }
  };

  const styles = getStyles(details.type);

  return (
    <div className={`mx-6 mb-6 relative overflow-hidden rounded-xl ${styles.bg} ${styles.border} shadow-sm animate-in fade-in slide-in-from-top-2`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.accent}`}></div>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <AlertCircle className={`w-5 h-5 ${styles.icon}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-sm font-bold ${styles.title} mb-1`}>
              {details.title}
            </h3>
            <p className={`text-sm ${styles.text} leading-relaxed font-medium mb-3`}>
              {message}
            </p>
            
            <div className={`${styles.suggestionBg} rounded-lg p-3 border ${styles.suggestionBorder}`}>
              <div className={`flex items-center gap-2 mb-2 ${styles.suggestionIcon} text-xs font-bold uppercase tracking-wider`}>
                <Lightbulb className="w-3 h-3" />
                <span>Try This</span>
              </div>
              <ul className="space-y-1.5">
                {details.suggestions.map((suggestion, idx) => (
                  <li key={idx} className={`text-xs ${styles.suggestionText} flex items-start gap-2`}>
                    <span className={`mt-1.5 w-1 h-1 rounded-full ${styles.dot} flex-shrink-0`}></span>
                    <span className="leading-snug">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`flex-shrink-0 -mr-1 -mt-1 p-2 ${styles.icon} hover:bg-black/5 rounded-full transition-all`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};