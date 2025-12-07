// src/Global/Profile.jsx
import React, { useState, useRef, useEffect } from "react";
import { saveProfileRealtime } from "../lib/firebase";
import { uploadFileToCloudinary } from "../lib/cloudinary";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const fetchBarangaySuggestions = async (query) => {
  if (!query) return [];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query + ", Baguio"
  )}&format=jsonv2&limit=10&addressdetails=1`;
  const res = await fetch(url);
  const data = await res.json();
  return data
    .map((item) => {
      const addr = item.address || {};
      const barangay = addr.village || addr.suburb || addr.hamlet || null;
      const city = addr.city || addr.town || addr.municipality || null;
      if (!barangay || !city) return null;
      return { name: `${barangay}, ${city}`, lat: parseFloat(item.lat), lon: parseFloat(item.lon) };
    })
    .filter(Boolean);
};

const getBarangayFromCoordinates = async (lat, lon) => {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&addressdetails=1`;
  const res = await fetch(url);
  const data = await res.json();
  const addr = data.address || {};
  const barangay = addr.village || addr.suburb || addr.hamlet || null;
  const city = addr.city || addr.town || addr.municipality || null;
  if (!barangay || !city) return null;
  return { name: `${barangay}, ${city}`, lat, lon };
};

const MapClick = ({ setBarangaySearch, setSelectedLatLon, setSelectedBarangay }) => {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      const b = await getBarangayFromCoordinates(lat, lng);
      if (b) {
        setBarangaySearch(b.name);
        setSelectedBarangay(b.name);
        setSelectedLatLon({ lat: b.lat, lon: b.lon });
      }
    },
  });
  return null;
};

function MapUpdater({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView([coords.lat, coords.lon], 14, { animate: true });
  }, [coords, map]);
  return null;
}

const Profile = ({ role, setCurrentView, currentUser, userProfile }) => {
  const isClient = role === "client";

  const [profilePic, setProfilePic] = useState(userProfile?.profilePic || '');
  const [fullName, setFullName] = useState(userProfile?.fullName || '');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [location, setLocation] = useState(userProfile?.location || '');
  const [communities, setCommunities] = useState(userProfile?.communities || []);
  const [defaultCommunity, setDefaultCommunity] = useState(userProfile?.defaultCommunity || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [skills, setSkills] = useState(userProfile?.skills || []);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const fileInputRef = useRef(null);

  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [barangaySearch, setBarangaySearch] = useState("");
  const [filteredBarangays, setFilteredBarangays] = useState([]);
  const [selectedLatLon, setSelectedLatLon] = useState({ lat: 16.4023, lon: 120.596 });
  const [selectedBarangay, setSelectedBarangay] = useState(defaultCommunity);

  // Update local state when userProfile prop changes
  useEffect(() => {
    if (userProfile) {
      setProfilePic(userProfile.profilePic || '');
      setFullName(userProfile.fullName || '');
      setEmail(userProfile.email || '');
      setPhone(userProfile.phone || '');
      setLocation(userProfile.location || '');
      setCommunities(userProfile.communities || []);
      setDefaultCommunity(userProfile.defaultCommunity || '');
      setBio(userProfile.bio || '');
      setSkills(userProfile.skills || []);
      setSelectedBarangay(userProfile.defaultCommunity || '');
    }
  }, [userProfile]);

  const handleOpenCommunityModal = () => {
    setBarangaySearch("");
    setFilteredBarangays([]);
    setShowCommunityModal(true);
  };

  const handleBarangaySearch = async (value) => {
    setBarangaySearch(value);
    const suggestions = await fetchBarangaySuggestions(value);
    setFilteredBarangays(suggestions);
  };

  const handleJoinCommunity = (b) => {
    if (window.confirm(`Join ${b.name}?`)) {
      if (!communities.includes(b.name)) setCommunities([...communities, b.name]);
      setSelectedBarangay(b.name);
      setSelectedLatLon({ lat: b.lat, lon: b.lon });
      setDefaultCommunity(b.name);
      setShowCommunityModal(false);
    }
  };

  const handleSave = async () => {
    const updatedData = {
      profilePic,
      fullName,
      email,
      phone,
      location,
      communities,
      defaultCommunity,
      bio,
      skills,
      latLon: selectedLatLon
    };

    try {
      await saveProfileRealtime(currentUser, updatedData);
      setIsEditingBio(false);
      setIsEditingProfile(false);
      alert('Profile saved successfully!');
    } catch (err) {
      console.error("Failed to save profile", err);
      setProfileError("Failed to save profile. Check console.");
    }
  };

  return (
    <div className="profile-page flex flex-col md:flex-row justify-start w-full min-h-screen p-8 bg-gray-50 gap-12" style={{ paddingTop: "100px" }}>
      <div className="profile-left flex flex-col items-center gap-6 md:w-1/3">
        <div className="profile-pic-container relative">
          <img src={profilePic} alt="profile" className="profile-pic" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                setIsUploadingPic(true);
                const url = await uploadFileToCloudinary(file);
                setProfilePic(url);
              } catch (err) {
                console.error(err);
                setProfileError("Failed to upload.");
              } finally {
                setIsUploadingPic(false);
                e.target.value = null;
              }
            }}
            className="hidden"
          />
          <button
            className="edit-pic-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPic}
          >
            {isUploadingPic ? "Uploading..." : "Edit"}
          </button>
        </div>

        <div className="contact-info flex flex-col gap-2 text-center md:text-left">
          <div>
            <strong>Email:</strong>{" "}
            {isEditingProfile ? (
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="rd-search-input p-1" />
            ) : email}
          </div>
          <div>
            <strong>Phone:</strong>{" "}
            {isEditingProfile ? (
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="rd-search-input p-1" />
            ) : phone}
          </div>
          <div>
            <strong>Location:</strong>{" "}
            {isEditingProfile ? (
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="rd-search-input p-1" />
            ) : location}
          </div>
        </div>
      </div>

      <div className="profile-right flex flex-col gap-6 md:w-2/3 text-center md:text-left">
        <div className="flex items-center justify-between">
          {isEditingProfile ? (
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="text-4xl font-bold rd-search-input p-2" />
          ) : (
            <h1 className="text-5xl font-bold">{fullName}</h1>
          )}
          <button className="action-btn btn-secondary px-3 py-1" onClick={() => setIsEditingProfile((s) => !s)}>
            {isEditingProfile ? "Done" : "Edit Profile"}
          </button>
        </div>

        <div className="communities flex flex-col gap-2">
          <strong>Communities:</strong>
          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            {communities.map((c) => (
              <span
                key={c}
                className={`community-badge relative cursor-pointer ${c === selectedBarangay ? "default-community" : ""}`}
                onClick={() => {
                  setSelectedBarangay(c);
                  setDefaultCommunity(c);
                }}
              >
                {c} {c === selectedBarangay && "(Default)"}
                {isEditingProfile && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const updated = communities.filter((com) => com !== c);
                      setCommunities(updated);
                      if (selectedBarangay === c) {
                        setSelectedBarangay(updated[0] || "");
                        setDefaultCommunity(updated[0] || "");
                      }
                    }}
                    className="ml-1 text-red-500 font-bold hover:text-red-700 absolute top-0 -right-2"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          <button className="action-btn px-3 py-1 mt-2 w-max" onClick={handleOpenCommunityModal}>
            + Join New Community
          </button>
        </div>

        {showCommunityModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setShowCommunityModal(false)}>✕</button>
              <h3 className="text-xl font-semibold mb-4">Join a New Community</h3>
              <input
                type="text"
                placeholder="Search Barangay..."
                value={barangaySearch}
                onChange={(e) => handleBarangaySearch(e.target.value)}
                className="border p-2 rounded w-full mb-2"
              />
              <div className="max-h-40 overflow-y-auto mb-4 border rounded">
                {filteredBarangays.map((b) => (
                  <div key={b.name} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleJoinCommunity(b)}>
                    {b.name}
                    <button className="text-sm ml-2 px-1 py-0.5 border rounded">Join</button>
                  </div>
                ))}
              </div>
              <div className="border h-64 w-full">
                <MapContainer center={[selectedLatLon.lat, selectedLatLon.lon]} zoom={14} style={{ height: "100%", width: "100%" }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[selectedLatLon.lat, selectedLatLon.lon]} />
                  <MapClick setBarangaySearch={setBarangaySearch} setSelectedLatLon={setSelectedLatLon} setSelectedBarangay={setSelectedBarangay} />
                  <MapUpdater coords={selectedLatLon} />
                </MapContainer>
              </div>
            </div>
          </div>
        )}

        <div className="bio flex flex-col gap-2">
          <div className="flex items-center">
            <strong className="text-lg">About Me:</strong>
            <button className="edit-btn action-btn px-2 py-0.5 text-s ml-1 !h-auto !leading-none !py-0 !px-1 relative top-0.5" onClick={() => setIsEditingBio(!isEditingBio)}>
              {isEditingBio ? "Save" : "Edit"}
            </button>
          </div>
          {isEditingBio ? (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="bio-textarea p-2 border rounded resize-none w-full"
              rows={1}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
            />
          ) : (
            <p className="bio-text">{bio}</p>
          )}
        </div>

        {!isClient && (
          <div className="skills flex flex-col gap-2">
            <strong>Skills:</strong>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 justify-center">
              {skills.map((skill, idx) => (
                <div key={idx} className={`p-2 rounded flex items-center justify-between border ${skill.verified ? "border-green-500 bg-green-50" : "border-gray-300"}`}>
                  <span>{skill.name}</span>
                  {skill.verified && <span className="text-green-600 font-bold">✔</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col justify-end w-full h-full mt-6">
          <button className="action-btn client-post-btn w-1/3" onClick={handleSave}>
            Save Profile
          </button>
          {profileError && <div className="text-red-600 mt-2">{profileError}</div>}
        </div>
      </div>
    </div>
  );
};

export default Profile;