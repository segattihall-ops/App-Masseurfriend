import React, { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Star, Home, Plus, MessageSquare, User, Heart, X, Camera, Loader2 } from 'lucide-react';
import { BnBListing } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../src/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

export const MasseurBnB: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [listings, setListings] = useState<BnBListing[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newSpace, setNewSpace] = useState<Partial<BnBListing>>({
    title: '',
    city: '',
    description: '',
    pricePerNight: 0,
    image: '',
    category: 'Studio'
  });

  useEffect(() => {
    const q = query(collection(db, 'bnb_listings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: BnBListing[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as BnBListing);
      });
      setListings(results);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bnb_listings');
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
          if (city && !searchQuery) setSearchQuery(city);
          if (isModalOpen && !newSpace.city) setNewSpace(prev => ({ ...prev, city }));
        } catch (error) {
          console.error("Error fetching location:", error);
        } finally {
          setIsLocating(false);
        }
      },
      () => setIsLocating(false)
    );
  }, [isModalOpen, newSpace.city, searchQuery]);

  useEffect(() => {
    fetchUserLocation();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewSpace(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      alert("Please sign in to post a space.");
      return;
    }

    try {
      const spaceData = {
        ...newSpace,
        hostName: auth.currentUser.displayName || 'Anonymous',
        hostId: auth.currentUser.uid,
        rating: 5.0,
        pricePerNight: Number(newSpace.pricePerNight),
        createdAt: serverTimestamp(),
        reviews: []
      };
      await addDoc(collection(db, 'bnb_listings'), spaceData);
      setIsModalOpen(false);
      setNewSpace({
        title: '',
        city: '',
        description: '',
        pricePerNight: 0,
        image: '',
        category: 'Studio'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bnb_listings');
    }
  };

  const filteredListings = listings.filter(l => 
    (category === 'All' || l.category === category) &&
    (l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     l.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const categories = ['All', 'Studio', 'Private Room', 'Shared Space', 'Clinic', 'Home Office'];

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50 custom-scrollbar p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-gray-900">MasseurB&B</h2>
            <p className="text-gray-500 font-medium">Rent professional spaces or rooms for your wellness practice.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-[#FF385C] text-white rounded-2xl font-bold shadow-lg shadow-red-100 hover:bg-[#d9304e] transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Post a Space
          </button>
        </div>

        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search by city or space type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-3xl shadow-sm focus:ring-2 focus:ring-[#FF385C] focus:border-transparent outline-none font-bold text-gray-700"
          />
          {isLocating && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="w-5 h-5 animate-spin text-[#FF385C]" />
            </div>
          )}
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

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-[#FF385C]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredListings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl transition-all group">
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={listing.image || 'https://images.unsplash.com/photo-1544161515-4af6b1d46af0?auto=format&fit=crop&q=80&w=800'} 
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-bold text-gray-900">{listing.rating}</span>
                  </div>
                  <button className="absolute top-4 left-4 p-2 bg-white/90 backdrop-blur rounded-full text-gray-400 hover:text-[#FF385C] transition-colors shadow-sm">
                    <Heart className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-[#FF385C] transition-colors truncate">{listing.title}</h3>
                      <div className="flex items-center gap-1 text-gray-500 mt-1">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm font-medium">{listing.city}</span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <span className="text-2xl font-black text-gray-900">${listing.pricePerNight}</span>
                      <span className="text-xs font-bold text-gray-400 block uppercase tracking-wider">/ night</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 font-medium leading-relaxed line-clamp-2">
                    {listing.description}
                  </p>

                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-gray-700">{listing.hostName}</span>
                    </div>
                    <button className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      View Space
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Post a Space Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Post a Space</h2>
                <p className="text-gray-500 font-medium text-sm">Rent out your professional wellness space.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Space Title</label>
                <input 
                  required
                  type="text"
                  value={newSpace.title}
                  onChange={e => setNewSpace(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF385C] outline-none font-bold"
                  placeholder="e.g. Serene Massage Studio"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">City</label>
                  <input 
                    required
                    type="text"
                    value={newSpace.city}
                    onChange={e => setNewSpace(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF385C] outline-none font-bold"
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Category</label>
                  <select 
                    value={newSpace.category}
                    onChange={e => setNewSpace(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF385C] outline-none font-bold"
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Price / Night</label>
                <input 
                  required
                  type="number"
                  value={newSpace.pricePerNight}
                  onChange={e => setNewSpace(prev => ({ ...prev, pricePerNight: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF385C] outline-none font-bold"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Description</label>
                <textarea 
                  required
                  rows={3}
                  value={newSpace.description}
                  onChange={e => setNewSpace(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF385C] outline-none font-bold resize-none"
                  placeholder="Describe the space and amenities..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Photo</label>
                <div className="relative group">
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="space-photo"
                  />
                  <label 
                    htmlFor="space-photo"
                    className="flex flex-col items-center justify-center w-full h-40 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer hover:bg-gray-100 transition-all overflow-hidden"
                  >
                    {newSpace.image ? (
                      <img src={newSpace.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm font-bold text-gray-500">Upload Space Photo</span>
                      </>
                    )}
                  </label>
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
                  List Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
