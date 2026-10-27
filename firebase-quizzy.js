import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  reauthenticateWithCredential,
  deleteUser,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
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
    ownedItems: Array.isArray(data?.ownedItems) ? data.ownedItems : ["draco", data?.dragonItem || "draco"],
    categoriesPlayed: Array.isArray(data?.categoriesPlayed) ? data.categoriesPlayed : (Array.isArray(data?.categoriasJugadas) ? data.categoriasJugadas : []),
    questionsAnswered: Number(data?.questionsAnswered ?? data?.preguntasRespondidas ?? 0),
    correctAnswers: Number(data?.correctAnswers ?? data?.respuestasCorrectas ?? 0),
    claimedAchievements: Array.isArray(data?.claimedAchievements) ? data.claimedAchievements : (Array.isArray(data?.logrosConseguidos) ? data.logrosConseguidos : []),
    missions: data?.missions ?? data?.misiones ?? null,
    dailyCategoriesPlayed: Array.isArray(data?.dailyCategoriesPlayed) ? data.dailyCategoriesPlayed : [],
    dailyCategoriesDate: data?.dailyCategoriesDate || "",
    dailyChallenge: data?.dailyChallenge && typeof data.dailyChallenge === "object" ? data.dailyChallenge : null,
    dailyStreak: Number(data?.dailyStreak || 0),
    dailyLastCompleted: typeof data?.dailyLastCompleted === "string" ? data.dailyLastCompleted : "",
    streakHistory: Array.isArray(data?.streakHistory) ? data.streakHistory.slice(-90) : [],
    bestStreak: Number(data?.bestStreak || 0),
    lives: Math.max(0, Math.min(5, Number(data?.lives ?? 5))),
    livesUpdatedAt: Number(data?.livesUpdatedAt || Date.now())
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

window.quizzyUpdateProfile = async function(displayName) {
  if (!currentUser) return;
  const name = String(displayName || "").trim().slice(0, 30);
  if (!name) {
    alert("Escribe un nombre.");
    return;
  }
  try {
    await updateProfile(currentUser, { displayName: name });
    await setDoc(doc(db, "users", currentUser.uid), {
      displayName: name,
      updatedAt: serverTimestamp()
    }, { merge: true });
    window.quizzyUser = currentUser;
    if (typeof window.actualizarCuentaFirebase === "function") {
      window.actualizarCuentaFirebase(currentUser);
    }
    showFirebaseMessage("✅ ¡Nombre guardado!");
  } catch (error) {
    console.error(error);
    alert("No se pudo guardar el nombre: " + error.message);
  }
};


// Perfil público mínimo y solicitudes de amistad. La seguridad final depende de las reglas de Firestore.
window.quizzySaveUsername = async function() {
  if (!currentUser) { alert("Inicia sesión para crear tu nombre de usuario."); return; }
  const input = document.getElementById("quizzyUsername");
  const username = String(input?.value || "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    alert("Usa entre 3 y 20 caracteres: letras sin tilde, números o guion bajo."); return;
  }
  try {
    await runTransaction(db, async (tx) => {
      const usernameRef = doc(db, "usernames", username);
      const profileRef = doc(db, "users", currentUser.uid);
      const usernameSnap = await tx.get(usernameRef);
      const profileSnap = await tx.get(profileRef);
      if (usernameSnap.exists() && usernameSnap.data().uid !== currentUser.uid) throw new Error("Ese nombre ya está ocupado.");
      if (profileSnap.exists() && profileSnap.data().username && profileSnap.data().username !== username) {
        const oldRef = doc(db, "usernames", profileSnap.data().username);
        tx.delete(oldRef);
      }
      tx.set(usernameRef, { uid: currentUser.uid, username, updatedAt: serverTimestamp() });
      tx.set(profileRef, { username, updatedAt: serverTimestamp() }, { merge: true });
    });
    showFirebaseMessage("✅ Nombre de usuario guardado: @" + username);
    if (typeof window.showAccount === "function") window.showAccount();
  } catch (error) { console.error(error); alert("No se pudo guardar el nombre: " + error.message); }
};

window.quizzyFindFriend = async function() {
  if (!currentUser) { alert("Inicia sesión para buscar amigos."); return; }
  const input = document.getElementById("friendSearchUsername");
  const username = String(input?.value || "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) { alert("Escribe un nombre de usuario válido."); return; }
  try {
    const snap = await getDoc(doc(db, "usernames", username));
    if (!snap.exists()) { alert("No encontramos ese nombre de usuario."); return; }
    const targetUid = snap.data().uid;
    if (!targetUid || targetUid === currentUser.uid) { alert("Ese es tu propio usuario."); return; }
    const display = snap.data().username || username;
    const ok = confirm("¿Enviar solicitud de amistad a @" + display + "?");
    if (!ok) return;
    const requestId = targetUid + "_" + currentUser.uid;
    await setDoc(doc(db, "friendRequests", requestId), {
      fromUid: currentUser.uid, toUid: targetUid, fromUsername: (await getDoc(doc(db,"users",currentUser.uid))).data()?.username || "",
      toUsername: display, status: "pending", createdAt: serverTimestamp()
    });
    showFirebaseMessage("✉️ Solicitud de amistad enviada.");
  } catch (error) { console.error(error); alert("No se pudo enviar la solicitud. Puede que falten permisos de Firebase: " + error.message); }
};

window.quizzyLoadFriendStreaks = async function() {
  const host=document.getElementById("profileFriendStreaks");
  if(!host)return;
  if(!currentUser){host.innerHTML='<p>Inicia sesión y añade amigos para ver sus rachas.</p>';return}
  host.textContent="Cargando rachas de tus amigos…";
  try{
    const friends=await getDocs(collection(db,"users",currentUser.uid,"friends"));
    if(friends.empty){host.innerHTML='<p>Aún no tienes amigos añadidos. Entra en Mi cuenta para buscar y añadir amigos.</p>';return}
    const rows=await Promise.all(friends.docs.map(async d=>{
      const f=d.data(),uid=f.uid||d.id;
      try{
        const snap=await getDoc(doc(db,"users",uid));
        const data=snap.exists()?snap.data():{};
        const streak=Number(data.dailyStreak||0);
        return '<div class="friend-streak-row"><span>🐉 @'+escapeHTML(f.username||data.username||"jugador")+'</span><span class="friend-streak-num">🔥 '+streak+' días</span></div>';
      }catch(e){return '<div class="friend-streak-row"><span>🐉 @'+escapeHTML(f.username||"jugador")+'</span><span class="small">Racha no disponible</span></div>'}
    }));
    host.innerHTML=rows.join("");
  }catch(error){console.error(error);host.innerHTML='<p>No se pudieron cargar las rachas. Revisa las reglas de acceso de Firebase.</p>'}
};

window.quizzyLoadFriends = async function() {
  const host = document.getElementById("friendsResults");
  if (!host) return;
  if (!currentUser) { host.textContent = "Inicia sesión para gestionar amigos."; return; }
  host.textContent = "Cargando solicitudes y amigos…";
  try {
    const incoming = await getDocs(query(collection(db,"friendRequests"),where("toUid","==",currentUser.uid),where("status","==","pending")));
    const outgoing = await getDocs(query(collection(db,"friendRequests"),where("fromUid","==",currentUser.uid),where("status","==","pending")));
    const friends = await getDocs(collection(db,"users",currentUser.uid,"friends"));
    let html = "<h3>✉️ Solicitudes recibidas</h3>";
    html += incoming.empty ? "<p>No tienes solicitudes pendientes.</p>" : incoming.docs.map(d=>{const x=d.data();return '<div class="item">@'+escapeHTML(x.fromUsername||"jugador")+' <button onclick="quizzyAcceptFriend(\''+escapeHTML(d.id)+'\')">Aceptar</button></div>'}).join("");
    html += "<h3>📨 Solicitudes enviadas</h3>";
    html += outgoing.empty ? "<p>No has enviado solicitudes pendientes.</p>" : outgoing.docs.map(d=>'<div class="item">Solicitud a @'+escapeHTML(d.data().toUsername||"jugador")+' · Pendiente</div>').join("");
    html += "<h3>🐉 Mis amigos</h3>";
    html += friends.empty ? "<p>Aún no tienes amigos añadidos.</p>" : friends.docs.map(d=>'<div class="item">@'+escapeHTML(d.data().username||"jugador")+'</div>').join("");
    host.innerHTML = html;
  } catch (error) { console.error(error); host.textContent = "No se pudieron cargar los amigos. Es posible que haya que configurar las reglas de Firestore."; }
};

window.quizzyAcceptFriend = async function(requestId) {
  if (!currentUser || !requestId) return;
  try {
    await runTransaction(db, async tx => {
      const reqRef = doc(db,"friendRequests",requestId);
      const req = await tx.get(reqRef);
      if (!req.exists() || req.data().toUid !== currentUser.uid || req.data().status !== "pending") throw new Error("La solicitud ya no está disponible.");
      const x=req.data();
      const myRef=doc(db,"users",currentUser.uid,"friends",x.fromUid);
      const theirRef=doc(db,"users",x.fromUid,"friends",currentUser.uid);
      tx.set(myRef,{uid:x.fromUid,username:x.fromUsername||"",createdAt:serverTimestamp()});
      tx.set(theirRef,{uid:currentUser.uid,username:x.toUsername||"",createdAt:serverTimestamp()});
      tx.update(reqRef,{status:"accepted",acceptedAt:serverTimestamp()});
    });
    showFirebaseMessage("🤝 ¡Ahora sois amigos!");
    window.quizzyLoadFriends();
  } catch (error) { console.error(error); alert("No se pudo aceptar la solicitud. Puede que falten permisos de Firebase: "+error.message); }
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

window.quizzyDeleteAccount = async function() {
  if (!currentUser) {
    alert("No hay ninguna cuenta conectada.");
    return;
  }
  const accepted = confirm("¿Quieres eliminar definitivamente tu cuenta de Quizzy y el progreso guardado en la nube? Esta acción no se puede deshacer.");
  if (!accepted) return;

  try {
    const hasPassword = currentUser.providerData?.some(provider => provider.providerId === "password");
    if (hasPassword) {
      const password = prompt("Por seguridad, escribe la contraseña de esta cuenta para confirmar la eliminación.");
      if (password === null) return;
      if (!password) {
        alert("Escribe tu contraseña para continuar.");
        return;
      }
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
    }

    await deleteDoc(doc(db, "users", currentUser.uid));
    await deleteUser(currentUser);
    currentUser = null;
    window.quizzyUser = null;
    showFirebaseMessage("✅ Tu cuenta y el progreso guardado en la nube se han eliminado.");
    if (typeof window.showAccount === "function") window.showAccount();
  } catch (error) {
    console.error("Error eliminando la cuenta de Quizzy:", error);
    const hasPasswordProvider = currentUser?.providerData?.some(provider => provider.providerId === "password");
    const hasGoogleProvider = currentUser?.providerData?.some(provider => provider.providerId === "google.com");
    if (hasGoogleProvider && !hasPasswordProvider) {
      alert("No se pudo completar la eliminación desde esta sesión. Como esta cuenta se creó con Google y el acceso con Google ya no está disponible en Quizzy, utiliza la página de solicitud de eliminación para que podamos ayudarte.");
    } else if (error.code === "auth/requires-recent-login" || error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
      alert("No se pudo verificar la cuenta o la sesión ha caducado. Cierra sesión, vuelve a entrar y repite la eliminación. Si no puedes acceder, utiliza la página de solicitud de eliminación.");
    } else {
      alert("No se pudo completar la eliminación. Puedes volver a intentarlo o usar la página de solicitud de eliminación. Código: " + (error.code || "error desconocido"));
    }
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
