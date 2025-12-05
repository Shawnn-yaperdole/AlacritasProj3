// src/lib/firebase.js
// Lightweight Firebase (Firestore + Realtime DB) helper. Uses Vite env vars.
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { 
  getDatabase, 
  ref, 
  set as rtdbSet, 
  push, 
  onValue, 
  off, 
  query, 
  orderByChild, 
  update as rtdbUpdate,
  remove 
} from 'firebase/database';

// Use environment variables from .env file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let firestoreDb = null;
let realtimeDb = null;
let app = null;

try {
  app = initializeApp(firebaseConfig);
  
  try {
    firestoreDb = getFirestore(app);
  } catch (e) {
    console.warn('Firestore init failed', e);
  }

  try {
    if (firebaseConfig.databaseURL) {
      realtimeDb = getDatabase(app);
    }
  } catch (e) {
    console.warn('Realtime DB init failed', e);
  }
} catch (err) {
  console.warn('Firebase initialization failed', err);
}

// ========== REQUEST FUNCTIONS ==========

// Firestore save
export async function saveRequest(requestId, data) {
  if (!firestoreDb) throw new Error('saveRequest: Firestore not initialized');
  const docRef = doc(firestoreDb, 'requests', String(requestId));
  await setDoc(docRef, data, { merge: true });
  return docRef;
}

// Realtime Database save
export async function saveRequestRealtime(requestId, data) {
  if (!realtimeDb) throw new Error('saveRequestRealtime: Realtime Database not initialized');
  const nodeRef = ref(realtimeDb, `requests/${String(requestId)}`);
  await rtdbSet(nodeRef, data);
  return nodeRef;
}

// Realtime Database partial update
export async function updateRequestRealtime(requestId, updates) {
  if (!realtimeDb) throw new Error('updateRequestRealtime: Realtime Database not initialized');
  const nodeRef = ref(realtimeDb, `requests/${String(requestId)}`);
  await rtdbUpdate(nodeRef, updates);
  return nodeRef;
}

// Delete from Realtime Database
export async function deleteRequestRealtime(id) {
  if (!id) throw new Error("deleteRequestRealtime: No request ID provided");
  if (!realtimeDb) throw new Error("deleteRequestRealtime: Realtime DB not initialized");
  const dbRef = ref(realtimeDb, `requests/${id}`);
  await remove(dbRef);
}

// Delete from Firestore
export async function deleteRequest(id) {
  if (!id) throw new Error("deleteRequest: No request ID provided");
  if (!firestoreDb) throw new Error("deleteRequest: Firestore not initialized");
  const docRef = doc(firestoreDb, "requests", id);
  await deleteDoc(docRef);
}

// ========== PROFILE FUNCTIONS ==========

export async function saveProfileRealtime(profileKey, data) {
  if (!realtimeDb) throw new Error('saveProfileRealtime: Realtime Database not initialized');
  const nodeRef = ref(realtimeDb, `profiles/${String(profileKey)}`);
  await rtdbSet(nodeRef, data);
  return nodeRef;
}

export async function saveProfile(profileKey, data) {
  if (!firestoreDb) throw new Error('saveProfile: Firestore not initialized');
  const docRef = doc(firestoreDb, 'profiles', String(profileKey));
  await setDoc(docRef, data, { merge: true });
  return docRef;
}

// ========== MESSAGING FUNCTIONS ==========

export async function sendMessage(chatId, message) {
  if (!realtimeDb) throw new Error('sendMessage: Realtime Database not initialized');
  const msgsRef = ref(realtimeDb, `chats/${String(chatId)}/messages`);
  const timestamp = message.timestamp || Date.now();
  const payload = { ...message, timestamp };
  const pushedRef = await push(msgsRef, payload);

  try {
    const metaRef = ref(realtimeDb, `chats/${String(chatId)}/meta`);
    await rtdbUpdate(metaRef, { lastMsg: message.text || '', lastMsgTime: timestamp });
  } catch (e) {
    console.warn('Failed to update chat meta', e);
  }

  return pushedRef;
}

export function subscribeToChatMessages(chatId, onMessages) {
  if (!realtimeDb) {
    console.warn('subscribeToChatMessages: Realtime DB not initialized');
    return () => {};
  }

  const msgsQuery = query(
    ref(realtimeDb, `chats/${String(chatId)}/messages`), 
    orderByChild('timestamp')
  );
  
  const listener = onValue(msgsQuery, (snapshot) => {
    const val = snapshot.val() || {};
    const arr = Object.keys(val)
      .map((k) => ({ id: k, ...val[k] }))
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    onMessages(arr);
  });

  return () => {
    try {
      off(msgsQuery);
    } catch (e) {
      console.warn('Error removing RTDB listener', e);
    }
  };
}

export function subscribeToChats(onChats) {
  if (!realtimeDb) {
    console.warn('subscribeToChats: Realtime DB not initialized');
    return () => {};
  }

  const chatsRef = ref(realtimeDb, 'chats');
  const listener = onValue(chatsRef, (snapshot) => {
    const val = snapshot.val() || {};
    const list = Object.keys(val).map((k) => {
      const meta = val[k].meta || {};
      return {
        id: k,
        name: meta.name || meta.title || `Chat ${k}`,
        avatar: meta.avatar || '',
        lastMsg: meta.lastMsg || '',
        lastMsgTime: meta.lastMsgTime || 0,
      };
    });

    list.sort((a, b) => (b.lastMsgTime || 0) - (a.lastMsgTime || 0));
    onChats(list);
  });

  return () => {
    try {
      off(chatsRef);
    } catch (e) {
      console.warn('Error removing chats listener', e);
    }
  };
}

export async function createChat(meta = {}) {
  if (!realtimeDb) throw new Error('createChat: Realtime Database not initialized');
  const chatsRef = ref(realtimeDb, 'chats');
  const node = await push(chatsRef, { meta });
  return node.key;
}

// ========== OFFER FUNCTIONS ==========

// Save offer in Firestore
export async function saveOffer(offerId, data) {
  if (!firestoreDb) throw new Error('saveOffer: Firestore not initialized');
  const docRef = doc(firestoreDb, 'offers', String(offerId));
  await setDoc(docRef, data, { merge: true });
  return docRef;
}

// Save offer in Realtime Database
export async function saveOfferRealtime(offerId, data) {
  if (!realtimeDb) throw new Error('saveOfferRealtime: Realtime Database not initialized');
  const nodeRef = ref(realtimeDb, `offers/${String(offerId)}`);
  await rtdbSet(nodeRef, data);
  return nodeRef;
}

// Partial update offer in Realtime Database
export async function updateOfferRealtime(offerId, updates) {
  if (!realtimeDb) throw new Error('updateOfferRealtime: Realtime Database not initialized');
  const nodeRef = ref(realtimeDb, `offers/${String(offerId)}`);
  await rtdbUpdate(nodeRef, updates);
  return nodeRef;
}

// Delete offer from Firestore
export async function deleteOffer(offerId) {
  if (!firestoreDb) throw new Error('deleteOffer: Firestore not initialized');
  const docRef = doc(firestoreDb, 'offers', String(offerId));
  await deleteDoc(docRef);
}

// Delete offer from Realtime Database
export async function deleteOfferRealtime(offerId) {
  if (!realtimeDb) throw new Error('deleteOfferRealtime: Realtime Database not initialized');
  const dbRef = ref(realtimeDb, `offers/${String(offerId)}`);
  await remove(dbRef);
}

// Subscribe to offers with real-time updates
export function subscribeToOffers(onOffers) {
  if (!realtimeDb) {
    console.warn('subscribeToOffers: Realtime DB not initialized');
    return () => {};
  }

  const offersRef = ref(realtimeDb, 'offers');
  const listener = onValue(offersRef, (snapshot) => {
    const val = snapshot.val() || {};
    const list = Object.keys(val).map(k => ({ 
      id: Number(k), 
      ...val[k] 
    }));
    onOffers(list);
  });

  return () => {
    try {
      off(offersRef);
    } catch (e) {
      console.warn('Error removing offers listener', e);
    }
  };
}

// ========== UTILITY FUNCTIONS ==========

// Check Firebase initialization status
export function getFirebaseStatus() {
  return {
    firestoreInitialized: !!firestoreDb,
    realtimeDbInitialized: !!realtimeDb,
    appInitialized: !!app
  };
}

// ========== EXPORTS ==========
export { firestoreDb as db, realtimeDb, app };