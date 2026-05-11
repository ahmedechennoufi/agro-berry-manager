/**
 * Firestore Sync Module
 *
 * Permet au Manager (admin) d'écrire dans la même Firestore que le magasinier,
 * pour que tous les mouvements (entrées, sorties, conso, transferts) soient
 * visibles côté magasinier en temps réel.
 *
 * Architecture :
 *  - Le magasinier écrit dans Firestore (primary) + GitHub (best-effort)
 *  - Le Manager écrit dans GitHub (primary, comportement actuel) + Firestore (best-effort, NOUVEAU)
 *
 * Auth : on utilise Firebase Auth (même projet que magasinier). L'admin se
 *        connecte une fois avec son compte admin@... ; la session persiste
 *        dans localStorage automatiquement.
 */

import { db, auth } from "../firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";

/**
 * Indique si l'admin est connecté à Firestore (donc dual-write activé).
 */
export const isFirestoreSyncReady = () => !!auth.currentUser;

/**
 * Sauvegarde 1 mouvement dans Firestore.
 * doc id = movement.id (numérique stable, comme magasinier).
 * Idempotent : un retry réécrit le même doc, pas de doublon.
 */
export async function saveMovementToFirestore(movement) {
  if (!auth.currentUser) return; // pas connecté → no-op
  if (!movement?.id) {
    console.warn("⚠️ saveMovementToFirestore: movement sans id, ignoré", movement);
    return;
  }
  await setDoc(doc(db, "movements", String(movement.id)), movement, { merge: false });
}

/**
 * Met à jour partiellement un mouvement dans Firestore.
 * Merge=true → on ne touche que les champs envoyés.
 */
export async function updateMovementInFirestore(mvId, updates) {
  if (!auth.currentUser) return;
  if (!mvId) return;
  await setDoc(doc(db, "movements", String(mvId)), updates, { merge: true });
}

/**
 * Supprime un mouvement de Firestore.
 */
export async function deleteMovementFromFirestore(mvId) {
  if (!auth.currentUser) return;
  if (!mvId) return;
  await deleteDoc(doc(db, "movements", String(mvId)));
}

/**
 * MIGRATION ONE-SHOT
 * Pousse en batch tous les mouvements "admin-only" (sans saisiepar) dans Firestore.
 * - Idempotent : si le doc existe déjà, il est écrasé avec les mêmes données.
 * - Batches de 400 (limite Firestore = 500/batch).
 * - Tu peux passer tous les mouvements (admin + magasinier) ; ceux du magasinier
 *   seront ré-écrits à l'identique sans problème.
 *
 * @param {Array} movements - liste complète des mouvements à pousser
 * @param {Function} onProgress - callback(done, total)
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 */
export async function migrateMovementsToFirestore(movements, onProgress) {
  if (!auth.currentUser) {
    throw new Error("Connecte-toi d'abord à Firestore avant de migrer.");
  }
  if (!Array.isArray(movements) || movements.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  // Filtrer les mouvements valides (avec id)
  const valid = movements.filter((m) => m && m.id);
  const total = valid.length;
  let success = 0;
  let failed = 0;
  const errors = [];

  const BATCH_SIZE = 400;
  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const chunk = valid.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const mv of chunk) {
      batch.set(doc(db, "movements", String(mv.id)), mv);
    }
    try {
      await batch.commit();
      success += chunk.length;
    } catch (e) {
      failed += chunk.length;
      errors.push({ batchStart: i, error: e.message });
      console.error(`Migration batch ${i}-${i + chunk.length} échoué:`, e);
    }
    if (onProgress) onProgress(success + failed, total);
  }

  return { success, failed, errors };
}

/**
 * MIGRATION CIBLÉE - seulement les mouvements admin (sans saisiepar)
 * Plus économique : on évite de ré-écrire les 693 mouvements magasiniers déjà en place.
 */
export async function migrateAdminMovementsToFirestore(allMovements, onProgress) {
  const adminOnly = (allMovements || []).filter((m) => m && m.id && !m.saisiepar);
  return migrateMovementsToFirestore(adminOnly, onProgress);
}
