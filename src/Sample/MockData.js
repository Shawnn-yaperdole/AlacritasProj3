// src/Sample/MockData.js - FIXED PERMANENTLY

// ==============================
// CLIENT MOCK DATA
// ==============================
const _DEFAULT_CLIENT = {
  id: 1, // ✅ Client ID - ALWAYS PRESERVED
  profilePic: "https://via.placeholder.com/200",
  fullName: "John Doe",
  email: "john@example.com",
  phone: "+123456789",
  location: "123-A Don Bosco Rd., Trancoville, Baguio City",
  communities: ["Trancoville, Baguio City", "Dominican Hill-Mirador, Baguio City"],
  defaultCommunity: "Trancoville, Baguio City",
  bio: "Hello! I love connecting with providers to get things done.",
};

// ✅ FIXED: Preserve ID from defaults, merge other fields only
function loadSavedProfile(key, defaults) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return defaults;
    const raw = window.localStorage.getItem(key);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    // ✅ CRITICAL FIX: Always preserve ID, merge other fields
    return { 
      id: defaults.id,        // ALWAYS keep original ID
      ...defaults,            // Keep all defaults as base
      ...parsed               // Override only saved changes (no id override)
    };
  } catch (e) {
    console.warn('Failed to load saved profile from localStorage', e);
    return defaults;
  }
}

export const MOCK_CLIENT = loadSavedProfile('alacritas_profile_client', _DEFAULT_CLIENT);

// ✅ UPDATED: Added clientId to ALL requests
export const MOCK_CLIENT_REQUESTS = [
  {
    id: 1,
    clientId: 1, // ✅ Matches MOCK_CLIENT.id
    title: "Fix Leaking Sink",
    type: "Plumbing",
    date: "2023-10-25",
    location: "Trancoville, Baguio City",
    status: "accepted",
    description: "Sink in kitchen is leaking. Needs urgent repair.",
    thumbnail: "https://via.placeholder.com/150x100?text=Sink",
    images: ["https://via.placeholder.com/300?text=Sink+1"],
    latLon: { lat: 16.4023, lon: 120.5960 }
  },
  {
    id: 2,
    clientId: 1, // ✅ Matches MOCK_CLIENT.id
    title: "Lawn Mowing",
    type: "Landscaping",
    date: "2023-10-26",
    location: "Dominican Hill-Mirador, Baguio City",
    status: "pending",
    description: "Backyard lawn needs mowing and trimming.",
    thumbnail: "https://via.placeholder.com/150x100?text=Lawn",
    images: ["https://via.placeholder.com/300?text=Lawn"],
    latLon: { lat: 16.4100, lon: 120.6000 }
  },
  {
    id: 3,
    clientId: 1, // ✅ Matches MOCK_CLIENT.id
    title: "Install Ceiling Fan",
    type: "Electrical",
    date: "2023-10-27",
    location: "Dominican Hill-Mirador, Baguio City",
    status: "accepted",
    description: "Install a ceiling fan in the living room.",
    thumbnail: "https://via.placeholder.com/150x100?text=Fan",
    images: ["https://via.placeholder.com/300?text=Fan"],
    latLon: { lat: 16.4150, lon: 120.5950 }
  },
  {
    id: 4,
    clientId: 1, // ✅ Matches MOCK_CLIENT.id
    title: "Paint Living Room",
    type: "Painting",
    date: "2023-10-28",
    location: "Trancoville, Baguio City",
    status: "pending",
    description: "Full living room painting with prep work.",
    thumbnail: "https://via.placeholder.com/150x100?text=Paint",
    images: ["https://via.placeholder.com/300?text=Paint"],
    latLon: { lat: 16.4000, lon: 120.5900 }
  },
];

// ==============================
// PROVIDER MOCK DATA
// ==============================
const _DEFAULT_PROVIDER = {
  id: 1, // ✅ Provider ID - ALWAYS PRESERVED
  profilePic: "https://via.placeholder.com/200",
  fullName: "Jane Smith",
  email: "jane@example.com",
  phone: "+987654321",
  location: "2 St Theresa Ext., Dominican Hill-Mirador, Baguio City",
  communities: ["Trancoville, Baguio City", "Dominican Hill-Mirador, Baguio City"],
  defaultCommunity: "Dominican Hill-Mirador, Baguio City",
  bio: "Experienced provider ready to help!",
  skills: [
    { name: "Plumbing", verified: true },
    { name: "Electrical", verified: false },
    { name: "Painting", verified: true },
    { name: "Landscaping", verified: true },
  ],
};

export const MOCK_PROVIDER = loadSavedProfile('alacritas_profile_provider', _DEFAULT_PROVIDER);

// ==============================
// CLIENT OFFERS (split by status)
// ==============================
export const MOCK_CLIENT_PENDING = [
  { 
    id: 1, 
    requestId: 2, 
    title: "Lawn Mowing", 
    provider: "Jane Smith", 
    amount: "$70", 
    status: "pending", 
    description: "Backyard lawn needs mowing and trimming.",
    providerId: 1
  },
  { 
    id: 2, 
    requestId: 4, 
    title: "Paint Living Room", 
    provider: "Jan", 
    amount: "$120", 
    status: "pending", 
    description: "Full living room painting with prep work.",
    providerId: 1
  },
];

export const MOCK_CLIENT_ONGOING = [
  { 
    id: 3, 
    requestId: 1, 
    title: "Fix Leaking Sink", 
    provider: "John Smith", 
    amount: "$45", 
    status: "ongoing", 
    description: "Sink in kitchen is leaking. Needs urgent repair.",
    providerId: 1
  },
];

export const MOCK_CLIENT_HISTORY = [
  { 
    id: 4, 
    requestId: 3, 
    title: "Install Ceiling Fan", 
    provider: "Smi", 
    amount: "$60", 
    status: "finished", 
    description: "Ceiling fan installation completed successfully.",
    providerId: 1
  },
];

// ==============================
// PROVIDER OFFERS (split by status)
// ==============================
export const MOCK_PROVIDER_PENDING = [
  { 
    id: 1, 
    requestId: 2, 
    title: "Lawn Mowing", 
    client: "John Doe", 
    amount: "$70", 
    status: "pending", 
    description: "Backyard lawn needs mowing and trimming.",
    clientId: 1
  },
  { 
    id: 2, 
    requestId: 4, 
    title: "Paint Living Room", 
    client: "John", 
    amount: "$120", 
    status: "pending", 
    description: "Full living room painting with prep work.",
    clientId: 1
  },
];

export const MOCK_PROVIDER_ONGOING = [
  { 
    id: 3, 
    requestId: 1, 
    title: "Fix Leaking Sink", 
    client: "Man Doe", 
    amount: "$45", 
    status: "ongoing", 
    description: "Sink in kitchen is leaking. Needs urgent repair.",
    clientId: 1
  },
];

export const MOCK_PROVIDER_HISTORY = [
  { 
    id: 4, 
    requestId: 3, 
    title: "Install Ceiling Fan", 
    client: "John", 
    amount: "$60", 
    status: "finished", 
    description: "Ceiling fan installation completed successfully.",
    clientId: 1
  },
];

// ==============================
// CHAT MOCK DATA
// ==============================
export const MOCK_CHATS = [
  { id: 1, name: "Mario Plumber", lastMsg: "I will finish the job in 3 days.", avatar: "https://randomuser.me/api/portraits/men/32.jpg", lastMsgTime: "10:24 AM" },
  { id: 2, name: "Green Thumb", lastMsg: "Thanks for accepting!", avatar: "https://randomuser.me/api/portraits/women/44.jpg", lastMsgTime: "Yesterday" },
];

export const CHAT_MESSAGES = [
  { id: 1, text: "Nah twin ts brokey", sender: "Mario Plumber" },
  { id: 2, text: "AAAAAAH HEELLL NAHHH", sender: "Self" },
];

export const ACCEPTED_OFFER = {
  requestId: 1,
  image: "https://via.placeholder.com/80",
  title: "Sink Repair Request",
  location: "Dominican Hill-Mirador, Baguio City",
  date: "Nov 28, 2025",
  price: "₱1,500",
  fullDescriptionLink: "#"
};
