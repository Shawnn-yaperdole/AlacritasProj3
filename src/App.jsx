// src/App.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './Global/Header';
import Menu from './Global/Menu';
import Login from './Global/Login';
import MessagesPage from './Global/Messages';
import ClientHome from './Client/ClientHome';
import Offers from './Global/Offers';
import Profile from './Global/Profile';
import ProfileViewOnly from './Global/ProfileViewOnly';
import ProviderHome from './Provider/ProviderHome';
import RequestDetails from './Global/RequestDetails';
import OfferDetails from './Global/OfferDetails';
import { 
  saveRequestRealtime, 
  saveOfferRealtime,
  saveProfileRealtime, 
  realtimeDb 
} from './lib/firebase';
import { ref, onValue } from 'firebase/database';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userMode, setUserMode] = useState('client');
  const [currentView, setCurrentView] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [selectedOfferId, setSelectedOfferId] = useState(null);

  const [isNewRequest, setIsNewRequest] = useState(false);
  const [tempRequestData, setTempRequestData] = useState(null);

  const [viewingClientProfileId, setViewingClientProfileId] = useState(null);
  const [previousView, setPreviousView] = useState('home');

  const [requests, setRequests] = useState([]);
  const [offers, setOffers] = useState([]);
  const [userProfile, setUserProfile] = useState(null);

  // Restore session from sessionStorage
  useEffect(() => {
    const loggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const username = sessionStorage.getItem('username');
    
    console.log('Restoring session:', { loggedIn, username });
    
    if (loggedIn && username) {
      setIsLoggedIn(true);
      setCurrentUser(username);
      if (username === 'ClientAdmin') setUserMode('client');
      if (username === 'ProviderAdmin') setUserMode('provider');
    }
  }, []);

  // Load user profile from Firebase
  useEffect(() => {
    if (!realtimeDb || !currentUser) return;
    
    console.log('Loading profile for:', currentUser);
    
    const profileRef = ref(realtimeDb, `profiles/${currentUser}`);
    const unsubscribe = onValue(profileRef, snapshot => {
      const data = snapshot.val();
      if (data) {
        console.log('Profile loaded:', data);
        setUserProfile(data);
      } else {
        console.log('Creating default profile for:', currentUser);
        const defaultProfile = {
          fullName: currentUser === 'ClientAdmin' ? 'Jane Client' : 'John Provider',
          email: currentUser === 'ClientAdmin' ? 'jane@client.com' : 'john@provider.com',
          phone: currentUser === 'ClientAdmin' ? '+63 912 345 6789' : '+63 998 765 4321',
          location: 'Baguio City',
          communities: ['Baguio City'],
          defaultCommunity: 'Baguio City',
          bio: `Hello! I'm ${currentUser === 'ClientAdmin' ? 'Jane' : 'John'}.`,
          profilePic: currentUser === 'ClientAdmin' 
            ? 'https://ui-avatars.com/api/?name=Jane+Client&size=200' 
            : 'https://ui-avatars.com/api/?name=John+Provider&size=200',
          skills: currentUser === 'ProviderAdmin' ? [
            { name: 'Construction', verified: true },
            { name: 'Electrical', verified: false }
          ] : []
        };
        setUserProfile(defaultProfile);
        saveProfileRealtime(currentUser, defaultProfile);
      }
    });
    
    return () => unsubscribe();
  }, [currentUser]);

  // Load requests from Firebase
  useEffect(() => {
    if (!realtimeDb) {
      console.warn('Firebase not initialized');
      return;
    }
    
    console.log('Setting up requests listener...');
    
    const requestsRef = ref(realtimeDb, 'requests');
    const unsubscribe = onValue(requestsRef, (snapshot) => {
      const val = snapshot.val() || {};
      console.log('Raw Firebase requests data:', val);
      
      const list = Object.entries(val).map(([key, value]) => ({
        id: Number(key),
        ...value,
        clientId: value.clientId || 'ClientAdmin'
      }));
      
      console.log('Processed requests:', list.length, 'items');
      setRequests(list);
    }, (error) => {
      console.error('Firebase requests error:', error);
    });
    
    return () => {
      console.log('Cleaning up requests listener');
      unsubscribe();
    };
  }, []); 

  // Load offers from Firebase
  useEffect(() => {
    if (!realtimeDb) {
      console.warn('Firebase not initialized');
      return;
    }
    
    console.log('Setting up offers listener...');
    
    const offersRef = ref(realtimeDb, 'offers');
    const unsubscribe = onValue(offersRef, (snapshot) => {
      const val = snapshot.val() || {};
      console.log('📊 Raw Firebase offers data:', val);
      
      const list = Object.entries(val).map(([key, value]) => ({
        id: Number(key),
        ...value
      }));
      
      console.log('✅ Processed offers:', list.length, 'items');
      setOffers(list);
    }, (error) => {
      console.error('❌ Firebase offers error:', error);
    });
    
    return () => {
      console.log('🔌 Cleaning up offers listener');
      unsubscribe();
    };
  }, []); 

  const handleLoginSuccess = (username) => {
    console.log('Login success:', username);
    setIsLoggedIn(true);
    setCurrentUser(username);
    if (username === 'ClientAdmin') setUserMode('client');
    if (username === 'ProviderAdmin') setUserMode('provider');  
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('username', username);
    setCurrentView('home');
  };

  const handleLogout = () => {
    console.log('Logging out...');
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('username');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setUserMode('client');
    setCurrentView('home');
    setIsMenuOpen(false);
  };

  const toggleMode = () => {
    setUserMode(prev => (prev === 'client' ? 'provider' : 'client'));
    setCurrentView('home');
  };

  const handleOfferUpdate = (updatedOffer) => {
    setOffers(prev => {
      const exists = prev.find(o => o.id === updatedOffer.id);
      if (exists) return prev.map(o => (o.id === updatedOffer.id ? updatedOffer : o));
      return [...prev, updatedOffer];
    });
    saveOfferRealtime(updatedOffer.id, updatedOffer);
  };

  const handleRequestUpdate = (updatedRequest) => {
    console.log('Updating request:', updatedRequest.id, 'clientId:', updatedRequest.clientId);
    
    // ✅ Ensure clientId is always set
    const requestWithClientId = {
      ...updatedRequest,
      clientId: updatedRequest.clientId || currentUser
    };
    
    setRequests(prev => {
      const exists = prev.find(r => r.id === requestWithClientId.id);
      if (exists) return prev.map(r => (r.id === requestWithClientId.id ? requestWithClientId : r));
      return [...prev, requestWithClientId];
    });
    saveRequestRealtime(requestWithClientId.id, requestWithClientId);
  };

  // ✅ FIXED: Filter requests based on current mode
  // In CLIENT mode: Show only MY requests (where I'm the creator)
  // In PROVIDER mode: Show OTHER users' requests (where I'm NOT the creator)
  const getFilteredRequests = () => {
    console.log('🔍 Filtering requests:', {
      userMode,
      currentUser,
      totalRequests: requests.length,
      requestsWithClientIds: requests.map(r => ({ id: r.id, clientId: r.clientId, title: r.title }))
    });
    
    if (userMode === 'client') {
      // Show requests I created
      const filtered = requests.filter(r => r.clientId === currentUser);
      console.log('Client mode - showing MY requests:', filtered.length);
      return filtered;
    } else {
      // Show requests created by OTHER users
      const filtered = requests.filter(r => r.clientId !== currentUser);
      console.log('Provider mode - showing OTHER users requests:', filtered.length);
      return filtered;
    }
  };

  if (!isLoggedIn) return <Login onLoginSuccess={handleLoginSuccess} />;

  const renderContent = () => {
    const filteredRequests = getFilteredRequests();
    
    switch (currentView) {
      case 'home':
        return userMode === 'client' 
        ? <ClientHome
            requests={filteredRequests}
            userProfile={userProfile}
            onViewDetails={(id) => { setIsNewRequest(false); setSelectedRequestId(id); setCurrentView('request-details'); }}
            onCreateRequest={() => {
              setIsNewRequest(true);
              const newId = Math.max(0, ...requests.map(r => r.id)) + 1;
              const newRequest = {
                id: newId,
                title: '',
                type: '',
                date: new Date().toISOString().split('T')[0],
                location: '',
                status: 'draft',
                description: '',
                thumbnail: '',
                images: [],
                clientId: currentUser, // ✅ Always set creator
              };
              setSelectedRequestId(newId);
              setTempRequestData(newRequest);
              setCurrentView('request-details');
            }}
            navigateToProfile={() => setCurrentView('profile')}
          />
         : <ProviderHome
            requests={filteredRequests}
            userProfile={userProfile}
            onViewDetails={(id) => { setIsNewRequest(false); setSelectedRequestId(id); setCurrentView('request-details'); }}
            onSendOffer={(request) => {
              setSelectedRequestId(request.id);
              const offerIds = offers.map(o => o.id).filter(id => id != null);
              const maxOfferId = offerIds.length ? Math.max(...offerIds) : 0;
              setSelectedOfferId(maxOfferId + 1);
              setCurrentView('offer-details');
            }}
            navigateToProfile={() => setCurrentView('profile')}
          />

      case 'messages':
        return <MessagesPage
            userRole={userMode}
            onViewRequestDetails={(id) => { setSelectedRequestId(id); setCurrentView('request-details'); }}
            onViewOfferDetails={(id) => { setSelectedOfferId(id); setCurrentView('offer-details'); }}
          />;
      case 'offers':
        return <Offers
            role={userMode}
            offers={offers}
            requests={requests} // ✅ Pass requests to match offers with their request creators
            currentUser={currentUser}
            onOfferUpdate={handleOfferUpdate}
            onViewOfferDetails={(id) => { setSelectedOfferId(id); setCurrentView('offer-details'); }}
          />;
      case 'profile':
        return <Profile 
            role={userMode} 
            setCurrentView={setCurrentView}
            currentUser={currentUser}
            userProfile={userProfile}
          />;
      case 'request-details': {
        const existingRequest = requests.find(r => r.id === selectedRequestId);
        const requestData = isNewRequest ? tempRequestData : existingRequest;
        if (!requestData) return <div className="p-4 text-center">Request not found...</div>;
        return <RequestDetails
        isNewRequest={isNewRequest}
        requestData={requestData}
        tempRequestData={tempRequestData}
        setTempRequestData={setTempRequestData}
        userRole={userMode}
        currentUser={currentUser}
        onBackToClientHome={(updatedRequest) => {
          if (userMode === 'client' && updatedRequest) handleRequestUpdate(updatedRequest);
          setCurrentView('home');
        }}
        onGoToOffer={(request) => {
          const existingOffer = offers.find(o => o.requestId === request.id);
          if (existingOffer) setSelectedOfferId(existingOffer.id);
          else setSelectedOfferId(Math.max(0, ...offers.map(o => o.id)) + 1);
          setSelectedRequestId(request.id);
          setCurrentView('offer-details');
        }}
        onViewClientProfile={(clientId) => {
          setPreviousView('request-details');
          setViewingClientProfileId(clientId);
          setCurrentView('view-client-profile');
        }}
      />;
      }
      case 'view-client-profile': 
      return <ProfileViewOnly
        role="client"
        profileData={userProfile} 
        onBack={() => setCurrentView(previousView)}
      />;
      case 'offer-details': {
        const existingOffer = offers.find(o => o.id === selectedOfferId);
        const isNewOffer = !existingOffer && userMode === 'provider';
        const offerData = existingOffer || (isNewOffer ? {
          id: selectedOfferId,
          title: '',
          description: '',
          amount: '',
          status: 'pending',
          provider: userProfile,
          providerId: currentUser,
          requestId: selectedRequestId
        } : null);
        const relatedRequest = requests.find(r => r.id === selectedRequestId);
        if (!offerData || !relatedRequest) return <div>Offer or request missing</div>;
        return <OfferDetails
          offerData={offerData}
          requestData={relatedRequest}
          userRole={userMode}
          isNewOffer={isNewOffer}
          onOfferUpdate={handleOfferUpdate}
          onBackToClientHome={() => setCurrentView(userMode === 'client' ? 'offers' : 'home')}
          onBackToProviderHome={() => setCurrentView('offers')}
          />;
      }
      default: return null;
    }
  };

  return (
    <div className="App flex flex-col w-full min-h-screen bg-gray-50">
      <Header
        userMode={userMode}
        toggleMode={toggleMode}
        setIsMenuOpen={setIsMenuOpen}
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUser={currentUser}
      />
      <main className="main w-full flex-1">{renderContent()}</main>
      <Menu 
      isOpen={isMenuOpen} 
      close={() => setIsMenuOpen(false)} 
      logout={handleLogout} 
      />
    </div>
  );
}

export default App;