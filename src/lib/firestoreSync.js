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
  getDocs,
  collection,
} from "firebase/firestore";

/**
 * Recupere l'ensemble des IDs de documents deja presents dans une collection.
 * Utilise pour eviter de re-ecrire (donc re-facturer) des documents deja migres
 * lors d'une nouvelle tentative de migration (retry apres quota epuise, etc).
 * Le cout est en LECTURES (quota bien plus large : 50k/jour gratuit vs 20k pour les ecritures).
 */
async function getExistingDocIds(collectionName) {
  const snap = await getDocs(collection(db, collectionName));
  return new Set(snap.docs.map((d) => d.id));
}

/**
 * Indique si l'admin est connecté à Firestore (donc dual-write activé).
 */
export const isFirestoreSyncReady = () => !!auth.currentUser;

/**
 * Pousse le stock du magasin central (calcule cote Manager) vers un document
 * Firestore partage, pour que l'app magasinier puisse l'afficher tel quel
 * sans jamais avoir a le recalculer elle-meme (source unique de verite,
 * evite les divergences liees a la synchro/migration des mouvements).
 */
export async function syncGlobalStockToFirestore(stockData) {
  if (!auth.currentUser) return false; // pas connecté → no-op
  await setDoc(
    doc(db, "config", "globalStockCentral"),
    cleanForFirestore({
      data: stockData, // { [productName]: { quantity, price, value } }
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser.email || "manager",
    }),
    { merge: false }
  );
  return true;
}

/**
 * Nettoie un objet avant envoi à Firestore.
 * Firestore REJETTE les valeurs `undefined` ("Unsupported field value: undefined").
 * On supprime récursivement les undefined dans les objets ET dans les tableaux.
 * Les `null` sont conservés (Firestore les accepte).
 *
 * Exemples typiques de undefined dans nos mouvements :
 *   - supplier  : présent sur les Entrées, undefined sur les Sorties/Conso
 *   - destination, fermeDest, culture, etc. (selon le type)
 */
function cleanForFirestore(value) {
  if (value === undefined) return undefined; // sera filtré par le parent
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value
      .map(cleanForFirestore)
      .filter((v) => v !== undefined);
  }
  if (typeof value === "object") {
    // Conserve les Date / Timestamp tels quels
    if (value instanceof Date) return value;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const cleaned = cleanForFirestore(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }
  return value;
}

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
  await setDoc(
    doc(db, "movements", String(movement.id)),
    cleanForFirestore(movement),
    { merge: false }
  );
}

/**
 * Met à jour partiellement un mouvement dans Firestore.
 * Merge=true → on ne touche que les champs envoyés.
 */
export async function updateMovementInFirestore(mvId, updates) {
  if (!auth.currentUser) return;
  if (!mvId) return;
  await setDoc(
    doc(db, "movements", String(mvId)),
    cleanForFirestore(updates),
    { merge: true }
  );
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
    return { success: 0, failed: 0, errors: [], skipped: 0 };
  }

  // Filtrer les mouvements valides (avec id)
  const candidates = movements.filter((m) => m && m.id);

  // Ne pousser que ce qui manque reellement dans Firestore — evite de re-facturer
  // (en ecritures) des documents deja migres a chaque nouvelle tentative.
  let existingIds;
  try {
    existingIds = await getExistingDocIds("movements");
  } catch (e) {
    console.warn("[migration] impossible de lister les mouvements existants, migration complete par securite:", e.message);
    existingIds = new Set();
  }
  const valid = candidates.filter((m) => !existingIds.has(String(m.id)));
  const skipped = candidates.length - valid.length;
  console.log(`[migration] ${candidates.length} candidats, ${skipped} deja presents (ignores), ${valid.length} a migrer`);

  const total = valid.length;
  let success = 0;
  let failed = 0;
  const errors = [];

  if (total === 0) {
    return { success: 0, failed: 0, errors: [], skipped };
  }

  // Batches plus petits (200, pas 400) : plus de rounds mais moins de risque
  // qu'un seul commit() géant reste bloqué sans jamais aboutir.
  const BATCH_SIZE = 200;
  // Timeout dur par batch : un commit() qui ne répond pas en 20s est traité
  // comme échoué au lieu de bloquer la migration indéfiniment.
  const BATCH_TIMEOUT_MS = 20000;

  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const chunk = valid.slice(i, i + BATCH_SIZE);
    console.log(`[migration] batch ${i}-${i + chunk.length}/${total}...`);

    let batch;
    try {
      batch = writeBatch(db);
      for (const mv of chunk) {
        // cleanForFirestore ou doc() peuvent throw sur une donnée corrompue —
        // avant, ça cassait TOUTE la migration silencieusement sans jamais
        // mettre à jour la progress bar. Maintenant on isole le mouvement fautif.
        batch.set(doc(db, "movements", String(mv.id)), cleanForFirestore(mv));
      }
    } catch (e) {
      failed += chunk.length;
      errors.push({ batchStart: i, error: "Préparation batch échouée : " + e.message });
      console.error(`[migration] batch ${i}-${i + chunk.length} — erreur de préparation:`, e);
      if (onProgress) onProgress(success + failed, total);
      continue;
    }

    try {
      await Promise.race([
        batch.commit(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout ${BATCH_TIMEOUT_MS / 1000}s`)), BATCH_TIMEOUT_MS)
        ),
      ]);
      success += chunk.length;
      console.log(`[migration] batch ${i}-${i + chunk.length} OK`);
    } catch (e) {
      failed += chunk.length;
      errors.push({ batchStart: i, error: e.message });
      console.error(`[migration] batch ${i}-${i + chunk.length} échoué:`, e);
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

/**
 * ===== INVENTAIRES PHYSIQUES =====
 *
 * AVANT ce correctif : les inventaires physiques saisis dans le Manager n'étaient
 * sauvegardés QUE dans GitHub (jamais dans Firestore). Or l'app magasinier calcule
 * son stock uniquement à partir des inventaires trouvés dans Firestore.
 * Résultat : un inventaire saisi côté admin n'était JAMAIS visible côté magasinier.
 *
 * Ce module applique le même pattern dual-write que pour les mouvements.
 */

/**
 * Sauvegarde 1 inventaire physique dans Firestore.
 * doc id = inventory.id (timestamp string, généré par store.savePhysicalInventory).
 * Idempotent : un retry réécrit le même doc, pas de doublon.
 */
export async function savePhysicalInventoryToFirestore(inventory) {
  if (!auth.currentUser) return; // pas connecté → no-op
  if (!inventory?.id) {
    console.warn("⚠️ savePhysicalInventoryToFirestore: inventaire sans id, ignoré", inventory);
    return;
  }
  await setDoc(
    doc(db, "physicalInventories", String(inventory.id)),
    cleanForFirestore(inventory),
    { merge: false }
  );
}

/**
 * Supprime un inventaire physique de Firestore.
 */
export async function deletePhysicalInventoryFromFirestore(invId) {
  if (!auth.currentUser) return;
  if (!invId) return;
  await deleteDoc(doc(db, "physicalInventories", String(invId)));
}

/**
 * MIGRATION ONE-SHOT — pousse en batch tous les inventaires physiques existants
 * (déjà sauvegardés en localStorage/GitHub côté Manager) vers Firestore.
 * Idempotent, batches de 400.
 *
 * @param {Array} inventories - liste complète des inventaires à pousser
 * @param {Function} onProgress - callback(done, total)
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 */
export async function migratePhysicalInventoriesToFirestore(inventories, onProgress) {
  if (!auth.currentUser) {
    throw new Error("Connecte-toi d'abord à Firestore avant de migrer.");
  }
  if (!Array.isArray(inventories) || inventories.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  const valid = inventories.filter((inv) => inv && inv.id);
  const total = valid.length;
  let success = 0;
  let failed = 0;
  const errors = [];

  const BATCH_SIZE = 200;
  const BATCH_TIMEOUT_MS = 20000;

  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const chunk = valid.slice(i, i + BATCH_SIZE);
    console.log(`[migration-inv] batch ${i}-${i + chunk.length}/${total}...`);

    let batch;
    try {
      batch = writeBatch(db);
      for (const inv of chunk) {
        batch.set(doc(db, "physicalInventories", String(inv.id)), cleanForFirestore(inv));
      }
    } catch (e) {
      failed += chunk.length;
      errors.push({ batchStart: i, error: "Préparation batch échouée : " + e.message });
      console.error(`[migration-inv] batch ${i}-${i + chunk.length} — erreur de préparation:`, e);
      if (onProgress) onProgress(success + failed, total);
      continue;
    }

    try {
      await Promise.race([
        batch.commit(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout ${BATCH_TIMEOUT_MS / 1000}s`)), BATCH_TIMEOUT_MS)
        ),
      ]);
      success += chunk.length;
      console.log(`[migration-inv] batch ${i}-${i + chunk.length} OK`);
    } catch (e) {
      failed += chunk.length;
      errors.push({ batchStart: i, error: e.message });
      console.error(`[migration-inv] batch ${i}-${i + chunk.length} échoué:`, e);
    }
    if (onProgress) onProgress(success + failed, total);
  }

  return { success, failed, errors };
}
