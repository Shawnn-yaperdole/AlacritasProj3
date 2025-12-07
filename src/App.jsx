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
import { saveRequestRealtime, saveOfferRealtime, realtimeDb } from './lib/firebase';
import { ref, onValue } from 'firebase/database';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // 'ClientAdmin' or 'ProviderAdmin'
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

  // Check if user is already logged in on mount
  useEffect(() => {
    const loggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const username = sessionStorage.getItem('username');
    setIsLoggedIn(loggedIn);
    setCurrentUser(username);
    
    // Set initial user mode based on logged-in user
    if (username === 'ClientAdmin') {
      setUserMode('client');
    } else if (username === 'ProviderAdmin') {
      setUserMode('provider');
    }
  }, []);

  // Load user profile from Firebase
  useEffect(() => {
    if (!realtimeDb || !currentUser) return;
    
    const profileRef = ref(realtimeDb, `profiles/${currentUser}`);
    const unsubscribe = onValue(profileRef, snapshot => {
      const data = snapshot.val();
      if (data) {
        setUserProfile(data);
      } else {
        // Initialize default profile if doesn't exist
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
      }
    });
    
    return () => unsubscribe();
  }, [currentUser]);

  // Firebase listeners for requests
  useEffect(() => {
    if (!realtimeDb) {
      console.log('No Firebase, data will not persist');
      return;
    }

    const requestsRef = ref(realtimeDb, 'requests');
    const unsubscribe = onValue(requestsRef, snapshot => {
      const val = snapshot.val() || {};
      const list = Object.keys(val).map(k => ({
        id: Number(k),
        ...val[k],
        clientId: val[k]?.clientId || currentUser
      }));
      setRequests(list);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Firebase listeners for offers
  useEffect(() => {
    if (!realtimeDb) return;
    const offersRef = ref(realtimeDb, 'offers');
    const unsubscribe = onValue(offersRef, snapshot => {
      const val = snapshot.val() || {};
      const list = Object.keys(val).map(k => ({ id: Number(k), ...val[k] }));
      setOffers(list);
    });
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (username) => {
    setIsLoggedIn(true);
    setCurrentUser(username);
    
    // Set mode based on which user logged in
    if (username === 'ClientAdmin') {
      setUserMode('client');
    } else if (username === 'ProviderAdmin') {
      setUserMode('provider');
    }
    
    setCurrentView('home');
  };

  const handleLogout = () => {
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
      if (exists) {
        return prev.map(o => o.id === updatedOffer.id ? updatedOffer : o);
      }
      return [...prev, updatedOffer];
    });
  };

  const handleRequestUpdate = (updatedRequest) => {
    setRequests(prev => {
      const exists = prev.find(r => r.id === updatedRequest.id);
      if (exists) {
        return prev.map(r => r.id === updatedRequest.id ? updatedRequest : r);
      }
      return [...prev, updatedRequest];
    });
  };

  // Filter requests based on current user and mode
  const getFilteredRequests = () => {
    if (userMode === 'client') {
      // Show only current user's requests
      return requests.filter(r => r.clientId === currentUser);
    } else {
      // Show requests from OTHER users only
      return requests.filter(r => r.clientId !== currentUser);
    }
  };

  // If not logged in, show login page
  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderContent = () => {
    const filteredRequests = getFilteredRequests();
    
    switch (currentView) {
      case 'home':
        return userMode === 'client' ? (
          <ClientHome
            requests={filteredRequests}
            userProfile={userProfile}
            onViewDetails={(id) => {
              setIsNewRequest(false);
              setSelectedRequestId(id);
              setCurrentView('request-details');
            }}
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
                clientId: currentUser,
              };
              setSelectedRequestId(newId);
              setTempRequestData(newRequest);
              setCurrentView('request-details');
            }}
            navigateToProfile={() => setCurrentView('profile')}
          />
        ) : (
          <ProviderHome
            requests={filteredRequests}
            userProfile={userProfile}
            onViewDetails={(id) => {
              setIsNewRequest(false);
              setSelectedRequestId(id);
              setCurrentView('request-details');
            }}
            onSendOffer={(request) => {
              setSelectedRequestId(request.id);
              const offerIds = offers.filter(o => o.id != null).map(o => o.id);
              const maxOfferId = offerIds.length > 0 ? Math.max(...offerIds) : 0;
              setSelectedOfferId(maxOfferId + 1);
              setCurrentView('offer-details');
            }}
            navigateToProfile={() => setCurrentView('profile')}
          />
        );

      case 'messages':
        return (
          <MessagesPage
            userRole={userMode}
            onViewRequestDetails={(requestId) => {
              setSelectedRequestId(requestId);
              setCurrentView('request-details');
            }}
            onViewOfferDetails={(offerId) => {
              setSelectedOfferId(offerId);
              setCurrentView('offer-details');
            }}
          />
        );

      case 'offers':
        return (
          <Offers
            role={userMode}
            offers={offers}
            onOfferUpdate={handleOfferUpdate}
            onViewOfferDetails={(offerId) => {
              setSelectedOfferId(offerId);
              setCurrentView('offer-details');
            }}
          />
        );

      case 'profile':
        return (
          <Profile 
            role={userMode} 
            setCurrentView={setCurrentView}
            currentUser={currentUser}
            userProfile={userProfile}
          />
        );

      case 'request-details': {
        const existingRequest = requests.find(r => r.id === selectedRequestId);
        const requestData = isNewRequest ? tempRequestData : existingRequest;

        if (!requestData) {
          return (
            <div className="p-4 text-center">
              <div className="text-lg font-semibold text-gray-700 mb-2">
                Request not found or still loading...
              </div>
              <button
                className="action-btn client-post-btn px-6 py-2"
                onClick={() => setCurrentView('home')}
              >
                Back to Home
              </button>
            </div>
          );
        }

        return (
          <RequestDetails
            isNewRequest={isNewRequest}
            requestData={requestData}
            tempRequestData={tempRequestData}
            setTempRequestData={setTempRequestData}
            userRole={userMode}
            currentUser={currentUser}
            onBackToClientHome={(updatedRequest) => {
              if (userMode === 'client' && updatedRequest) {
                handleRequestUpdate(updatedRequest);
                saveRequestRealtime(updatedRequest.id, updatedRequest);
              }
              setCurrentView('home');
            }}
            onGoToOffer={(request) => {
              const existingOffer = offers.find(o => o.requestId === request.id);
              if (existingOffer) {
                setSelectedOfferId(existingOffer.id);
              } else {
                const offerIds = offers.filter(o => o.id != null).map(o => o.id);
                const maxOfferId = offerIds.length > 0 ? Math.max(...offerIds) : 0;
                setSelectedOfferId(maxOfferId + 1);
              }
              setSelectedRequestId(request.id);
              setCurrentView('offer-details');
            }}
            onViewClientProfile={(clientId) => {
              setPreviousView('request-details');
              setViewingClientProfileId(clientId);
              setCurrentView('view-client-profile');
            }}
          />
        );
      }

      case 'view-client-profile': {
        // Load profile for the client being viewed
        const clientProfile = userProfile; // Simplified - in production, load specific user profile
        
        if (!clientProfile) {
          return (
            <div className="p-4 text-center">
              <div className="text-lg font-semibold text-red-600 mb-4">
                Client profile not found
              </div>
              <button className="action-btn client-post-btn px-6 py-2" onClick={() => setCurrentView('home')}>
                Back to Home
              </button>
            </div>
          );
        }

        return (
          <ProfileViewOnly
            role="client"
            profileData={clientProfile}
            onBack={() => setCurrentView(previousView)}
          />
        );
      }

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

        if (!offerData) {
          return (
            <div className="p-4 text-center">
              <div className="text-lg font-semibold text-gray-700 mb-2">
                Offer not found
              </div>
              <button
                className="action-btn client-post-btn px-6 py-2"
                onClick={() => setCurrentView('home')}
              >
                Back to Home
              </button>
            </div>
          );
        }

        if (!relatedRequest) {
          return (
            <div className="p-4 text-center">
              <div className="text-lg font-semibold text-gray-700 mb-2">
                Related request not found
              </div>
              <button
                className="action-btn client-post-btn px-6 py-2"
                onClick={() => setCurrentView('home')}
              >
                Back to Home
              </button>
            </div>
          );
        }

        return (
          <OfferDetails
            offerData={offerData}
            requestData={relatedRequest}
            userRole={userMode}
            isNewOffer={isNewOffer}
            onOfferUpdate={handleOfferUpdate}
            onBackToClientHome={() => setCurrentView(userMode === 'client' ? 'offers' : 'home')}
            onBackToProviderHome={() => setCurrentView('offers')}
          />
        );
      }

      default:
        return null;
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
      <main className="main w-full flex-1">
        {renderContent()}
      </main>
      <Menu
        isOpen={isMenuOpen}
        close={() => setIsMenuOpen(false)}
        logout={handleLogout}
      />
    </div>
  );
}

export default App;