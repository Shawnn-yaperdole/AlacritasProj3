// src/Client/ClientHome.jsx
import React, { useState, useRef, useEffect } from "react";
import { MOCK_CLIENT } from "../Sample/MockData";

// Reusable SearchBar component
const SearchBar = ({ value, onChange }) => (
  <input
    className="search-input px-3 py-2 border border-gray-300 rounded-md flex-grow min-w-0"
    placeholder="Search my requests..."
    value={value}
    onChange={onChange}
  />
);

// Reusable RequestCard component
const RequestCard = ({ request, onViewDetails }) => (
  <div className="card hover:shadow-lg transition-shadow duration-200 flex flex-col">
    {request.thumbnail && (
      <img
        src={request.thumbnail}
        alt={request.title}
        className="w-full h-36 object-cover rounded-lg mb-3"
      />
    )}
    <div className="flex-1 flex flex-col space-y-1">
      <h3 className="font-semibold text-lg line-clamp-1" title={request.title}>
        {request.title}
      </h3>
      <span className="tag line-clamp-1">{request.type}</span>
      <p className="text-gray-700 line-clamp-1" title={request.location}>
        {request.location}
      </p>
      <p className="text-gray-500 text-sm">{`Posted: ${request.date}`}</p>
      <button
        className="action-btn client-view-btn mt-auto w-auto py-2 px-4 text-sm"
        onClick={() => onViewDetails(request.id)}
      >
        View Full Details
      </button>
    </div>
  </div>
);

const ClientHome = ({ requests = [], onViewDetails, onCreateRequest, navigateToProfile }) => {
  const [filterText, setFilterText] = useState("");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [communityFilter, setCommunityFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const dropdownRef = useRef(null);

  const TYPES = [
    "Construction", "Electrical", "Plumbing", "Mechanical", "Transport",
    "Logistics", "Manufacturing", "Welding", "Painting", "Landscaping", "Other"
  ];

  // Close dropdown if user clicks outside
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

  const filteredRequests = requests.filter(req => {
    let match = true;

    if (filterText) match = req.title.toLowerCase().includes(filterText.toLowerCase());

    if (typeFilter) {
      match = typeFilter === "Other"
        ? match && req.type.toLowerCase().includes(filterText.toLowerCase())
        : match && req.type === typeFilter;
    }

    if (communityFilter) match = match && req.type === communityFilter;

    return match;
  });

  const sortedRequests = dateFilter
    ? filteredRequests.slice().sort((a, b) => {
        const aTime = new Date(a.date).getTime();
        const bTime = new Date(b.date).getTime();
        return dateFilter === "recent" ? bTime - aTime : aTime - bTime;
      })
    : filteredRequests;

  return (
    <div className="page-container flex flex-col space-y-6">
      <h2 className="text-2xl font-bold text-client-header">My Current Requests</h2>

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

        <button
          className="action-btn client-post-btn flex-shrink-0"
          onClick={() => onCreateRequest && onCreateRequest()}
        >
          + Post Request
        </button>
      </div>

      {activeFilter === "type" && (
        <div className="flex flex-wrap gap-2">
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
                  value={typeFilter === "Other" ? filterText : ""}
                  onChange={e => { setTypeFilter("Other"); setFilterText(e.target.value); }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {activeFilter === "community" && (
        <div className="flex flex-col gap-2">
          {MOCK_CLIENT.communities.map(comm => (
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

      <div
        className="card-list grid gap-6"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 270px))" }}
      >
        {sortedRequests.length > 0 ? (
          sortedRequests.map((req) => (
            <RequestCard key={req.id} request={req} onViewDetails={onViewDetails} />
          ))
        ) : (
          <p className="text-gray-400 col-span-full">No requests found.</p>
        )}
      </div>
    </div>
  );
};

export default ClientHome;