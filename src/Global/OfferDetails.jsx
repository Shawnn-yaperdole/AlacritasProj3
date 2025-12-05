// src/Global/OfferDetails.jsx
import React, { useState } from "react";
import { saveOfferRealtime } from "../lib/firebase";

const OfferDetails = ({
  offerData,
  requestData,
  userRole,
  onBackToClientHome,
  onBackToProviderHome,
  isNewOffer,
  onOfferUpdate
}) => {
  if (!offerData) return <div className="p-4">Offer not found</div>;
  if (!requestData) return <div className="p-4">Related request not found</div>;

  const [description, setDescription] = useState(offerData.description || "");
  const [price, setPrice] = useState(offerData.amount || "");
  const [status, setStatus] = useState(offerData.status || "pending");

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Modals state
  const [zoomedImage, setZoomedImage] = useState(null);

  const provider = offerData.provider;
  const verifiedSkills = provider?.skills?.filter(s => s.verified).map(s => s.name) || [];
  const unverifiedSkills = provider?.skills?.filter(s => !s.verified).map(s => s.name) || [];

  // Accept offer (Client action)
  const handleAcceptOffer = async () => {
    if (status !== "pending") return;

    const confirmAccept = window.confirm("Accept this offer? This action cannot be undone.");
    if (!confirmAccept) return;

    setIsSaving(true);
    setSaveMessage("");

    try {
      const updated = { ...offerData, status: "accepted" };
      setStatus("accepted");
      await saveOfferRealtime(updated.id, updated);
      onOfferUpdate(updated);
      setSaveMessage("Offer accepted successfully!");

      setTimeout(() => {
        if (onBackToClientHome) onBackToClientHome(null);
      }, 1000);
    } catch (error) {
      console.error("Failed to accept offer:", error);
      setSaveMessage("Failed to accept offer: " + (error.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  // Decline offer (Client action)
  const handleDeclineOffer = async () => {
    if (status !== "pending") return;

    const confirmDecline = window.confirm("Decline this offer?");
    if (!confirmDecline) return;

    setIsSaving(true);
    setSaveMessage("");

    try {
      const updated = { ...offerData, status: "declined" };
      setStatus("declined");
      await saveOfferRealtime(updated.id, updated);
      onOfferUpdate(updated);
      setSaveMessage("Offer declined successfully!");

      setTimeout(() => {
        if (onBackToClientHome) onBackToClientHome(null);
      }, 1000);
    } catch (error) {
      console.error("Failed to decline offer:", error);
      setSaveMessage("Failed to decline offer: " + (error.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  // Send offer (Provider action)
  const handleSendOffer = async () => {
    if (!description || !price) {
      alert("Please fill all fields before sending offer.");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");

    try {
      const payload = {
        ...offerData,
        description,
        amount: price,
        status: "pending",
        timestamp: Date.now(),
      };

      const offerId = payload.id || Date.now().toString();
      await saveOfferRealtime(offerId, payload);
      
      setSaveMessage("Offer sent successfully!");
      onOfferUpdate(payload);

      setTimeout(() => {
        if (onBackToProviderHome) onBackToProviderHome(payload);
      }, 1000);
    } catch (err) {
      console.error("Offer save failed:", err);
      setSaveMessage("Failed to send offer: " + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel offer (Provider action)
  const handleDeleteOffer = async () => {
    if (!offerData?.id) return;

    const confirmDelete = window.confirm(
      "Cancel this offer? This action cannot be undone."
    );
    if (!confirmDelete) return;

    setIsSaving(true);
    setSaveMessage("");

    try {
      const updated = { ...offerData, status: "cancelled" };
      await saveOfferRealtime(updated.id, updated);
      onOfferUpdate(updated);
      setSaveMessage("Offer cancelled successfully!");

      setTimeout(() => {
        if (onBackToProviderHome) onBackToProviderHome(null);
      }, 1000);
    } catch (error) {
      console.error("Failed to cancel offer:", error);
      setSaveMessage("Failed to cancel offer: " + (error.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  const isSaveDisabled = userRole === "provider" && (!description || !price);

  return (
    <div className="page-container flex flex-col space-y-6">
      <h2 className="text-2xl font-bold">{offerData.title || "New Offer"}</h2>

      {/* Provider Info & Details */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Provider Profile Section */}
        <div className="flex flex-col gap-4 items-center">
          <div className="od-card relative w-64 h-64 flex flex-col items-center justify-center">
            <img 
              src={provider?.profilePic} 
              alt={provider?.fullName}
              className="w-64 h-64 object-cover rounded-lg mb-2"
              onClick={() => setZoomedImage(provider?.profilePic)}
            />
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

          <div className="text-center">
            <h3 className="font-bold text-lg">{provider?.fullName}</h3>
            <div className="flex flex-wrap gap-1 mt-2 justify-center max-w-64">
              {verifiedSkills.map((skill, idx) => (
                <span key={idx} className="od-skill-verified text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                  {skill} ✔
                </span>
              ))}
              {unverifiedSkills.map((skill, idx) => (
                <span key={idx} className="od-skill-unverified text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="flex-1 flex flex-col gap-4">
          <div>
            <label className="font-semibold">Description</label>
            {userRole === "provider" ? (
              <textarea
                className="w-full rd-search-input h-32"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your offer..."
              />
            ) : (
              <p className="p-4 bg-gray-50 rounded-lg">{description}</p>
            )}
          </div>

          <div>
            <label className="font-semibold">Price</label>
            {userRole === "provider" ? (
              <input
                type="number"
                className="w-full rd-search-input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter price (PHP)"
              />
            ) : (
              <p className="text-2xl font-bold text-green-600 p-4 bg-green-50 rounded-lg">
                ₱{parseFloat(price || 0).toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <label className="font-semibold">Status</label>
            <p className="p-3 bg-blue-50 rounded-lg capitalize font-medium">
              {status}
            </p>
          </div>

          {/* Client Actions */}
          {userRole === "client" && status === "pending" && (
            <div className="flex flex-wrap gap-4 mt-2">
              <button 
                className="action-btn client-post-btn px-6 py-2"
                onClick={handleAcceptOffer}
                disabled={isSaving}
              >
                {isSaving ? "Processing..." : "Accept Offer"}
              </button>
              <button 
                className="action-btn btn-secondary px-6 py-2"
                onClick={handleDeclineOffer}
                disabled={isSaving}
              >
                {isSaving ? "Processing..." : "Decline Offer"}
              </button>
            </div>
          )}

          {/* Provider Actions */}
          {userRole === "provider" && (
            <div className="flex flex-wrap gap-4 mt-2">
              <button 
                className={`action-btn client-post-btn px-6 py-2 ${
                  isSaveDisabled || isSaving ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={handleSendOffer}
                disabled={isSaveDisabled || isSaving}
              >
                {isSaving ? "Sending..." : isNewOffer ? "Create Offer" : "Update Offer"}
              </button>

              {!isNewOffer && (
                <button 
                  className="action-btn btn-secondary px-6 py-2"
                  onClick={handleDeleteOffer}
                  disabled={isSaving}
                >
                  {isSaving ? "Processing..." : "Cancel Offer"}
                </button>
              )}

              <button
                className="action-btn btn-secondary px-6 py-2"
                onClick={() => onBackToProviderHome?.(null)}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`text-center p-4 rounded-lg ${
          saveMessage.includes("Failed") ? "bg-red-100 text-red-700 border border-red-200" : "bg-green-100 text-green-700 border border-green-200"
        }`}>
          {saveMessage}
        </div>
      )}
    </div>
  );
};

export default OfferDetails;