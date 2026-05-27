import React, { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Star, Coffee, Wifi, Wind, Shield, Loader2 } from 'lucide-react';
import { Hotel } from '../types';
import { fetchHotelsFromGoogle } from '../services/geminiService';

export const HotelSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = ['All', 'Wellness', 'Spa', 'Yoga', 'Eco-friendly', 'Luxury'];

  const handleSearch = async (query?: string, cat?: string) => {
    const q = query || searchQuery;
    const currentCat = cat || category;
    if (!q.trim()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const fullQuery = currentCat === 'All' ? `${q} wellness hotels` : `${q} ${currentCat.toLowerCase()} wellness hotels`;
      const results = await fetchHotelsFromGoogle(fullQuery);
      setHotels(results);
    } catch (err) {
      console.error("Hotel search error:", err);
      setError("Failed to fetch hotels. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const onCategoryChange = (cat: string) => {
    setCategory(cat);
    handleSearch(searchQuery, cat);
  };

  const fetchUserLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await response.json();
          const city = data.city || data.locality || '';
          if (city) {
            const query = `${city} wellness hotels`;
            setSearchQuery(city);
            handleSearch(query);
          }
        } catch (error) {
          console.error("Error fetching location:", error);
          handleSearch("San Francisco wellness hotels");
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        handleSearch("San Francisco wellness hotels");
      }
    );
  }, []);

  useEffect(() => {
    fetchUserLocation();
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50 custom-scrollbar p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-gray-900">Find Your Stay</h2>
            <p className="text-gray-500 font-medium">Curated hotels for the wellness-conscious traveler.</p>
          </div>
          <div className="relative w-full md:w-96 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text"
                placeholder="Search by city or hotel name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#FF385C] focus:border-transparent outline-none font-bold text-gray-700"
              />
            </div>
            <button 
              onClick={() => handleSearch()}
              disabled={isLoading}
              className="bg-[#FF385C] text-white px-6 py-3 rounded-2xl font-bold hover:bg-[#d9304e] transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-6 py-2 rounded-full font-bold text-sm transition-all border ${
                category === cat 
                ? 'bg-gray-900 border-gray-900 text-white shadow-lg' 
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-bold text-center">
            {error}
          </div>
        )}

        {isLoading && hotels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-[#FF385C]" />
            <p className="text-gray-500 font-bold">Searching for the best wellness hotels...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {hotels.map((hotel) => (
              <div key={hotel.id} className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl transition-all group cursor-pointer">
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={hotel.image} 
                    alt={hotel.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-bold text-gray-900">{hotel.rating}</span>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 leading-tight">{hotel.name}</h3>
                      <div className="flex items-center gap-1 text-gray-500 mt-1">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm font-medium">{hotel.city}</span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <span className="text-2xl font-black text-gray-900">${hotel.price}</span>
                      <span className="text-xs font-bold text-gray-400 block uppercase tracking-wider">/ night</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {hotel.amenities.map((amenity, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600 flex items-center gap-1.5">
                        {amenity.toLowerCase().includes('wifi') && <Wifi className="w-3 h-3" />}
                        {amenity.toLowerCase().includes('spa') && <Wind className="w-3 h-3" />}
                        {amenity.toLowerCase().includes('gym') && <Shield className="w-3 h-3" />}
                        {amenity.toLowerCase().includes('breakfast') && <Coffee className="w-3 h-3" />}
                        {amenity}
                      </span>
                    ))}
                  </div>

                  <button className="w-full py-3 bg-[#FF385C] text-white rounded-xl font-bold shadow-lg shadow-red-100 hover:bg-[#d9304e] transition-all">
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && hotels.length === 0 && !error && (
          <div className="text-center py-20">
            <p className="text-gray-500 font-bold">No hotels found. Try a different search.</p>
          </div>
        )}
      </div>
    </div>
  );
};
