import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyAn7CIAb-cCQoRhxf9Y05V8VKtZdcD6lvE",
  authDomain: "betledger-6345e.firebaseapp.com",
  projectId: "betledger-6345e",
  storageBucket: "betledger-6345e.firebasestorage.app",
  messagingSenderId: "537494078170",
  appId: "1:537494078170:web:f731b7831948bc40f81be3",
  measurementId: "G-Z25SFK2KG5"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
