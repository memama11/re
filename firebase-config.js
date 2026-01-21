/**
 * ไฟล์ตั้งค่า Firebase
 * ใช้ค่าคอนฟิกจากโปรเจคของคุณ
 */

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBfIxz7EpJMdbzgSMMGTUKyoyLdhCeHX84",
    authDomain: "mpro-c75a0.firebaseapp.com",
    projectId: "mpro-c75a0",
    storageBucket: "mpro-c75a0.firebasestorage.app",
    messagingSenderId: "395092738308",
    appId: "1:395092738308:web:5c9b97486237b02bc55051",
    measurementId: "G-L8PZH6BQVD"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Export สำหรับใช้ในไฟล์อื่น
export { app, db, auth, storage };