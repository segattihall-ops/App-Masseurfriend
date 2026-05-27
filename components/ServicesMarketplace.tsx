import React, { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Star, Scissors, Heart, Utensils, Sparkles, MessageSquare, Plus, X, Camera, Loader2 } from 'lucide-react';
import { ServiceListing } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../src/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';

export const ServicesMarketplace: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [userCity, setUserCity] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [newAd, setNewAd] = useState<Partial<ServiceListing>>({
    providerName: '',
    category: 'Other',
    city: '',
    description: '',
    price: 0,
    contact: '',
    imageUrl: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: ServiceListing[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as ServiceListing);
      });
      setServices(results);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'services');
    });
    return () => unsubscribe();
  }, []);

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
          setUserCity(city);
          if (!searchQuery) setSearchQuery(city);
          if (isModalOpen && !newAd.city) setNewAd(prev => ({ ...prev, city }));
        } catch (error) {
          console.error("Error fetching location:", error);
        } finally {
          setIsLocating(false);
        }
      },
      () => setIsLocating(false)
    );
  }, [isModalOpen, newAd.city, searchQuery]);

  useEffect(() => {
    fetchUserLocation();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewAd(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      alert("Please sign in to post an ad.");
      return;
    }

    try {
      const adData = {
        ...newAd,
        userId: auth.currentUser.uid,
        rating: 5.0,
        price: Number(newAd.price),
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'services'), adData);
      setIsModalOpen(false);
      setNewAd({
        providerName: '',
        category: 'Other',
        city: userCity,
        description: '',
        price: 0,
        contact: '',
        imageUrl: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'services');
    }
  };

  const filteredServices = services.filter(s => 
    (category === 'All' || s.category === category) &&
    (s.providerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
     s.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const categories = ['All', 'Barber', 'Nail', 'Wax', 'Food Prep', 'Studio Rental', 'Other'];

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50 custom-scrollbar p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-gray-900">Services Marketplace</h2>
            <p className="text-gray-500 font-medium">Find expert service providers in your city.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#FF385C] text-white rounded-2xl font-bold shadow-lg shadow-red-100 hover:bg-[#d9304e] transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Create Ad
            </button>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text"
                placeholder="Search by city or provider..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#FF385C] focus:border-transparent outline-none font-bold text-gray-700"
              />
              {isLocating && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FF385C] animate-spin" />}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div key={service.id} className="bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col">
              {service.imageUrl ? (
                <div className="h-48 w-full overflow-hidden relative">
                  <img src={service.imageUrl} alt={service.providerName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-widest text-gray-900 shadow-sm">
                      {service.category}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-48 w-full bg-gray-100 flex items-center justify-center relative">
                  <div className="opacity-10 group-hover:opacity-20 transition-opacity">
                    {service.category === 'Barber' && <Scissors className="w-24 h-24" />}
                    {service.category === 'Nail' && <Sparkles className="w-24 h-24" />}
                    {service.category === 'Food Prep' && <Utensils className="w-24 h-24" />}
                    {service.category === 'Wax' && <Heart className="w-24 h-24" />}
                    {service.category === 'Studio Rental' && <MapPin className="w-24 h-24" />}
                    {service.category === 'Other' && <Sparkles className="w-24 h-24" />}
                  </div>
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-widest text-gray-900 shadow-sm">
                      {service.category}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-6 space-y-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 leading-tight">{service.providerName}</h3>
                    <div className="flex items-center gap-1 text-gray-500 mt-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm font-medium">{service.city}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-bold text-yellow-700">{service.rating}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 font-medium leading-relaxed flex-1">
                  {service.description}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div>
                    <span className="text-2xl font-black text-gray-900">${service.price}</span>
                    <span className="text-xs font-bold text-gray-400 block uppercase tracking-wider">starting from</span>
                  </div>
                  <button className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Contact
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Ad Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Create Service Ad</h2>
                <p className="text-gray-500 font-medium text-sm">Fill in the details to post your service.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Provider Name</label>
                  <input 
                    required
                    type="text"
                    value={newAd.providerName}
                    onChange={e => setNewAd(prev => ({ ...prev, providerName: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF385C] outline-none font-bold"
                    placeholder="e.g. Marco the Barber"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Category</label>
                  <select 
                    value={newAd.category}
                    onChange={e => setNewAd(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF385C] outline-none font-bold"
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">City</label>
                  <div className="relative">
                    <input 
                      required
                      type="text"
                      value={newAd.city}
                      onChange={e => setNewAd(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF385C] outline-none font-bold"
                      placeholder="e.g. Miami, FL"
                    />
                    <button 
                      type="button"
                      onClick={fetchUserLocation}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[#FF385C] transition-colors"
                    >
                      <MapPin className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Starting Price ($)</label>
                  <input 
                    required
                    type="number"
                    value={newAd.price}
                    onChange={e => setNewAd(prev => ({ ...prev, price: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF385C] outline-none font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Description</label>
                <textarea 
                  required
                  rows={3}
                  value={newAd.description}
                  onChange={e => setNewAd(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF385C] outline-none font-bold resize-none"
                  placeholder="Describe your service..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Contact Email/Phone</label>
                <input 
                  required
                  type="text"
                  value={newAd.contact}
                  onChange={e => setNewAd(prev => ({ ...prev, contact: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF385C] outline-none font-bold"
                  placeholder="e.g. contact@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Photo</label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 flex flex-col items-center justify-center h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-100 hover:border-[#FF385C] transition-all group">
                    {newAd.imageUrl ? (
                      <img src={newAd.imageUrl} alt="Preview" className="h-full w-full object-cover rounded-2xl" />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400 group-hover:text-[#FF385C]">
                        <Camera className="w-8 h-8 mb-2" />
                        <span className="text-xs font-bold uppercase tracking-wider">Upload Photo</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                  {newAd.imageUrl && (
                    <button 
                      type="button"
                      onClick={() => setNewAd(prev => ({ ...prev, imageUrl: '' }))}
                      className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg active:scale-95"
                >
                  Post Ad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

