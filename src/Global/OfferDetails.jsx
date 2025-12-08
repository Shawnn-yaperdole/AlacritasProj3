// src/Global/OfferDetails.jsx - With Counter Offer Support
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
  const [counterOfferText, setCounterOfferText] = useState("");
  const [showCounterForm, setShowCounterForm] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Modals state
  const [zoomedImage, setZoomedImage] = useState(null);

  const provider = offerData.provider;
  const verifiedSkills = provider?.skills?.filter(s => s.verified).map(s => s.name) || [];
  const unverifiedSkills = provider?.skills?.filter(s => !s.verified).map(s => s.name) || [];

  // Accept offer (Client action)
  const handleAcceptOffer = async () => {
    if (status !== "pending" && status !== "counter") return;

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
    if (status !== "pending" && status !== "counter") return;

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

  // Send counter offer (Client action)
  const handleSendCounterOffer = async () => {
    if (!counterOfferText.trim()) {
      alert("Please describe what you want in the counter offer.");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");

    try {
      const updated = { 
        ...offerData, 
        status: "counter",
        counterOffer: counterOfferText,
        counterOfferDate: new Date().toISOString()
      };
      setStatus("counter");
      await saveOfferRealtime(updated.id, updated);
      onOfferUpdate(updated);
      setSaveMessage("Counter offer sent successfully!");
      setShowCounterForm(false);
      setCounterOfferText("");

      setTimeout(() => {
        if (onBackToClientHome) onBackToClientHome(null);
      }, 1000);
    } catch (error) {
      console.error("Failed to send counter offer:", error);
      setSaveMessage("Failed to send counter offer: " + (error.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  // Send/Update offer (Provider action)
  const handleSendOffer = async () => {
    if (!description || !price) {
      alert("Please fill all fields before sending offer.");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");

    const id = offerData.id || Date.now().toString();

    try {
      const payload = {
        ...offerData,
        id,
        description,
        amount: price,
        status: offerData.status === "counter" ? "counter" : "pending",
        timestamp: Date.now(),
      };

      await saveOfferRealtime(id, payload);
      
      setSaveMessage(isNewOffer ? "Offer sent successfully!" : "Offer updated successfully!");
      onOfferUpdate(payload);

      setTimeout(() => {
        if (onBackToProviderHome) onBackToProviderHome(payload);
      }, 1000);
    } catch (err) {
      console.error("Offer save failed:", err);
      setSaveMessage("Failed to save offer: " + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // Delete offer (Provider action)
  const handleDeleteOffer = async () => {
    if (!offerData?.id) return;

    const confirmDelete = window.confirm(
      "Delete this offer? This action cannot be undone."
    );
    if (!confirmDelete) return;

    setIsSaving(true);
    setSaveMessage("");

    try {
      const updated = { ...offerData, status: "cancelled" };
      await saveOfferRealtime(updated.id, updated);
      onOfferUpdate(updated);
      setSaveMessage("Offer deleted successfully!");

      setTimeout(() => {
        if (onBackToProviderHome) onBackToProviderHome(null);
      }, 1000);
    } catch (error) {
      console.error("Failed to delete offer:", error);
      setSaveMessage("Failed to delete offer: " + (error.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  const isSaveDisabled = userRole === "provider" && (!description || !price);
  const canEdit = userRole === "provider" && (status === "pending" || status === "counter");

  return (
    <div className="page-container flex flex-col space-y-6">
      <h2 className="text-2xl font-bold">{offerData.title || `Offer for Request #${requestData.id}`}</h2>

      {/* Provider Info & Details */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Provider Profile Section */}
        <div className="flex flex-col gap-4 items-center md:w-1/3">
          <div className="od-card relative w-full max-w-xs aspect-square flex flex-col items-center justify-center">
            <img 
              src={provider?.profilePic} 
              alt={provider?.fullName}
              className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition"
              onClick={() => setZoomedImage(provider?.profilePic)}
            />
          </div>

          <div className="text-center w-full">
            <h3 className="font-bold text-lg">{provider?.fullName}</h3>
            <p className="text-gray-600 text-sm">{provider?.email}</p>
            <p className="text-gray-600 text-sm">{provider?.phone}</p>
            
            <div className="flex flex-wrap gap-1 mt-3 justify-center">
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
            <label className="font-semibold text-lg mb-2 block">Description</label>
            {canEdit ? (
              <textarea
                className="w-full rd-search-input h-32"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your offer..."
              />
            ) : (
              <p className="p-4 bg-gray-50 rounded-lg border">{description}</p>
            )}
          </div>

          <div>
            <label className="font-semibold text-lg mb-2 block">Price</label>
            {canEdit ? (
              <input
                type="number"
                className="w-full rd-search-input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter price (PHP)"
              />
            ) : (
              <p className="text-3xl font-bold text-green-600 p-4 bg-green-50 rounded-lg">
                ₱{parseFloat(price || 0).toLocaleString()}
              </p>
            )}
          </div>

          <div>
            <label className="font-semibold text-lg mb-2 block">Status</label>
            <p className="p-3 bg-blue-50 rounded-lg capitalize font-medium text-lg">
              {status}
            </p>
          </div>

          {/* Counter Offer Display */}
          {offerData.counterOffer && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h4 className="font-bold text-blue-800 mb-2">Client's Counter Offer Request:</h4>
              <p className="text-gray-700">{offerData.counterOffer}</p>
              <p className="text-sm text-gray-500 mt-2">
                Sent: {new Date(offerData.counterOfferDate).toLocaleString()}
              </p>
            </div>
          )}

          {/* Client Actions */}
          {userRole === "client" && (status === "pending" || status === "counter") && (
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex flex-wrap gap-3">
                <button 
                  className="action-btn client-post-btn px-6 py-3 flex-1"
                  onClick={handleAcceptOffer}
                  disabled={isSaving}
                >
                  {isSaving ? "Processing..." : "Accept Offer"}
                </button>
                <button 
                  className="action-btn btn-secondary px-6 py-3 flex-1"
                  onClick={handleDeclineOffer}
                  disabled={isSaving}
                >
                  {isSaving ? "Processing..." : "Decline Offer"}
                </button>
              </div>

              {!showCounterForm ? (
                <button 
                  className="action-btn btn-secondary px-6 py-3 w-full"
                  onClick={() => setShowCounterForm(true)}
                  disabled={isSaving}
                >
                  Send Counter Offer
                </button>
              ) : (
                <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
                  <h4 className="font-bold mb-2">Counter Offer Request:</h4>
                  <textarea
                    className="w-full rd-search-input h-24 mb-3"
                    value={counterOfferText}
                    onChange={(e) => setCounterOfferText(e.target.value)}
                    placeholder="Describe what you want (e.g., 'Can you do it for ₱15,000 instead?' or 'Can you include materials in the price?')"
                  />
                  <div className="flex gap-2">
                    <button 
                      className="action-btn client-post-btn px-4 py-2 flex-1"
                      onClick={handleSendCounterOffer}
                      disabled={isSaving}
                    >
                      Send Counter
                    </button>
                    <button 
                      className="action-btn btn-secondary px-4 py-2"
                      onClick={() => {
                        setShowCounterForm(false);
                        setCounterOfferText("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Provider Actions */}
          {userRole === "provider" && (
            <div className="flex flex-wrap gap-4 mt-4">
              <button 
                className={`action-btn client-post-btn px-6 py-3 ${
                  isSaveDisabled || isSaving ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={handleSendOffer}
                disabled={isSaveDisabled || isSaving}
              >
                {isSaving ? "Saving..." : isNewOffer ? "Send Offer" : "Update Offer"}
              </button>

              {!isNewOffer && (
                <button 
                  className="action-btn btn-secondary px-6 py-3 bg-red-500 hover:bg-red-600 text-white"
                  onClick={handleDeleteOffer}
                  disabled={isSaving}
                >
                  {isSaving ? "Processing..." : "Delete Offer"}
                </button>
              )}

              <button
                className="action-btn btn-secondary px-6 py-3"
                onClick={() => onBackToProviderHome?.(null)}
                disabled={isSaving}
              >
                Back
              </button>
            </div>
          )}

          {/* Client Back Button */}
          {userRole === "client" && (
            <button
              className="action-btn btn-secondary px-6 py-3 mt-2"
              onClick={() => onBackToClientHome?.(null)}
              disabled={isSaving}
            >
              Back to Offers
            </button>
          )}
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`text-center p-4 rounded-lg font-semibold ${
          saveMessage.includes("Failed") 
            ? "bg-red-100 text-red-700 border-2 border-red-200" 
            : "bg-green-100 text-green-700 border-2 border-green-200"
        }`}>
          {saveMessage}
        </div>
      )}

      {/* Zoomed Image Modal */}
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

export default OfferDetails;