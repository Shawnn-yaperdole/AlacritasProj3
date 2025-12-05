// src/Global/Profile.jsx
import React, { useState, useRef } from "react";
import { MOCK_CLIENT, MOCK_PROVIDER } from "../Sample/MockData";
import { saveProfileRealtime, saveProfile } from "../lib/firebase";
import { uploadFileToCloudinary } from "../lib/cloudinary";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default Leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// --- Nominatim Helpers ---
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

// --- Map Click Component ---
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

// --- Map Updater ---
function MapUpdater({ coords }) {
  const map = useMap();
  if (coords) map.setView([coords.lat, coords.lon], 14, { animate: true });
  return null;
}

const Profile = ({ role, setCurrentView }) => {
  const isClient = role === "client";
  const initialData = isClient ? MOCK_CLIENT : MOCK_PROVIDER;

  // --- Profile State ---
  const [profilePic, setProfilePic] = useState(initialData.profilePic);
  const [fullName, setFullName] = useState(initialData.fullName);
  const [email, setEmail] = useState(initialData.email);
  const [phone, setPhone] = useState(initialData.phone);
  const [location, setLocation] = useState(initialData.location);
  const [communities, setCommunities] = useState(initialData.communities);
  const [defaultCommunity, setDefaultCommunity] = useState(initialData.defaultCommunity);
  const [bio, setBio] = useState(initialData.bio);
  const [skills, setSkills] = useState(initialData.skills || []);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isUploadingPic, setIsUploadingPic] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const fileInputRef = useRef(null);

  // --- Community Modal ---
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [barangaySearch, setBarangaySearch] = useState("");
  const [filteredBarangays, setFilteredBarangays] = useState([]);
  const [selectedLatLon, setSelectedLatLon] = useState({ lat: 16.4023, lon: 120.596 });
  const [selectedBarangay, setSelectedBarangay] = useState(defaultCommunity);

  const handleOpenCommunityModal = () => {
    setBarangaySearch("");
    setFilteredBarangays([]);
    setShowCommunityModal(true);
  };
  const handleCloseCommunityModal = () => setShowCommunityModal(false);

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

  // --- Save Profile ---
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
    };

    try {
      await saveProfileRealtime(isClient ? "client" : "provider", updatedData);
    } catch (rtdbErr) {
      try {
        await saveProfile(isClient ? "client" : "provider", updatedData);
      } catch (fsErr) {
        console.error("Failed to save profile", rtdbErr, fsErr);
        setProfileError("Failed to save profile. Check console.");
        return;
      }
    }

    try {
      if (window?.localStorage) {
        const key = isClient ? "alacritas_profile_client" : "alacritas_profile_provider";
        window.localStorage.setItem(key, JSON.stringify(updatedData));
      }
    } catch (e) {
      console.warn("Failed to persist profile locally", e);
    }

    setIsEditingBio(false);
    setIsEditingProfile(false);

    if (setCurrentView) setCurrentView(isClient ? "ClientHome" : "ProviderHome");
  };

  return (
    <div
      className="profile-page flex flex-col md:flex-row justify-start w-full min-h-screen p-8 bg-gray-50 gap-12"
      style={{ paddingTop: "100px" }}
    >
      {/* LEFT */}
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
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rd-search-input p-1"
              />
            ) : (
              email
            )}
          </div>
          <div>
            <strong>Phone:</strong>{" "}
            {isEditingProfile ? (
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rd-search-input p-1"
              />
            ) : (
              phone
            )}
          </div>
          <div>
            <strong>Location:</strong>{" "}
            {isEditingProfile ? (
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="rd-search-input p-1"
              />
            ) : (
              location
            )}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="profile-right flex flex-col gap-6 md:w-2/3 text-center md:text-left">
        <div className="flex items-center justify-between">
          {isEditingProfile ? (
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="text-4xl font-bold rd-search-input p-2"
            />
          ) : (
            <h1 className="text-5xl font-bold">{fullName}</h1>
          )}
          <button
            className="action-btn btn-secondary px-3 py-1"
            onClick={() => setIsEditingProfile((s) => !s)}
          >
            {isEditingProfile ? "Done" : "Edit Profile"}
          </button>
        </div>

        {/* Communities */}
        <div className="communities flex flex-col gap-2">
          <strong>Communities:</strong>
          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            {communities.map((c) => (
              <span
                key={c}
                className={`community-badge relative cursor-pointer ${
                  c === selectedBarangay ? "default-community" : ""
                }`}
                onClick={() => {
                  // NEW BEHAVIOR:
                  // Only swap default community
                  setSelectedBarangay(c);
                  setDefaultCommunity(c);
                }}
              >
                {c} {c === selectedBarangay && "(Default)"}

                {isEditingProfile && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // prevent triggering default swap
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

          <button
            className="action-btn px-3 py-1 mt-2 w-max"
            onClick={handleOpenCommunityModal}
          >
            + Join New Community
          </button>
        </div>

        {/* Community Modal */}
        {showCommunityModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
              <button
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                onClick={handleCloseCommunityModal}
              >
                ✕
              </button>

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
                  <div
                    key={b.name}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleJoinCommunity(b)}
                  >
                    {b.name}
                    <button className="text-sm ml-2 px-1 py-0.5 border rounded">
                      Join
                    </button>
                  </div>
                ))}
              </div>

              <div className="border h-64 w-full">
                <MapContainer
                  center={[selectedLatLon.lat, selectedLatLon.lon]}
                  zoom={14}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[selectedLatLon.lat, selectedLatLon.lon]} />
                  <MapClick
                    setBarangaySearch={setBarangaySearch}
                    setSelectedLatLon={setSelectedLatLon}
                    setSelectedBarangay={setSelectedBarangay}
                  />
                  <MapUpdater coords={selectedLatLon} />
                </MapContainer>
              </div>
            </div>
          </div>
        )}

        {/* Bio */}
        <div className="bio flex flex-col gap-2">
          <div className="flex items-center">
            <strong className="text-lg">About Me:</strong>
            <button
              className="edit-btn action-btn px-2 py-0.5 text-s ml-1 !h-auto !leading-none !py-0 !px-1 relative top-0.5"
              onClick={() => setIsEditingBio(!isEditingBio)}
            >
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

        {/* Provider Skills */}
        {!isClient && (
          <div className="skills flex flex-col gap-2">
            <strong>Skills:</strong>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 justify-center">
              {skills.map((skill, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded flex items-center justify-between border ${
                    skill.verified ? "border-green-500 bg-green-50" : "border-gray-300"
                  }`}
                >
                  <span>{skill.name}</span>
                  {skill.verified && <span className="text-green-600 font-bold">✔</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Button */}
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
