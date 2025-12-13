// src/Provider/ProviderHome.jsx 
import React, { useState, useRef, useEffect } from "react";

// RequestCard
const RequestCard = ({ request, onViewDetails, onSendOffer }) => (
  <div className="card hover:shadow-lg transition-shadow duration-200 flex flex-col min-w-[220px]">
    {request.thumbnail && (
      <img
        src={request.thumbnail}
        alt={request.title}
        className="w-full max-h-36 object-cover rounded-lg mb-3"
      />
    )}
    <div className="flex-1 flex flex-col space-y-1">
      <h3 className="font-semibold text-lg truncate" title={request.title}>
        {request.title}
      </h3>
      <span className="tag truncate">{request.type}</span>
      <p className="text-gray-700 truncate text-sm" title={request.location}>
        {request.location}
      </p>
      <p className="text-gray-500 text-xs">{`Posted: ${request.date}`}</p>

      <button
        className="action-btn client-view-btn mt-auto w-full py-2 text-sm"
        onClick={() => onViewDetails(request.id)}
      >
        View Full Details
      </button>

      <button
        className="action-btn client-view-btn w-full py-2 text-sm"
        onClick={() => onSendOffer && onSendOffer(request)}
      >
        Send an Offer
      </button>
    </div>
  </div>
);

// ArrowButton
const ArrowButton = ({ direction, onClick, isActive }) => (
  <button
    className={`arrow-btn ${isActive ? "active" : ""}`}
    onClick={onClick}
    disabled={!isActive}
  >
    {direction === "left" ? (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    )}
  </button>
);

// SearchBar
const SearchBar = ({ value, onChange }) => (
  <input
    className="search-input px-3 py-2 border border-gray-300 rounded-md flex-grow min-w-0"
    placeholder="Search client requests or communities..."
    value={value}
    onChange={onChange}
  />
);

const ProviderHome = ({ requests = [], onViewDetails, onSendOffer, navigateToProfile, userProfile }) => {
  const [filterText, setFilterText] = useState("");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [customType, setCustomType] = useState("");
  const [communityFilter, setCommunityFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const dropdownRef = useRef(null);

  const TYPES = [
    "Construction","Electrical","Plumbing","Mechanical","Transport",
    "Logistics","Manufacturing","Welding","Painting","Landscaping","Other"
  ];

  // Get communities from user profile or default to empty array
  const providerCommunities = userProfile?.communities || ["Baguio City"];

  console.log('🏠 ProviderHome - Received requests:', requests.length);
  console.log('📍 Provider communities:', providerCommunities);
  console.log('📋 All requests:', requests.map(r => ({ id: r.id, title: r.title, location: r.location, clientId: r.clientId })));

  // ✅ FIX: Use useMemo to stabilize the locations list
  const displayLocations = React.useMemo(() => {
    const allLocations = [...new Set(requests.map(r => r.location).filter(Boolean))];
    return [...new Set([...providerCommunities, ...allLocations])];
  }, [requests, providerCommunities]);

  // ✅ FIX: Use a stable ref object that doesn't change
  const communityRefsRef = useRef({});
  
  // Initialize refs for new communities
  React.useEffect(() => {
    displayLocations.forEach(loc => {
      if (!communityRefsRef.current[loc]) {
        communityRefsRef.current[loc] = React.createRef();
      }
    });
  }, [displayLocations]);

  const [scrollStatus, setScrollStatus] = useState({});

  const updateScrollStatus = (community) => {
    const container = communityRefsRef.current[community]?.current;
    if (!container) return;
    setScrollStatus(prev => ({
      ...prev,
      [community]: {
        left: container.scrollLeft > 0,
        right: container.scrollLeft < container.scrollWidth - container.clientWidth
      }
    }));
  };

  const scroll = (community, direction) => {
    const container = communityRefsRef.current[community]?.current;
    if (!container) return;
    const scrollAmount = 300;
    container.scrollBy({ left: direction === "right" ? scrollAmount : -scrollAmount, behavior: "smooth" });
    setTimeout(() => updateScrollStatus(community), 150);
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFilterSelect = (filterType) => {
    setActiveFilter(filterType);
    setFilterDropdownOpen(false);
    setTypeFilter("");
    setCommunityFilter("");
    setDateFilter("");
    setCustomType("");
  };

  const handleTypeClick = (type) => {
    setTypeFilter(type);
    if (type !== "Other") setFilterDropdownOpen(false);
  };

  const handleCommunityClick = (comm) => {
    if (comm === "join_new") {
      navigateToProfile && navigateToProfile();
    } else {
      setCommunityFilter(comm); 
      setFilterDropdownOpen(false); 
    }
  };

  const handleDateClick = (option) => {
    setDateFilter(option);
    setFilterDropdownOpen(false);
  };

  // Filter requests from prop (already filtered by App.jsx to exclude current user's requests)
  const filteredRequests = requests.filter(req => {
    let match = true;
    
    if (filterText) {
      match = req.title.toLowerCase().includes(filterText.toLowerCase()) ||
        (req.description && req.description.toLowerCase().includes(filterText.toLowerCase()));
    }
  
    if (typeFilter) {
      match = typeFilter === "Other" 
        ? match && req.type.toLowerCase().includes(customType.toLowerCase()) 
        : match && req.type === typeFilter;
    }

    if (communityFilter) {
      match = match && req.location === communityFilter;
    }

    return match;
  });

  console.log('🔍 After filtering:', filteredRequests.length, 'requests');

  const sortedRequests = dateFilter
    ? filteredRequests.slice().sort((a, b) => {
        const aTime = new Date(a.date).getTime();
        const bTime = new Date(b.date).getTime();
        return dateFilter === "recent" ? bTime - aTime : aTime - bTime;
      })
    : filteredRequests;

  console.log('📊 Final sorted requests:', sortedRequests.length);

  return (
    <div className="page-container flex flex-col space-y-6">
      <h2 className="text-2xl font-bold text-client-header">Requests for You</h2>

      <div className="controls flex flex-wrap gap-4 items-center relative">
        <SearchBar value={filterText} onChange={(e) => setFilterText(e.target.value)} />

        <div className="relative" ref={dropdownRef}>
          <button
            className="action-btn client-filter-btn flex-shrink-0"
            onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
          >
            Filter Requests By:
          </button>

          {filterDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-white border rounded shadow z-10 p-2 flex flex-col space-y-2">
              <button className="text-left px-2 py-1 hover:bg-gray-100 rounded" onClick={() => handleFilterSelect("type")}>By Type</button>
              <button className="text-left px-2 py-1 hover:bg-gray-100 rounded" onClick={() => handleFilterSelect("community")}>By Community</button>
              <button className="text-left px-2 py-1 hover:bg-gray-100 rounded" onClick={() => handleFilterSelect("date")}>By Date</button>
            </div>
          )}
        </div>
      </div>

      {/* Type Filter */}
      {activeFilter === "type" && (
        <div className="flex flex-wrap gap-2 mt-2">
          {TYPES.map(type => (
            <div key={type}>
              {type !== "Other" ? (
                <button
                  className={`action-btn px-3 py-1 ${typeFilter === type ? "bg-blue-500 text-white" : ""}`}
                  onClick={() => handleTypeClick(type)}
                >
                  {type}
                </button>
              ) : (
                <input
                  className="border px-3 py-1 rounded"
                  placeholder="Other type..."
                  value={typeFilter === "Other" ? customType : ""}
                  onChange={e => { setTypeFilter("Other"); setCustomType(e.target.value); }}
                />
              )}
            </div>
          ))}
        </div>
      )}
      
      {activeFilter === "community" && (
        <div className="flex flex-col gap-2">
          {displayLocations.map(comm => (
            <button
              key={comm}
              className={`action-btn px-3 py-1 ${communityFilter === comm ? "bg-blue-500 text-white" : ""}`}
              onClick={() => handleCommunityClick(comm)}
            >
              {comm}
            </button>
          ))}
          <button
            className="action-btn px-3 py-1 bg-gray-200 text-gray-800"
            onClick={() => handleCommunityClick("join_new")}
          >
            Join a New Community
          </button>
        </div>
      )}

      {/* Date Filter */}
      {activeFilter === "date" && (
        <div className="flex gap-2">
          <button 
            className={`action-btn px-3 py-1 ${dateFilter === "recent" ? "bg-blue-500 text-white" : ""}`} 
            onClick={() => handleDateClick("recent")}
          >
            Recently Added
          </button>
          <button 
            className={`action-btn px-3 py-1 ${dateFilter === "oldest" ? "bg-blue-500 text-white" : ""}`} 
            onClick={() => handleDateClick("oldest")}
          >
            Oldest
          </button>
        </div>
      )}

      {/* Community Rows */}
      {sortedRequests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No requests available yet.</p>
          <p className="text-gray-400 text-sm mt-2">Check back later for new requests from clients!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-10 mt-4">
          {displayLocations.map((community) => {
            let communityRequests = sortedRequests.filter(r => r.location === community);
            
            console.log(`📍 Community "${community}": ${communityRequests.length} requests`);
            
            if (!communityRequests.length) return null;
            
            return (
              <div key={community}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-xl">{community}</h3>
                  <div className="flex gap-2">
                    <ArrowButton 
                      direction="left" 
                      onClick={() => scroll(community, "left")} 
                      isActive={scrollStatus[community]?.left} 
                    />
                    <ArrowButton 
                      direction="right" 
                      onClick={() => scroll(community, "right")} 
                      isActive={scrollStatus[community]?.right} 
                    />
                  </div>
                </div>

                <div 
                  className="flex gap-6 overflow-x-auto scrollbar-hide" 
                  ref={el => {
                    if (el && communityRefsRef.current[community]) {
                      communityRefsRef.current[community].current = el;
                    }
                  }}
                  onScroll={() => updateScrollStatus(community)}
                >
                  {communityRequests.map(req => (
                    <RequestCard 
                      key={req.id} 
                      request={req} 
                      onViewDetails={onViewDetails} 
                      onSendOffer={onSendOffer} 
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProviderHome;