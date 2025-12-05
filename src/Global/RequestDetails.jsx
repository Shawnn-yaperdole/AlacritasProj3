// src/Global/RequestDetails.jsx - FULL CODE WITH WORKING MAPS
import React, { useState, useEffect } from "react";
import { uploadFileToCloudinary } from "../lib/cloudinary";
import { saveRequest, saveRequestRealtime } from "../lib/firebase";
import { deleteRequest, deleteRequestRealtime } from "../lib/firebase";
import { MOCK_CLIENT_REQUESTS } from "../Sample/MockData";
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

const RequestDetails = ({ requestData, userRole, onBackToClientHome, isNewRequest, onGoToOffer, onViewClientProfile}) => {
  const [title, setTitle] = useState(requestData?.title || "");
  const [type, setType] = useState(requestData?.type || "");
  const [location, setLocation] = useState(requestData?.location || "");
  const [description, setDescription] = useState(requestData?.description || "");
  const [thumbnail, setThumbnail] = useState(requestData?.thumbnail || "");
  const [selectedLatLon, setSelectedLatLon] = useState({ lat: 16.4023, lon: 120.5960 }); // ✅ MAP STATE
  const initialAdditional = (requestData?.images || []).map((src) => ({ src }));
  const [additionalImages, setAdditionalImages] = useState(initialAdditional);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Modals state
  const [chooseThumbnailOpen, setChooseThumbnailOpen] = useState(false);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [providerViewOpen, setProviderViewOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);

  // Upload new images
  const handleUpload = (e) => {
    const files = Array.from(e.target.files).map((file) => ({
      src: URL.createObjectURL(file),
      file,
    }));

    setAdditionalImages((prev) => {
      const updated = [...prev, ...files];
      if (!thumbnail && updated.length > 0) {
        setThumbnail(updated[0].src);
      }
      return updated;
    });
  };

  // Delete request
  const handleDeleteRequest = async () => {
    if (!requestData?.id) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this request? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      const index = MOCK_CLIENT_REQUESTS.findIndex((r) => r.id === requestData.id);
      if (index !== -1){
        MOCK_CLIENT_REQUESTS.splice(index, 1);
      }

      await deleteRequestRealtime(requestData.id);

      if (onBackToClientHome) onBackToClientHome(null);
    } catch (err) {
      console.error("Failed to delete request", err);
      alert("Failed to delete request: " + (err.message || err));
    }
  };

  // Save changes
  const handleSaveChanges = async () => {
    if (!title || !type || !location || !description || additionalImages.length === 0) {
      alert("Please fill all fields and upload at least one image before saving.");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");

    try {
      // Step 1: Upload all images to Cloudinary
      const uploaded = await Promise.all(
        additionalImages.map(async (item) => {
          if (item.file) {
            const url = await uploadFileToCloudinary(item.file);
            return { src: url };
          }
          return { src: item.src };
        })
      );

      const imagesUrls = uploaded.map((u) => u.src);
      let thumbnailUrl = thumbnail;

      // Update thumbnail if it was a local URL
      if (thumbnailUrl && !thumbnailUrl.startsWith("http")) {
        const idx = additionalImages.findIndex((a) => a.src === thumbnailUrl);
        if (idx !== -1 && imagesUrls[idx]) thumbnailUrl = imagesUrls[idx];
      }

      // Ensure thumbnail is in the uploaded images
      if (!imagesUrls.includes(thumbnailUrl)) {
        thumbnailUrl = imagesUrls[0] || "";
      }

      // Step 2: Create payload with uploaded URLs
      let payload = {
        ...requestData,
        title,
        type,
        location,
        description,
        thumbnail: thumbnailUrl,
        images: imagesUrls,
        latLon: selectedLatLon, // ✅ Save map coordinates
      };

      // Step 3: Assign ID for new requests
      if (isNewRequest) {
        const maxId = MOCK_CLIENT_REQUESTS.reduce((m, r) => Math.max(m, r.id), 0);
        payload.id = maxId + 1;
      }

      // Step 4: Save to Firebase Realtime Database
      const idToSave = payload.id || requestData?.id;
      if (idToSave) {
        await saveRequestRealtime(idToSave, payload);
        console.log("Saved to Realtime Database successfully");
      }

      // Step 5: Update local state
      setAdditionalImages(imagesUrls.map((src) => ({ src })));
      setThumbnail(thumbnailUrl);

      // Step 6: Show success message
      setSaveMessage("Saved successfully!");

      // Step 7: Navigate back after a short delay (so user sees success message)
      setTimeout(() => {
        if (onBackToClientHome) onBackToClientHome(payload);
      }, 1000);

    } catch (err) {
      console.error("Failed to save request", err);
      setSaveMessage("Failed to save: " + (err.message || err));
      alert("Failed to save request. Please check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  const isSaveDisabled =
    !title || !type || !location || !description || additionalImages.length === 0;

  return (
    <div className="page-container flex flex-col space-y-6">
      <h2 className="text-2xl font-bold">{title || "New Request"}</h2>

      {/* Request Info */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Images Section */}
        <div className="flex flex-col gap-4 items-center">
          <div className="rd-card relative w-64 h-40 flex flex-col items-center justify-center">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt="Thumbnail"
                className="w-64 h-40 object-cover rounded-lg mb-2"
              />
            ) : (
              <div className="w-64 h-40 bg-gray-200 rounded-lg mb-2 flex items-center justify-center text-gray-500">
                No thumbnail
              </div>
            )}

            {userRole === "client" && (
              <button
                onClick={() => setChooseThumbnailOpen(true)}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                disabled={additionalImages.length === 0}
              >
                {thumbnail ? "Change Thumbnail" : "Choose Thumbnail"}
              </button>
            )}
          </div>

          {userRole === "client" && (
            <button
              onClick={() => setViewAllOpen(true)}
              className="mt-2 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              View All Images ({additionalImages.length})
            </button>
          )}

          {userRole === "provider" && (
            <button
              onClick={() => setProviderViewOpen(true)}
              className="mt-2 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              View All Images ({additionalImages.length})
            </button>
          )}
        </div>

        {/* Details Section */}
        <div className="flex-1 flex flex-col gap-4">
          <div>
            <label className="font-semibold">Title</label>
            {userRole === "client" ? (
              <input
                type="text"
                className="w-full rd-search-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            ) : (
              <p>{title}</p>
            )}
          </div>

          <div>
            <label className="font-semibold">Type</label>
            {userRole === "client" ? (
              <input
                type="text"
                className="w-full rd-search-input"
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
            ) : (
              <p>{type}</p>
            )}
          </div>

          <div>
            <label className="font-semibold">Location</label>
            {userRole === "client" ? (
              <>
                <input
                  type="text"
                  className="w-full rd-search-input mb-2"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Barangay/City, Street, Specific address"
                />
                {/* ✅ FULLY FUNCTIONAL LEAFLET MAP */}
                <div className="rd-map-container w-full h-64 border rounded relative">
                  <MapContainer 
                    center={[selectedLatLon.lat, selectedLatLon.lon]} 
                    zoom={14} 
                    style={{ height: "100%", width: "100%" }}
                    className="leaflet-map-container"
                  >
                    <TileLayer 
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Marker position={[selectedLatLon.lat, selectedLatLon.lon]} />
                    <MapClickRequest 
                      setLocation={setLocation}
                      setSelectedLatLon={setSelectedLatLon}
                    />
                    <MapUpdaterRequest coords={selectedLatLon} />
                  </MapContainer>
                </div>
              </>
            ) : (
              <p>{location}</p>
            )}
          </div>

          <div>
            <label className="font-semibold">Description</label>
            {userRole === "client" ? (
              <textarea
                className="w-full rd-search-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            ) : (
              <p>{description}</p>
            )}
          </div>

          {userRole === "provider" && (
            <div className="flex flex-wrap gap-4 mt-2">
              <button className="action-btn btn-secondary btn-accent px-4 py-2"
                onClick={() => onGoToOffer && onGoToOffer(requestData)}
              >
                Send Offer
              </button>

              <button className="action-btn btn-secondary px-4 py-2"
                onClick={() => onViewClientProfile && onViewClientProfile(requestData.clientId)}
              >
                View Client Profile
              </button>
            </div>
          )}
        </div>
      </div>

      {userRole === "client" && (
        <div className="flex justify-center mt-4 gap-4">
          <button
            className={`action-btn client-post-btn px-6 py-2 ${
              isSaveDisabled || isSaving ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={handleSaveChanges}
            disabled={isSaveDisabled || isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>

          <button
            className="action-btn btn-secondary px-6 py-2"
            onClick={() => onBackToClientHome(null)}
            disabled={isSaving}
          >
            Cancel
          </button>

          {requestData?.id && !isNewRequest && (
            <button
              className="action-btn btn-secondary px-6 py-2"
              onClick={handleDeleteRequest}
              disabled={isSaving}
            >
              Delete
            </button>
          )}
        </div>
      )}

      {/* Save Message */}
      {saveMessage && (
        <div className={`text-center p-2 rounded ${
          saveMessage.includes("Failed") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
        }`}>
          {saveMessage}
        </div>
      )}

      {/* ------------------ Modals ------------------ */}
      {chooseThumbnailOpen && (
        <ViewImagesModal
          images={additionalImages}
          selectThumbnail
          onClose={() => setChooseThumbnailOpen(false)}
          onSave={(newImages) => {
            setAdditionalImages(newImages);
            setThumbnail(newImages[0]?.src || "");
            setChooseThumbnailOpen(false);
          }}
        />
      )}

      {viewAllOpen && (
        <ViewImagesModal
          images={additionalImages}
          onClose={() => setViewAllOpen(false)}
          onSave={(newImages) => {
            setAdditionalImages(newImages);
            if (newImages.length > 0 && !thumbnail) setThumbnail(newImages[0].src);
            if (newImages.length === 0) setThumbnail("");
            setViewAllOpen(false);
          }}
        />
      )}

      {providerViewOpen && (
        <Modal title="All Images" onClose={() => setProviderViewOpen(false)}>
          <div className="grid grid-cols-3 gap-2">
            {additionalImages.map((img, idx) => (
              <img
                key={idx}
                src={img.src}
                alt={`Reference ${idx}`}
                className="cursor-pointer rounded border-2 border-gray-300 hover:scale-110 transition-transform"
                onClick={() => setZoomedImage(img.src)}
              />
            ))}
          </div>
        </Modal>
      )}

      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200]"
          onClick={() => setZoomedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-2xl font-bold"
            onClick={() => setZoomedImage(null)}
          >
            ✕
          </button>
          <img
            src={zoomedImage}
            alt="Zoomed"
            className="max-h-[90vh] max-w-[90vw] rounded shadow-lg"
          />
        </div>
      )}
    </div>
  );
};

// ---------- Map Components ----------
const MapClickRequest = ({ setLocation, setSelectedLatLon }) => {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      
      // Reverse geocode to get barangay
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1`;
        const res = await fetch(url);
        const data = await res.json();
        const addr = data.address || {};
        const barangay = addr.village || addr.suburb || addr.hamlet || addr.city || 'Baguio City';
        
        const newLocation = `${barangay}`;
        setLocation(newLocation);
        setSelectedLatLon({ lat, lon: lng });
      } catch (err) {
        setLocation(`Lat: ${lat.toFixed(4)}, Lon: ${lng.toFixed(4)}`);
        setSelectedLatLon({ lat, lon: lng });
      }
    },
  });
  return null;
};

const MapUpdaterRequest = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView([coords.lat, coords.lon], 14, { animate: true });
    }
  }, [coords, map]);
  return null;
};

// ---------- Modal Component ----------
const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center">
    <div className="bg-white p-4 rounded w-96 max-h-[80vh] overflow-y-auto relative z-50">
      <button
        className="absolute top-2 right-2 text-gray-600 font-bold"
        onClick={onClose}
      >
        ✕
      </button>
      <h3 className="font-bold mb-4">{title}</h3>
      {children}
    </div>
  </div>
);

// ---------- View Images Modal ----------
const ViewImagesModal = ({ images, onClose, onSave, selectThumbnail }) => {
  const [tempImages, setTempImages] = useState([...images]);
  const [selectedThumbnail, setSelectedThumbnail] = useState(
    selectThumbnail ? tempImages[0]?.src || "" : ""
  );

  const handleUpload = (files) => {
    const newFiles = Array.from(files).map((file) => ({
      src: URL.createObjectURL(file),
      file,
    }));
    setTempImages((prev) => [...prev, ...newFiles]);
    if (selectThumbnail && !selectedThumbnail && newFiles.length > 0) {
      setSelectedThumbnail(newFiles[0].src);
    }
  };

  const removeImage = (index) => {
    const removed = tempImages[index];
    setTempImages((prev) => prev.filter((_, i) => i !== index));
    if (selectThumbnail && removed.src === selectedThumbnail) {
      setSelectedThumbnail(tempImages[1]?.src || tempImages[0]?.src || "");
    }
  };

  const clearAll = () => {
    setTempImages([]);
    if (selectThumbnail) setSelectedThumbnail("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };
  const handleDragOver = (e) => e.preventDefault();

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]"
      onClick={onClose}
    >
      <div
        className="bg-white p-4 rounded w-96 max-h-[80vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <h3 className="font-bold mb-4 flex justify-between items-center">
          {selectThumbnail ? "Choose Thumbnail" : "All Images"}
          <button
            className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            onClick={clearAll}
          >
            Clear All
          </button>
        </h3>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {tempImages.map((img, idx) => (
            <div key={idx} className="relative group">
              <img
                src={img.src}
                alt={`img-${idx}`}
                className={`rounded border-2 w-full h-24 object-cover ${
                  selectThumbnail && img.src === selectedThumbnail
                    ? "border-blue-500"
                    : "border-gray-300"
                }`}
                onClick={() => selectThumbnail && setSelectedThumbnail(img.src)}
              />
              <button
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(idx)}
              >
                ✕
              </button>
            </div>
          ))}

          <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-blue-500">
            <span className="text-2xl font-bold">+</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => {
              if (selectThumbnail) {
                const reordered = [
                  { src: selectedThumbnail },
                  ...tempImages.filter((img) => img.src !== selectedThumbnail),
                ];
                onSave(reordered);
              } else {
                onSave(tempImages);
              }
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestDetails;
