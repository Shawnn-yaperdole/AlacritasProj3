// src/Global/Offers.jsx
import React, { useState, useEffect } from "react";
import { saveOfferRealtime } from "../lib/firebase";

const Offers = ({ role, offers, onOfferUpdate, onViewOfferDetails }) => {
  const isClient = role === "client";
  const isProvider = role === "provider";

  const [currentTab, setCurrentTab] = useState("pending");
  const [filterText, setFilterText] = useState("");

  // Separate state arrays for each tab
  const [clientPending, setClientPending] = useState([]);
  const [clientOngoing, setClientOngoing] = useState([]);
  const [clientHistory, setClientHistory] = useState([]);

  const [providerPending, setProviderPending] = useState([]);
  const [providerOngoing, setProviderOngoing] = useState([]);
  const [providerHistory, setProviderHistory] = useState([]);

  // Sync offers prop into categorized state
  useEffect(() => {
    if (!offers || offers.length === 0) return;

    const pending = offers.filter(o => o.status === "pending");
    const ongoing = offers.filter(o => o.status === "accepted" || o.status === "ongoing");
    const history = offers.filter(o => ["declined", "finished", "cancelled"].includes(o.status));

    if (isClient) {
      setClientPending(pending);
      setClientOngoing(ongoing);
      setClientHistory(history);
    } else if (isProvider) {
      setProviderPending(pending);
      setProviderOngoing(ongoing);
      setProviderHistory(history);
    }
  }, [offers, isClient, isProvider]);

  const getCurrentData = () => {
    if (isClient) {
      switch (currentTab) {
        case "pending":
          return clientPending;
        case "ongoing":
          return clientOngoing;
        case "history":
          return clientHistory;
        default:
          return [];
      }
    } else {
      switch (currentTab) {
        case "pending":
          return providerPending;
        case "ongoing":
          return providerOngoing;
        case "history":
          return providerHistory;
        default:
          return [];
      }
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case "pending":
        return "status pending";
      case "accepted":
      case "ongoing":
        return "status accepted";
      case "declined":
        return "status denied";
      case "cancelled":
        return "status cancelled";
      case "finished":
        return "status finished";
      default:
        return "";
    }
  };

  const moveOffer = async (offer, from, to, setFrom, setTo, newStatus) => {
    try {
      // Update local state immediately for responsive UI
      setFrom(list => list.filter(o => o.id !== offer.id));
      setTo(list => [...list, { ...offer, status: newStatus }]);

      // Update in Firebase
      const updated = { ...offer, status: newStatus };
      await saveOfferRealtime(updated.id, updated);
      
      // Update parent component
      onOfferUpdate(updated);
    } catch (error) {
      console.error("Failed to update offer:", error);
      // Revert local state on error
      setFrom(list => [...list, offer]);
      setTo(list => list.filter(o => o.id !== offer.id));
      alert("Failed to update offer. Please try again.");
    }
  };

  const filteredData = getCurrentData().filter(item =>
    item.title.toLowerCase().includes(filterText.toLowerCase())
  );

  const tabs = ["pending", "ongoing", "history"];

  return (
    <div className="page-container flex flex-col">
      {/* Bubble Tabs */}
      <div className="offers-tab-container mb-6">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`offers-tab ${currentTab === tab ? "active" : ""}`}
            onClick={() => setCurrentTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <input
          type="text"
          placeholder="Search offers..."
          className="search-input flex-grow min-w-0"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
        />
        <button className="action-btn client-filter-btn flex-shrink-0">
          Filter Offers
        </button>
      </div>

      {/* Offer Cards */}
      <div className="card-list">
        {filteredData.map(offer => (
          <div key={offer.id} className="offers-card flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-lg truncate">{offer.title}</h3>
                <span className={statusColor(offer.status)}>
                  {offer.status.toUpperCase()}
                </span>
              </div>
              <p className="truncate">
                {isClient 
                  ? `From: ${offer.provider?.fullName || offer.provider}` 
                  : `To: ${offer.client || 'N/A'}`}
              </p>
              <p className="text-sm text-gray-600 truncate">{offer.description}</p>
              <p className="font-semibold mt-2">{offer.amount}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 mt-3">
              {isClient && currentTab === "pending" && (
                <div className="flex gap-2">
                  <button
                    className="action-btn accept-btn flex-1"
                    onClick={() =>
                      moveOffer(
                        offer,
                        clientPending,
                        clientOngoing,
                        setClientPending,
                        setClientOngoing,
                        "accepted"
                      )
                    }
                  >
                    Accept
                  </button>
                  <button
                    className="action-btn decline-btn flex-1"
                    onClick={() =>
                      moveOffer(
                        offer,
                        clientPending,
                        clientHistory,
                        setClientPending,
                        setClientHistory,
                        "declined"
                      )
                    }
                  >
                    Decline
                  </button>
                </div>
              )}

              {isProvider && currentTab === "pending" && (
                <button
                  className="action-btn decline-btn w-full"
                  onClick={() =>
                    moveOffer(
                      offer,
                      providerPending,
                      providerHistory,
                      setProviderPending,
                      setProviderHistory,
                      "cancelled"
                    )
                  }
                >
                  Cancel
                </button>
              )}

              {/* View Full Details */}
              <button
                className="action-btn viewinfo-btn w-full"
                onClick={() => onViewOfferDetails(offer.id)}
              >
                View Full Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Offers;