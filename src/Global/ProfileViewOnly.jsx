// src/Global/ProfileViewOnly.jsx - FIXED VERSION (No Mock Data)
import React, { useState, useEffect } from "react";
import { realtimeDb } from "../lib/firebase";
import { ref, onValue } from 'firebase/database';
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default Leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Map Updater Component
function MapUpdater({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && map) {
      map.setView([coords.lat, coords.lon], 14, { animate: true });
    }
  }, [coords, map]);
  return null;
}

const ProfileViewOnly = ({ 
  role, 
  profileData, 
  onBack, 
  defaultCoords = { lat: 16.4023, lon: 120.5960 },
  userId // NEW: Accept userId prop to load from Firebase
}) => {
  const isClient = role === "client";
  
  // State for loading profile from Firebase
  const [loadedProfile, setLoadedProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCoords, setMapCoords] = useState(defaultCoords);

  // Load profile from Firebase if userId is provided and profileData is not
  useEffect(() => {
    if (!profileData && userId && realtimeDb) {
      setIsLoading(true);
      setError(null);
      
      const profileRef = ref(realtimeDb, `profiles/${userId}`);
      const unsubscribe = onValue(profileRef, 
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setLoadedProfile(data);
            if (data.latLon) {
              setMapCoords(data.latLon);
            }
          } else {
            setError(`Profile not found for user: ${userId}`);
          }
          setIsLoading(false);
        },
        (err) => {
          console.error('Error loading profile:', err);
          setError('Failed to load profile');
          setIsLoading(false);
        }
      );
      
      return () => unsubscribe();
    } else if (profileData) {
      // Use provided profileData
      setLoadedProfile(profileData);
      if (profileData.latLon) {
        setMapCoords(profileData.latLon);
      }
    }
  }, [userId, profileData]);

  // Use loaded profile or fallback to provided profileData
  const data = loadedProfile || profileData;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          {onBack && (
            <button 
              className="action-btn btn-secondary px-6 py-2" 
              onClick={onBack}
            >
              Back
            </button>
          )}
        </div>
      </div>
    );
  }

  // No data available
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No profile data available</p>
          {onBack && (
            <button 
              className="action-btn btn-secondary px-6 py-2" 
              onClick={onBack}
            >
              Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="profile-view-page flex flex-col md:flex-row justify-start w-full min-h-screen p-8 bg-gray-50 gap-12" style={{ paddingTop: "100px" }}>
      {/* LEFT - Profile Pic + Contact */}
      <div className="profile-left flex flex-col items-center gap-6 md:w-1/3">
        <div className="profile-pic-container">
          <img 
            src={data.profilePic || 'https://ui-avatars.com/api/?name=User&size=200'} 
            alt="Profile" 
            className="profile-pic" 
          />
        </div>

        <div className="contact-info flex flex-col gap-2 text-center md:text-left text-lg">
          <div><strong>Email:</strong> {data.email || 'N/A'}</div>
          <div><strong>Phone:</strong> {data.phone || 'N/A'}</div>
          <div><strong>Location:</strong> {data.location || 'N/A'}</div>
        </div>
      </div>

      {/* RIGHT - Profile Details */}
      <div className="profile-right flex flex-col gap-6 md:w-2/3 text-left">
        <div className="flex items-center justify-between">
          <h1 className="text-5xl font-bold">{data.fullName || 'Unknown User'}</h1>
          {onBack && (
            <button 
              className="action-btn btn-secondary px-6 py-2" 
              onClick={onBack}
            >
              Back
            </button>
          )}
        </div>

        {/* Communities */}
        {data.communities && data.communities.length > 0 && (
          <div className="communities flex flex-col gap-2">
            <strong className="text-xl">Communities:</strong>
            <div className="flex flex-wrap gap-2">
              {data.communities.map((c, idx) => (
                <span 
                  key={idx} 
                  className={`community-badge px-4 py-2 rounded-full font-semibold ${
                    c === data.defaultCommunity 
                      ? "default-community bg-green-100 text-green-800 border-2 border-green-400" 
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {c}
                  {c === data.defaultCommunity && <span className="ml-1">★</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Location Map - VIEW ONLY */}
        <div className="location-section">
          <strong className="text-xl mb-4 block">Location:</strong>
          <div className="w-full h-80 border rounded-lg overflow-hidden shadow-lg">
            <MapContainer 
              center={[mapCoords.lat, mapCoords.lon]} 
              zoom={14} 
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={false}
            >
              <TileLayer 
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <Marker position={[mapCoords.lat, mapCoords.lon]} />
              <MapUpdater coords={mapCoords} />
            </MapContainer>
          </div>
        </div>

        {/* Bio */}
        <div className="bio">
          <strong className="text-xl mb-4 block">About:</strong>
          <p className="bio-text text-lg leading-relaxed p-6 bg-white rounded-lg shadow-md border">
            {data.bio || 'No bio available'}
          </p>
        </div>

        {/* Provider Skills - VIEW ONLY */}
        {!isClient && data.skills && data.skills.length > 0 && (
          <div className="skills">
            <strong className="text-xl mb-4 block">Skills:</strong>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {data.skills.map((skill, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-lg shadow-md border-2 ${
                    skill.verified 
                      ? "border-green-400 bg-green-50" 
                      : "border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{skill.name}</span>
                    {skill.verified && (
                      <span className="text-green-600 text-xl font-bold">✔</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileViewOnly;