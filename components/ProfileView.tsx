import React, { useState } from 'react';
import { User, Map, Calendar, Clock, Trash2, ArrowRight, Settings, Sliders, LogIn, LogOut, Mail, Lock, ChevronLeft, Loader2 } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { User as FirebaseUser } from 'firebase/auth';
import { SavedTrip, AppSettings } from '../types';

interface ProfileViewProps {
  user: FirebaseUser | null;
  onLogin: (method: 'google' | 'apple' | 'email', data?: { email: string, password: string, isSignUp: boolean }) => Promise<void>;
  onLogout: () => void;
  savedTrips: SavedTrip[];
  onLoadTrip: (trip: SavedTrip) => void;
  onDeleteTrip: (id: string) => void;
  onUpdateTrip: (id: string, updates: Partial<SavedTrip>) => void;
  onOpenSettings: () => void;
  settings: AppSettings;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ 
  user,
  onLogin,
  onLogout,
  savedTrips, 
  onLoadTrip, 
  onDeleteTrip, 
  onUpdateTrip,
  onOpenSettings,
  settings 
}) => {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editingTripName, setEditingTripName] = useState('');

  const handleUpdateName = (id: string) => {
    if (editingTripName.trim()) {
      onUpdateTrip(id, { name: editingTripName.trim() });
    }
    setEditingTripId(null);
  };

  const totalTrips = savedTrips.length;
  const totalNights = savedTrips.reduce((acc, trip) => {
    return acc + trip.itinerary.stops.reduce((sAcc, stop) => sAcc + stop.nightsToStay, 0);
  }, 0);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await onLogin('email', { email, password, isSignUp });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50/50 p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 sm:p-10 text-center border border-gray-100 relative overflow-hidden">
          {showEmailForm ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <button 
                onClick={() => setShowEmailForm(false)}
                className="absolute left-6 top-8 p-2 hover:bg-gray-50 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-gray-400" />
              </button>
              
              <div className="pt-4">
                <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-4 text-[#FF385C]">
                  <Mail className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-gray-900">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
                <p className="text-gray-500 font-medium text-sm mt-1">
                  {isSignUp ? 'Join our wellness community today.' : 'Sign in to access your saved trips.'}
                </p>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold animate-shake">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      required
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF385C] outline-none font-bold transition-all"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      required
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#FF385C] outline-none font-bold transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <button 
                  disabled={isLoading}
                  type="submit"
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? 'Sign Up' : 'Sign In')}
                </button>
              </form>

              <p className="text-sm font-bold text-gray-500">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button 
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-[#FF385C] hover:underline"
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-[#FF385C]">
                <User className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Sign in to your profile</h2>
              <p className="text-gray-500 mb-8 font-medium">
                Save your itineraries, track your travel stats, and sync your preferences across devices.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => onLogin('google')}
                  className="w-full py-4 bg-white border border-gray-200 text-gray-900 rounded-2xl font-bold shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                  Continue with Google
                </button>
                <button 
                  onClick={() => onLogin('apple')}
                  className="w-full py-4 bg-black text-white rounded-2xl font-bold shadow-sm hover:bg-gray-900 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 384 512"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-31.4-57.3-114.3-57.7-114.3zm-33.3-151.7c30.9-34.8 24-73.3 24-73.3s-38.9 3.3-69.8 40.8c-27.7 33.8-21 74.6-21 74.6s37.1 1.9 66.8-42.1z"/></svg>
                  Continue with Apple
                </button>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400 font-bold">Or</span></div>
                </div>
                <button 
                  onClick={() => setShowEmailForm(true)}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <Mail className="w-5 h-5" />
                  Continue with Email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50 custom-scrollbar">
      <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-8">
        
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center gap-6 pb-8 border-b border-gray-200">
          <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-100">
             {user.photoURL ? (
               <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
             ) : (
               <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-3xl font-bold">
                 {user.displayName?.substring(0, 2).toUpperCase() || 'U'}
               </div>
             )}
          </div>
          <div className="text-center md:text-left flex-1">
             <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
               <h2 className="text-3xl font-black text-gray-900">{user.displayName || 'Traveler'}</h2>
               <button 
                onClick={onLogout}
                className="text-xs font-bold text-gray-400 hover:text-red-500 flex items-center gap-1 justify-center md:justify-start transition-colors"
               >
                 <LogOut className="w-3 h-3" />
                 Logout
               </button>
             </div>
             <p className="text-gray-500 font-medium">{user.email}</p>
             <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
                <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2">
                   <Map className="w-4 h-4 text-[#FF385C]" />
                   <span className="font-bold text-gray-700">{totalTrips} Trips Planned</span>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2">
                   <Calendar className="w-4 h-4 text-blue-500" />
                   <span className="font-bold text-gray-700">{totalNights} Nights Booked</span>
                </div>
             </div>
          </div>
          <button 
             onClick={onOpenSettings}
             className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
          >
             <Settings className="w-5 h-5" />
             Edit Preferences
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Saved Trips List */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
               <Map className="w-5 h-5 text-gray-400" />
               Saved Itineraries
            </h3>

            {savedTrips.length === 0 ? (
               <div className="bg-white rounded-2xl p-10 text-center border border-gray-200 border-dashed">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                     <Map className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900">No saved trips yet</h4>
                  <p className="text-gray-500 mt-1 mb-4">Create your first itinerary in the planner to save it here.</p>
               </div>
            ) : (
               <div className="space-y-4">
                 {savedTrips.map((trip) => (
                    <div key={trip.id} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                       <div className="flex flex-col sm:flex-row items-start justify-between gap-4 relative z-10">
                          <div>
                              {editingTripId === trip.id ? (
                                <div className="flex items-center gap-2 mb-1">
                                  <input 
                                    autoFocus
                                    type="text"
                                    value={editingTripName}
                                    onChange={e => setEditingTripName(e.target.value)}
                                    onBlur={() => handleUpdateName(trip.id)}
                                    onKeyDown={e => e.key === 'Enter' && handleUpdateName(trip.id)}
                                    className="text-lg font-bold text-gray-900 leading-tight border-b-2 border-[#FF385C] outline-none bg-transparent w-full"
                                  />
                                </div>
                              ) : (
                                <h4 
                                  onClick={() => {
                                    setEditingTripId(trip.id);
                                    setEditingTripName(trip.name);
                                  }}
                                  className="text-lg font-bold text-gray-900 leading-tight mb-1 cursor-pointer hover:text-[#FF385C] transition-colors"
                                  title="Click to rename"
                                >
                                  {trip.name}
                                </h4>
                              )}
                             <div className="flex items-center gap-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(trip.createdDate).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {trip.itinerary.totalDuration}</span>
                             </div>
                             <div className="mt-4 flex flex-wrap gap-2">
                                {trip.itinerary.stops.slice(0, 4).map((stop, i) => (
                                   <span key={i} className="px-2 py-1 bg-gray-50 border border-gray-100 rounded text-xs font-semibold text-gray-600">
                                      {stop.city.split(',')[0]}
                                   </span>
                                ))}
                                {trip.itinerary.stops.length > 4 && (
                                   <span className="px-2 py-1 bg-gray-50 border border-gray-100 rounded text-xs font-semibold text-gray-400">
                                      +{trip.itinerary.stops.length - 4} more
                                   </span>
                                )}
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                             <button 
                                onClick={() => onDeleteTrip(trip.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Trip"
                             >
                                <Trash2 className="w-5 h-5" />
                             </button>
                             <button 
                                onClick={() => onLoadTrip(trip)}
                                className="flex-1 sm:flex-none px-4 py-2 bg-[#FF385C] text-white rounded-lg font-bold shadow-md shadow-red-100 hover:bg-[#d9304e] transition-all flex items-center justify-center gap-2"
                             >
                                Load Plan
                                <ArrowRight className="w-4 h-4" />
                             </button>
                          </div>
                       </div>
                    </div>
                 ))}
               </div>
            )}
          </div>

          {/* User Settings Summary */}
          <div className="space-y-6">
             <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
               <Sliders className="w-5 h-5 text-gray-400" />
               Current Preferences
            </h3>
            
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="space-y-6">
                   <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Default Transport</label>
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-gray-900 text-white rounded-lg">
                            {/* Icon based on mode would go here, simplified for text */}
                            <span className="font-bold text-sm">{settings.defaultTravelMode}</span>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Currency</label>
                         <p className="text-lg font-bold text-gray-900">{settings.currency}</p>
                      </div>
                      <div>
                         <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Units</label>
                         <p className="text-lg font-bold text-gray-900 capitalize">{settings.units}</p>
                      </div>
                   </div>

                   <div className="pt-4 border-t border-gray-100">
                      <button 
                        onClick={onOpenSettings}
                        className="w-full py-2 text-sm font-bold text-[#FF385C] hover:bg-red-50 rounded-lg transition-colors text-center"
                      >
                         Update Settings
                      </button>
                   </div>
                </div>
            </div>

            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
               <h4 className="font-bold text-blue-900 mb-2">Pro Tip</h4>
               <p className="text-sm text-blue-800 leading-relaxed">
                  Saving itineraries allows you to compare different route strategies. Try generating an "Alternative" route and saving both to see which fits your budget better.
               </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};