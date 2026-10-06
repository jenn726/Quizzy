import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBbtTR78az1WySNI3qXkD6UDcXLKwF5XXc",
  authDomain: "quizzy-95875.firebaseapp.com",
  projectId: "quizzy-95875",
  storageBucket: "quizzy-95875.firebasestorage.app",
  messagingSenderId: "799365033168",
  appId: "1:799365033168:web:eab09429a999fe0d5482d5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

let currentUser = null;
let saveTimer = null;

window.quizzyFirebaseReady = true;
window.quizzyUser = null;

function showFirebaseMessage(message) {
  if (typeof window.showReward === "function") window.showReward(message);
  else alert(message);
}

function progressData(data) {
  return {
    xp: Number(data?.xp || 0),
    coins: Number(data?.coins ?? data?.monedas ?? 0),
    course: data?.course || data?.curso || "",
    dragonItem: data?.dragonItem || "draco",
    dragonName: data?.dragonName || data?.dragonNombre || "Draco",
    dragonColor: data?.dragonColor || "original",
    dragonAccessory: data?.dragonAccessory || "ninguno",
    dragonEffect: data?.dragonEffect || "ninguno",
    categoriesPlayed: Array.isArray(data?.categoriesPlayed) ? data.categoriesPlayed : (Array.isArray(data?.categoriasJugadas) ? data.categoriasJugadas : []),
    questionsAnswered: Number(data?.questionsAnswered ?? data?.preguntasRespondidas ?? 0),
    correctAnswers: Number(data?.correctAnswers ?? data?.respuestasCorrectas ?? 0),
    claimedAchievements: Array.isArray(data?.claimedAchievements) ? data.claimedAchievements : (Array.isArray(data?.logrosConseguidos) ? data.logrosConseguidos : []),
    missions: data?.missions ?? data?.misiones ?? null
  };
}

window.guardarProgresoQuizzy = function(data) {
  if (!currentUser) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await setDoc(doc(db, "users", currentUser.uid), {
        ...progressData(data),
        email: currentUser.email || "",
        displayName: currentUser.displayName || "",
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Error guardando progreso en Firebase:", error);
    }
  }, 800);
};

async function cargarProgresoNube(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    if (typeof window.getQuizzyProgress === "function") {
      window.guardarProgresoQuizzy(window.getQuizzyProgress());
    }
    return;
  }

  const cloud = progressData(snap.data());
  const hayLocal = Number(localStorage.getItem("quizzyQuestionsAnswered") || 0) > 0 ||
    Number(localStorage.getItem("quizzyXP") || 0) > 0;

  if (hayLocal) {
    const restaurar = confirm(
      "Hemos encontrado un progreso guardado en tu cuenta de Quizzy.\n\n" +
      "¿Quieres restaurar el progreso de la cuenta en este dispositivo?\n\n" +
      "Aceptar = restaurar la cuenta\nCancelar = conservar este dispositivo y subirlo a la cuenta"
    );
    if (!restaurar) {
      if (typeof window.getQuizzyProgress === "function") {
        window.guardarProgresoQuizzy(window.getQuizzyProgress());
      }
      return;
    }
  }

  if (typeof window.aplicarProgresoNube === "function") {
    window.aplicarProgresoNube(cloud);
  }
  showFirebaseMessage("☁️ ¡Progreso de tu cuenta restaurado!");
}

window.quizzyGoogleLogin = async function() {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error(error);
    alert("No se pudo iniciar sesión con Google: " + error.message);
  }
};

window.quizzyEmailLogin = async function() {
  const email = document.getElementById("quizzyEmail")?.value.trim();
  const password = document.getElementById("quizzyPassword")?.value;
  if (!email || !password) {
    alert("Escribe tu correo y contraseña.");
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error(error);
    alert("No se pudo iniciar sesión: " + error.message);
  }
};

window.quizzyEmailRegister = async function() {
  const email = document.getElementById("quizzyEmail")?.value.trim();
  const password = document.getElementById("quizzyPassword")?.value;
  if (!email || !password) {
    alert("Escribe tu correo y una contraseña.");
    return;
  }
  if (password.length < 6) {
    alert("La contraseña debe tener al menos 6 caracteres.");
    return;
  }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error(error);
    alert("No se pudo crear la cuenta: " + error.message);
  }
};

window.quizzyPasswordReset = async function() {
  const email = document.getElementById("quizzyEmail")?.value.trim();
  if (!email) {
    alert("Escribe primero tu correo.");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    alert("Te hemos enviado un correo para restablecer la contraseña.");
  } catch (error) {
    console.error(error);
    alert("No se pudo enviar el correo: " + error.message);
  }
};

window.quizzyLogout = async function() {
  try {
    await signOut(auth);
    if (typeof window.showAccount === "function") window.showAccount();
  } catch (error) {
    console.error(error);
    alert("No se pudo cerrar sesión: " + error.message);
  }
};

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  window.quizzyUser = user || null;
  if (typeof window.actualizarCuentaFirebase === "function") {
    window.actualizarCuentaFirebase(user || null);
  }
  if (user) {
    try {
      await cargarProgresoNube(user);
    } catch (error) {
      console.error("No se pudo cargar el progreso de Firebase:", error);
    }
  }
});
