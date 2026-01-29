// استيراد الدوال اللازمة من Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, updateDoc, doc, deleteDoc, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// إعدادات Firebase - قم بنسخها من Firebase Console
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// تهيئة التطبيق
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// تفعيل العمل أوفلاين (بدون إنترنت)
enableIndexedDbPersistence(db)
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log("التبويبات المتعددة مفتوحة، لا يمكن تفعيل الأوفلاين");
        } else if (err.code == 'unimplemented') {
            console.log("المتصفح لا يدعم الميزة");
        }
    });

// تصدير المتغيرات لاستخدامها في script.js
window.db = db;
window.collection = collection;
window.addDoc = addDoc;
window.onSnapshot = onSnapshot;
window.updateDoc = updateDoc;
window.doc = doc;
window.deleteDoc = deleteDoc;

// إطلاق حدث يخبر الملف الرئيسي أن قاعدة البيانات جاهزة
const event = new Event('firebaseReady');
window.dispatchEvent(event);
