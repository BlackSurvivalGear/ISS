import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { auth } from "./firebase-core.js";

export const SUPERADMIN_EMAIL="admin@lawal.org";
export const isSuperAdmin=user=>String(user?.email||"").toLowerCase()===SUPERADMIN_EMAIL;
export const signIn=(email,password)=>signInWithEmailAndPassword(auth,email,password);
export const signOutUser=()=>signOut(auth);
export const observeAuth=callback=>onAuthStateChanged(auth,callback);
export { auth };
