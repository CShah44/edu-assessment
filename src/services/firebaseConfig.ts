import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { Topic } from "../../src/types";
import { Question } from "../types";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface Message {
  type: "user" | "ai";
  content?: string;
  topics?: Topic[];
  questions?: Question[];
}

export const chatHistoryService = {
  async saveMessage(userId: string, message: Message) {
    const chatRef = collection(db, "chatHistory");
    await addDoc(chatRef, {
      userId,
      message,
      timestamp: serverTimestamp(),
    });
  },

  async getHistory(userId: string) {
    const chatRef = collection(db, "chatHistory");
    const q = query(
      chatRef,
      where("userId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  },

  async clearHistory(userId: string) {
    const chatRef = collection(db, "chatHistory");
    const q = query(chatRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  },
};

export { db };
