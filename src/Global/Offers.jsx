// src/Global/Offers.jsx 
import React, { useState } from "react";

const OfferCard = ({ offer, role, onViewDetails}) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "accepted": return "bg-green-100 text-green-800";
      case "declined": return "bg-red-100 text-red-800";
      case "cancelled": return "bg-gray-100 text-gray-800";
      case "counter": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200 flex flex-col" style={{ minHeight: '480px', height: 'auto' }}>
      {/* Provider Info */}
      <div className="flex items-center gap-3 mb-3">
        <img 
          src={offer.provider?.profilePic || 'https://ui-avatars.com/api/?name=Provider'} 
          alt={offer.provider?.fullName}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold truncate">{offer.provider?.fullName || 'Provider'}</h4>
        </div>
      </div>

      {/* Offer Details */}
      <div className="flex-1 flex flex-col">
        <div className="mb-3">
          <p className="text-gray-700 text-sm" style={{ 
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '60px'
          }}>
            {offer.description}
          </p>
        </div>
        
        <p className="text-2xl font-bold text-green-600 mb-2">₱{parseFloat(offer.amount || 0).toLocaleString()}</p>
        
        <span className={`tag px-3 py-1 rounded-full text-sm font-semibold self-start mb-3 ${getStatusColor(offer.status)}`}>
          {offer.status?.toUpperCase()}
        </span>

        {/* Action Buttons - Always at bottom */}
        <div className="flex flex-col gap-2 mt-auto">
          <button
            className="action-btn client-view-btn w-full py-2 text-sm"
            onClick={() => onViewDetails(offer.id)}
          >
            View Details
          </button>

        </div>
      </div>
    </div>
  );
};

const Offers = ({ role, offers, requests, currentUser, onOfferUpdate, onViewOfferDetails }) => {
  const [filterText, setFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // ✅ FIXED: Filter offers based on role and request ownership
  // In CLIENT mode: Show offers for MY requests (I'm the request creator)
  // In PROVIDER mode: Show MY offers (I created the offers)
  const roleFilteredOffers = role === "client" 
    ? offers.filter(o => {
        // Find the request this offer is for
        const request = requests.find(r => r.id === o.requestId);
        // Show offer if the request belongs to current user AND offer is from someone else
        return request && request.clientId === currentUser && o.providerId !== currentUser;
      })
    : offers.filter(o => o.providerId === currentUser); // Show offers I created

  console.log('🔍 Offer filtering:', { 
    role, 
    currentUser, 
    totalOffers: offers.length, 
    filteredOffers: roleFilteredOffers.length 
  });

  // Apply search and status filters
  const filteredOffers = roleFilteredOffers.filter(offer => {
    const matchesSearch = filterText === "" || 
      offer.description?.toLowerCase().includes(filterText.toLowerCase()) ||
      offer.provider?.fullName?.toLowerCase().includes(filterText.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || offer.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (offerId) => {
    const offer = offers.find(o => o.id === offerId);
    if (!offer) return;

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this offer? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      const updatedOffer = { ...offer, status: "cancelled" };
      onOfferUpdate(updatedOffer);
    } catch (error) {
      console.error("Failed to delete offer:", error);
      alert("Failed to delete offer");
    }
  };

  return (
    <div className="page-container flex flex-col space-y-6">
      <h2 className="text-2xl font-bold text-client-header">
        {role === "client" ? "Offers Received" : "My Offers"}
      </h2>

      {/* Search and Filter Controls */}
      <div className="controls flex flex-wrap gap-4 items-center">
        <input
          className="search-input px-3 py-2 border border-gray-300 rounded-md flex-grow min-w-0"
          placeholder={role === "client" ? "Search offers..." : "Search my offers..."}
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />

        <select
          className="px-3 py-2 border border-gray-300 rounded-md"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
          <option value="cancelled">Cancelled</option>
          <option value="counter">Counter Offer</option>
        </select>
      </div>

      {/* Offer Cards Grid */}
      <div
        className="card-list grid gap-6"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 270px))" }}
      >
        {filteredOffers.length > 0 ? (
          filteredOffers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              role={role}
              onViewDetails={onViewOfferDetails}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 text-lg">
              {role === "client" ? "No offers received yet." : "You haven't sent any offers yet."}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              {role === "client" 
                ? "Offers from providers will appear here." 
                : "Browse requests and send offers to get started!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Offers;