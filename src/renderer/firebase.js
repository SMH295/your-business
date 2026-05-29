import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBociBM0D3Ya7ikC8fc3ew4d5-JjgcwzDw",
  authDomain: "your-business-ffe44.firebaseapp.com",
  projectId: "your-business-ffe44",
  storageBucket: "your-business-ffe44.firebasestorage.app",
  messagingSenderId: "463430515794",
  appId: "1:463430515794:web:4867bd7c7db002c535f38b"
}

const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)
