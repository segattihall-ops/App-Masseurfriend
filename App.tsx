import React, { useState, useEffect } from 'react';
import { InputForm } from './components/InputForm';
import { ItineraryDisplay } from './components/ItineraryDisplay';
import { MarketInsights } from './components/MarketInsights';
import { MarketSpikes } from './components/MarketSpikes';
import { DemandForecast } from './components/DemandForecast';
import { ErrorBanner } from './components/ErrorBanner';
import { SettingsModal } from './components/SettingsModal';
import { ProfileView } from './components/ProfileView';
import { AIChat } from './components/AIChat';
import { HotelSearch } from './components/HotelSearch';
import { ServicesMarketplace } from './components/ServicesMarketplace';
import { CommunityForum } from './components/CommunityForum';
import { MasseurBnB } from './components/MasseurBnB';
import { useItinerary } from './hooks/useItinerary';
import { useMarketInsights } from './hooks/useMarketInsights';
import { DEFAULT_FORM_DATA, DEFAULT_SETTINGS } from './constants';
import { AppSettings, SavedTrip, Itinerary, TripFormData, ViewMode } from './types';
import { MapPin, TrendingUp, Compass, Settings, User, AlertCircle, Activity, ExternalLink, Hotel, Scissors, MessageSquare, Home, LogIn, LogOut, Menu, X } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from './src/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  OAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  deleteDoc, 
  doc,
  updateDoc
} from 'firebase/firestore';
import { analytics } from './services/analytics';
import { APIProvider } from '@vis.gl/react-google-maps';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

const MapsKeySplashScreen: React.FC = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50 p-6 font-sans">
    <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 animate-in fade-in zoom-in duration-500">
      <div className="bg-[#FF385C] w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg shadow-red-100">
        <Compass className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl font-black text-gray-900 text-center mb-2">Maps API Key Required</h2>
      <p className="text-gray-500 text-center mb-8 font-medium">To enable "the best route search in the world," you need to provide a Google Maps Platform API key.</p>
      
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-2xl">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Step 1</p>
          <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener" className="text-sm font-black text-[#FF385C] hover:underline flex items-center gap-1">
            Get an API Key from Cloud Console <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-2xl">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Step 2</p>
          <ul className="text-sm space-y-2 text-gray-700 font-medium">
            <li className="flex items-start gap-2">
              <span className="bg-[#FF385C] text-white w-4 h-4 rounded-full text-[10px] flex items-center justify-center flex-none mt-0.5">1</span>
              <span>Open <strong>Settings</strong> (⚙️ gear icon)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-[#FF385C] text-white w-4 h-4 rounded-full text-[10px] flex items-center justify-center flex-none mt-0.5">2</span>
              <span>Go to <strong>Secrets</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-[#FF385C] text-white w-4 h-4 rounded-full text-[10px] flex items-center justify-center flex-none mt-0.5">3</span>
              <span>Add <code>GOOGLE_MAPS_PLATFORM_KEY</code></span>
            </li>
          </ul>
        </div>
      </div>
      
      <p className="text-[10px] text-gray-400 text-center mt-8 font-bold italic uppercase px-4 italic">The app will automatically rebuild after you add the key. No refresh needed.</p>
    </div>
  </div>
);

const CookieWarning: React.FC = () => {
  const [isIframe, setIsIframe] = useState(false);
  const [cookiesBlocked, setCookiesBlocked] = useState(false);

  useEffect(() => {
    // Check if in iframe
    setIsIframe(window.self !== window.top);

    // Check if cookies are blocked
    try {
      document.cookie = "testcookie=1; SameSite=None; Secure";
      const cookieEnabled = document.cookie.indexOf("testcookie=") !== -1;
      setCookiesBlocked(!cookieEnabled);
      // Clean up
      document.cookie = "testcookie=1; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure";
    } catch (e) {
      setCookiesBlocked(true);
    }
  }, []);

  if (!isIframe || !cookiesBlocked) return null;

  return (
    <div className="bg-amber-50 border-b-2 border-amber-200 px-4 py-4 sm:py-5 shadow-sm z-[100] relative">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-full text-amber-600 shadow-inner">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-900 leading-tight">Action required to load your app</h3>
            <p className="text-xs sm:text-sm text-amber-700 mt-1 max-w-2xl font-medium">
              It looks like your browser is blocking a required security cookie, which is common on older versions of iOS and Safari. 
              Please open the app in a new tab to continue.
            </p>
          </div>
        </div>
        <button 
          onClick={() => window.open(window.location.href, '_blank')}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl text-sm font-black transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
        >
          <ExternalLink className="w-4 h-4" />
          Open in New Tab
        </button>
      </div>
    </div>
  );
};

const SETTINGS_STORAGE_KEY = 'roadTripPro_settings';
const TRIPS_STORAGE_KEY = 'roadTripPro_savedTrips';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('planner');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        analytics.trackEvent('user_login', { uid: currentUser.uid });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (method: 'google' | 'apple' | 'email', emailData?: { email: string, password: string, isSignUp: boolean }) => {
    try {
      if (method === 'google') {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } else if (method === 'apple') {
        const provider = new OAuthProvider('apple.com');
        await signInWithPopup(auth, provider);
      } else if (method === 'email' && emailData) {
        if (emailData.isSignUp) {
          const userCredential = await createUserWithEmailAndPassword(auth, emailData.email, emailData.password);
          await updateProfile(userCredential.user, {
            displayName: emailData.email.split('@')[0]
          });
        } else {
          await signInWithEmailAndPassword(auth, emailData.email, emailData.password);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      analytics.trackEvent('user_logout');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  
  // App Settings State
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    try {
        const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
        return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
        return DEFAULT_SETTINGS;
    }
  });

  // Saved Trips State
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);

  useEffect(() => {
    if (!user) {
      setSavedTrips([]);
      return;
    }

    const q = query(
      collection(db, 'saved_trips'),
      where('userId', '==', user.uid),
      orderBy('createdDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trips: SavedTrip[] = [];
      snapshot.forEach((doc) => {
        trips.push({ id: doc.id, ...doc.data() } as SavedTrip);
      });
      setSavedTrips(trips);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'saved_trips');
    });

    return () => unsubscribe();
  }, [user]);

  // State to pass data to InputForm when loading a trip
  const [importedFormData, setImportedFormData] = useState<TripFormData | null>(null);

  const handleSaveSettings = (newSettings: AppSettings) => {
      setAppSettings(newSettings);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      analytics.trackEvent('settings_updated', { units: newSettings.units, currency: newSettings.currency });
  };

  // Use Custom Hooks
  const { 
    itinerary, 
    isLoading, 
    error, 
    validationErrors, 
    lastData, 
    handleGenerate, 
    setError,
    setItinerary 
  } = useItinerary();

  const { insights, isInsightsLoading, fetchInsights } = useMarketInsights();

  const onFormSubmit = async (data: any, isAlt: boolean) => {
    analytics.trackEvent(isAlt ? 'alternative_route_requested' : 'itinerary_generated', {
      origin: data.origin,
      destination: data.destination,
      travelMode: data.travelMode
    });
    const success = await handleGenerate(data, isAlt);
    if (success && window.innerWidth < 1024) {
      // Scroll to results on mobile
      const resultsElement = document.getElementById('itinerary-results');
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const switchView = (view: ViewMode) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
    if (view === 'insights') {
        analytics.trackEvent('market_insights_viewed');
        if (!insights && !isInsightsLoading) fetchInsights();
    } else if (view === 'spikes') {
        analytics.trackEvent('market_spikes_viewed');
    } else if (view === 'forecast') {
        analytics.trackEvent('demand_forecast_viewed');
    }
  };

  const handleSaveTrip = async (itineraryToSave: Itinerary) => {
     if (!lastData || !user) return;
     
     try {
       const newTripData = {
         userId: user.uid,
         name: itineraryToSave.routeName || `Trip to ${lastData.destination}`,
         createdDate: new Date().toISOString(),
         formData: lastData,
         itinerary: itineraryToSave
       };

       await addDoc(collection(db, 'saved_trips'), newTripData);
       analytics.trackEvent('trip_saved', { tripName: newTripData.name });
     } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, 'saved_trips');
     }
  };

  const handleDeleteTrip = async (id: string) => {
    try {
      const trip = savedTrips.find(t => t.id === id);
      await deleteDoc(doc(db, 'saved_trips', id));
      analytics.trackEvent('trip_deleted', { tripName: trip?.name });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'saved_trips');
    }
  };

  const handleUpdateTrip = async (id: string, updates: Partial<SavedTrip>) => {
    try {
      await updateDoc(doc(db, 'saved_trips', id), updates);
      analytics.trackEvent('trip_updated', { tripId: id });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'saved_trips');
    }
  };

  const handleLoadTrip = (trip: SavedTrip) => {
    setItinerary(trip.itinerary);
    setImportedFormData(trip.formData);
    setCurrentView('planner');
    analytics.trackEvent('trip_loaded', { tripName: trip.name });
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        const resultsElement = document.getElementById('itinerary-results');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'insights':
        return <MarketInsights insights={insights} isLoading={isInsightsLoading} onRefresh={fetchInsights} />;
      case 'spikes':
        return <MarketSpikes />;
      case 'forecast':
        return <DemandForecast itinerary={itinerary} formData={lastData} />;
      case 'hotels':
        return <HotelSearch />;
      case 'services':
        return <ServicesMarketplace />;
      case 'community':
        return <CommunityForum />;
      case 'bnb':
        return <MasseurBnB />;
      case 'profile':
        return (
          <ProfileView 
            user={user}
            onLogin={handleLogin}
            onLogout={handleLogout}
            savedTrips={savedTrips} 
            onLoadTrip={handleLoadTrip} 
            onDeleteTrip={handleDeleteTrip} 
            onUpdateTrip={handleUpdateTrip}
            onOpenSettings={() => setIsSettingsOpen(true)}
            settings={appSettings}
          />
        );
      default:
        return (
          <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden relative no-scrollbar">
            {/* Left Panel: Form */}
            <div className="flex-none w-full lg:w-[400px] xl:w-[450px] bg-white border-b lg:border-b-0 lg:border-r border-gray-200 lg:overflow-y-auto no-scrollbar">
              <InputForm 
                onSubmit={onFormSubmit} 
                isLoading={isLoading} 
                validationErrors={validationErrors}
                initialData={DEFAULT_FORM_DATA}
                importedData={importedFormData}
              />
            </div>

            {/* Right Panel: Results */}
            <div id="itinerary-results" className="flex-1 min-h-[500px] lg:min-h-0 lg:h-full overflow-hidden bg-gray-50/30">
              <ItineraryDisplay 
                itinerary={itinerary} 
                isLoading={isLoading} 
                onGenerateAlternative={() => lastData && onFormSubmit(lastData, true)}
                onSaveTrip={handleSaveTrip}
              />
            </div>
          </div>
        );
    }
  };

  if (!hasValidKey) return <MapsKeySplashScreen />;

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
        <CookieWarning />
        <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-gray-200 shadow-sm z-50">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-10">
              <div className="bg-[#FF385C] p-2.5 rounded-2xl shadow-lg shadow-red-100">
                <Compass className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-black tracking-tighter text-gray-900">RoadTripPro</h1>
            </div>

            <nav className="space-y-2">
              <SidebarButton active={currentView === 'planner'} onClick={() => switchView('planner')} icon={<Compass className="w-5 h-5" />} label="Trip Planner" />
              <SidebarButton active={currentView === 'hotels'} onClick={() => switchView('hotels')} icon={<Hotel className="w-5 h-5" />} label="Wellness Hotels" />
              <SidebarButton active={currentView === 'services'} onClick={() => switchView('services')} icon={<Scissors className="w-5 h-5" />} label="Services Marketplace" />
              <SidebarButton active={currentView === 'bnb'} onClick={() => switchView('bnb')} icon={<Home className="w-5 h-5" />} label="Masseur B&B" />
              <SidebarButton active={currentView === 'community'} onClick={() => switchView('community')} icon={<MessageSquare className="w-5 h-5" />} label="Community Forum" />
              <SidebarButton active={currentView === 'insights'} onClick={() => switchView('insights')} icon={<TrendingUp className="w-5 h-5" />} label="Market Insights" />
              <SidebarButton active={currentView === 'spikes'} onClick={() => switchView('spikes')} icon={<Activity className="w-5 h-5" />} label="Growth Spikes" />
              <SidebarButton active={currentView === 'forecast'} onClick={() => switchView('forecast')} icon={<Activity className="w-5 h-5" />} label="Forecast" />
            </nav>
          </div>

          <div className="mt-auto p-8 border-t border-gray-100">
            <div className="flex items-center gap-4 mb-6">
              {user ? (
                <div className="flex items-center gap-3">
                  <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="Profile" className="w-10 h-10 rounded-full border-2 border-[#FF385C] cursor-pointer" referrerPolicy="no-referrer" onClick={() => switchView('profile')} />
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold truncate">{user.displayName}</p>
                    <button onClick={handleLogout} className="text-xs font-bold text-gray-400 hover:text-[#FF385C] transition-colors">Sign Out</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => switchView('profile')} className="flex items-center gap-3 text-gray-500 hover:text-[#FF385C] transition-colors">
                  <User className="w-10 h-10 p-2 bg-gray-100 rounded-full" />
                  <span className="text-sm font-bold">Sign In</span>
                </button>
              )}
            </div>
            <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-3 text-gray-400 hover:text-gray-900 transition-colors">
              <Settings className="w-5 h-5" />
              <span className="text-sm font-bold">Settings</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Mobile Header */}
          <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 z-40">
            <div className="flex items-center gap-2">
              <Compass className="w-6 h-6 text-[#FF385C]" />
              <span className="text-xl font-black tracking-tighter">RoadTripPro</span>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="Profile" className="w-8 h-8 rounded-full border border-[#FF385C]" referrerPolicy="no-referrer" onClick={() => switchView('profile')} />
              )}
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-gray-100 rounded-xl">
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
            </div>
          </header>

          {/* Mobile Full-Screen Menu */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
              {/* Header in Menu */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <div className="bg-[#FF385C] p-2 rounded-xl shadow-lg shadow-red-100">
                    <Compass className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-black tracking-tighter text-gray-900">RoadTripPro</span>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-3 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors active:scale-90"
                >
                  <X className="w-8 h-8 text-gray-900" />
                </button>
              </div>

              {/* Navigation Grid */}
              <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <MobileMenuGridButton 
                    active={currentView === 'planner'} 
                    onClick={() => switchView('planner')} 
                    icon={<Compass className="w-8 h-8" />} 
                    label="Trip Planner" 
                    description="Plan your route"
                  />
                  <MobileMenuGridButton 
                    active={currentView === 'hotels'} 
                    onClick={() => switchView('hotels')} 
                    icon={<Hotel className="w-8 h-8" />} 
                    label="Hotels" 
                    description="Wellness stays"
                  />
                  <MobileMenuGridButton 
                    active={currentView === 'services'} 
                    onClick={() => switchView('services')} 
                    icon={<Scissors className="w-8 h-8" />} 
                    label="Services" 
                    description="Local experts"
                  />
                  <MobileMenuGridButton 
                    active={currentView === 'bnb'} 
                    onClick={() => switchView('bnb')} 
                    icon={<Home className="w-8 h-8" />} 
                    label="Masseur B&B" 
                    description="Relaxing stays"
                  />
                  <MobileMenuGridButton 
                    active={currentView === 'community'} 
                    onClick={() => switchView('community')} 
                    icon={<MessageSquare className="w-8 h-8" />} 
                    label="Forum" 
                    description="Travel tips"
                  />
                  <MobileMenuGridButton 
                    active={currentView === 'insights'} 
                    onClick={() => switchView('insights')} 
                    icon={<TrendingUp className="w-8 h-8" />} 
                    label="Insights" 
                    description="Market data"
                  />
                  <MobileMenuGridButton 
                    active={currentView === 'spikes'} 
                    onClick={() => switchView('spikes')} 
                    icon={<Activity className="w-8 h-8" />} 
                    label="Growth" 
                    description="Hot spots"
                  />
                  <MobileMenuGridButton 
                    active={currentView === 'forecast'} 
                    onClick={() => switchView('forecast')} 
                    icon={<Activity className="w-8 h-8" />} 
                    label="Forecast" 
                    description="Future trends"
                  />
                </div>
              </div>

              {/* Footer in Menu */}
              <div className="p-8 border-t border-gray-100 bg-gray-50/50">
                {user ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img 
                        src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                        alt="Profile" 
                        className="w-14 h-14 rounded-full border-2 border-[#FF385C] shadow-md" 
                        referrerPolicy="no-referrer" 
                        onClick={() => switchView('profile')} 
                      />
                      <div>
                        <p className="text-xl font-black text-gray-900 leading-tight">{user.displayName || 'Traveler'}</p>
                        <button onClick={handleLogout} className="text-sm font-bold text-[#FF385C] hover:underline">Sign Out</button>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }} 
                      className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm active:scale-95 transition-all"
                    >
                      <Settings className="w-6 h-6 text-gray-600" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => { switchView('profile'); setIsMobileMenuOpen(false); }} 
                    className="w-full py-5 bg-[#FF385C] text-white rounded-2xl font-black text-xl shadow-xl shadow-red-100 active:scale-95 transition-all"
                  >
                    Sign In to Your Account
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 overflow-hidden">
            {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
            {renderContent()}
          </main>

          {/* Legal Disclaimer Footer (Desktop only) */}
          <footer className="hidden lg:block flex-none bg-white border-t border-gray-200 py-3 px-8">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[10px] text-gray-400 font-medium">© 2026 RoadTripPro. All rights reserved.</p>
              <div className="flex items-center gap-2 text-[10px] text-gray-400 italic leading-tight">
                <AlertCircle className="w-3 h-3 flex-none" />
                <p>LEGAL DISCLAIMER: AI analysis may be inaccurate. Use at your own risk.</p>
              </div>
            </div>
          </footer>

          <AIChat itinerary={itinerary} formData={lastData} />
        </div>
        </div>

        {isSettingsOpen && (
          <SettingsModal 
            isOpen={isSettingsOpen}
            currentSettings={appSettings} 
            onSave={handleSaveSettings} 
            onClose={() => setIsSettingsOpen(false)} 
          />
        )}
      </div>
    </APIProvider>
  );
};

const SidebarButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold ${active ? 'bg-[#FF385C] text-white shadow-lg shadow-red-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
  >
    {icon}
    <span className="text-sm">{label}</span>
  </button>
);

const MobileMenuGridButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; description: string }> = ({ active, onClick, icon, label, description }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-start p-6 rounded-[2rem] transition-all text-left group active:scale-95 ${
      active 
      ? 'bg-[#FF385C] text-white shadow-xl shadow-red-100' 
      : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
    }`}
  >
    <div className={`mb-4 p-3 rounded-2xl transition-colors ${active ? 'bg-white/20 text-white' : 'bg-white shadow-sm group-hover:bg-gray-50 text-[#FF385C]'}`}>
      {icon}
    </div>
    <span className="text-lg font-black tracking-tight mb-1">{label}</span>
    <span className={`text-xs font-medium ${active ? 'text-white/80' : 'text-gray-500'}`}>{description}</span>
  </button>
);

export default App;

