/**
 * FirebaseAuthPanel - composant à insérer dans Settings
 *
 * Affiche :
 *  - L'état de connexion Firebase (connecté / déconnecté)
 *  - Un formulaire de login (email/password) si déconnecté
 *  - Le bouton "Migrer mouvements vers Firestore"
 *  - Le bouton déconnexion
 */

import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { migrateAdminMovementsToFirestore, migratePhysicalInventoriesToFirestore } from "../lib/firestoreSync";
import * as store from "../lib/store";

export default function FirebaseAuthPanel({ showNotif }) {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [migrationResult, setMigrationResult] = useState(null);

  const [migratingInv, setMigratingInv] = useState(false);
  const [progressInv, setProgressInv] = useState({ done: 0, total: 0 });
  const [migrationResultInv, setMigrationResultInv] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setEmail("");
      setPassword("");
      if (showNotif) showNotif("✅ Connecté à Firestore", "success");
    } catch (err) {
      setLoginError(
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/wrong-password" ||
        err?.code === "auth/user-not-found"
          ? "Email ou mot de passe incorrect"
          : err?.message || "Erreur de connexion"
      );
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    if (showNotif) showNotif("Déconnecté de Firestore", "info");
  };

  const countAdminMovements = () => {
    return (store.getMovements() || []).filter((m) => m && m.id && !m.saisiepar).length;
  };

  const handleMigrate = async () => {
    const movements = store.getMovements();
    const adminCount = (movements || []).filter((m) => m && m.id && !m.saisiepar).length;
    if (adminCount === 0) {
      if (showNotif) showNotif("Aucun mouvement admin à migrer", "info");
      return;
    }
    if (
      !window.confirm(
        `Migrer ${adminCount} mouvement(s) admin vers Firestore ?\n\n` +
          `Cela rendra ces mouvements visibles dans l'app magasinier (AGB1/AGB2/AGB3).\n\n` +
          `Cette opération est idempotente — tu peux la relancer sans risque.`
      )
    )
      return;

    setMigrating(true);
    setMigrationResult(null);
    setProgress({ done: 0, total: adminCount });

    try {
      const result = await migrateAdminMovementsToFirestore(
        movements,
        (done, total) => setProgress({ done, total })
      );
      setMigrationResult(result);
      if (result.failed === 0) {
        if (showNotif) showNotif(`✅ Migration réussie : ${result.success} mouvements`, "success");
      } else {
        if (showNotif)
          showNotif(
            `⚠️ Migration partielle : ${result.success} OK, ${result.failed} échoués`,
            "error"
          );
      }
    } catch (err) {
      setMigrationResult({ success: 0, failed: 0, errors: [{ error: err.message }] });
      if (showNotif) showNotif("❌ Migration échouée : " + err.message, "error");
    }
    setMigrating(false);
  };

  const countInventories = () => (store.getPhysicalInventories() || []).length;

  const handleMigrateInventories = async () => {
    const inventories = store.getPhysicalInventories();
    const total = (inventories || []).length;
    if (total === 0) {
      if (showNotif) showNotif("Aucun inventaire physique à migrer", "info");
      return;
    }
    if (
      !window.confirm(
        `Migrer ${total} inventaire(s) physique(s) vers Firestore ?\n\n` +
          `Cela rendra ces inventaires (et le stock qui en découle) visibles dans l'app magasinier (AGB1/AGB2/AGB3).\n\n` +
          `Cette opération est idempotente — tu peux la relancer sans risque.`
      )
    )
      return;

    setMigratingInv(true);
    setMigrationResultInv(null);
    setProgressInv({ done: 0, total });

    try {
      const result = await migratePhysicalInventoriesToFirestore(
        inventories,
        (done, tot) => setProgressInv({ done, total: tot })
      );
      setMigrationResultInv(result);
      if (result.failed === 0) {
        if (showNotif) showNotif(`✅ Migration réussie : ${result.success} inventaire(s)`, "success");
      } else {
        if (showNotif)
          showNotif(
            `⚠️ Migration partielle : ${result.success} OK, ${result.failed} échoués`,
            "error"
          );
      }
    } catch (err) {
      setMigrationResultInv({ success: 0, failed: 0, errors: [{ error: err.message }] });
      if (showNotif) showNotif("❌ Migration échouée : " + err.message, "error");
    }
    setMigratingInv(false);
  };

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
        background: "white",
        marginTop: 20,
      }}
    >
      <h3 style={{ margin: 0, marginBottom: 12, fontSize: 16, fontWeight: 700 }}>
        🔥 Synchronisation Firestore (magasinier)
      </h3>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 0, marginBottom: 16 }}>
        Connecte le Manager à Firestore pour que tes saisies admin soient visibles
        dans l'app magasinier en temps réel.
      </p>

      {user ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderRadius: 8,
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13 }}>
              <strong style={{ color: "#065f46" }}>✅ Connecté</strong> en tant que{" "}
              <code
                style={{
                  background: "#d1fae5",
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                {user.email}
              </code>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                background: "white",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Déconnexion
            </button>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 8,
              background: "#fffbeb",
              border: "1px solid #fcd34d",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#92400e" }}>
              📤 Migration des mouvements admin existants
            </div>
            <div style={{ fontSize: 12, color: "#78350f", marginBottom: 12 }}>
              <strong>{countAdminMovements()}</strong> mouvement(s) admin (saisis manuellement
              dans le Manager) ne sont pas encore dans Firestore. Clique pour les pousser.
            </div>

            {migrating && (
              <div
                style={{
                  fontSize: 12,
                  color: "#78350f",
                  marginBottom: 8,
                  fontFamily: "monospace",
                }}
              >
                ⏳ Migration en cours : {progress.done}/{progress.total} (
                {progress.total > 0
                  ? Math.round((progress.done / progress.total) * 100)
                  : 0}
                %)
                <div
                  style={{
                    height: 6,
                    background: "#fde68a",
                    borderRadius: 3,
                    marginTop: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${
                        progress.total > 0
                          ? (progress.done / progress.total) * 100
                          : 0
                      }%`,
                      background: "#f59e0b",
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              </div>
            )}

            {migrationResult && !migrating && (
              <div
                style={{
                  fontSize: 12,
                  color: "#065f46",
                  marginBottom: 12,
                  padding: 8,
                  borderRadius: 6,
                  background: migrationResult.failed === 0 ? "#d1fae5" : "#fee2e2",
                }}
              >
                {migrationResult.failed === 0
                  ? `✅ ${migrationResult.success} mouvement(s) migrés avec succès.`
                  : `⚠️ ${migrationResult.success} OK, ${migrationResult.failed} échoués.`}
              </div>
            )}

            <button
              onClick={handleMigrate}
              disabled={migrating || countAdminMovements() === 0}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                background:
                  migrating || countAdminMovements() === 0 ? "#d1d5db" : "#f59e0b",
                color: "white",
                fontWeight: 600,
                fontSize: 13,
                cursor:
                  migrating || countAdminMovements() === 0 ? "not-allowed" : "pointer",
              }}
            >
              {migrating
                ? "Migration en cours..."
                : `📤 Migrer ${countAdminMovements()} mouvements vers Firestore`}
            </button>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 8,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#991b1b" }}>
              📦 Migration des inventaires physiques
            </div>
            <div style={{ fontSize: 12, color: "#7f1d1d", marginBottom: 12 }}>
              <strong>{countInventories()}</strong> inventaire(s) physique(s) au total. Avant le
              correctif du {new Date().toLocaleDateString('fr-FR')}, les inventaires n'étaient JAMAIS
              synchronisés vers Firestore — le magasinier ne voyait donc pas le stock corrigé.
              Clique pour les pousser tous (idempotent, sans risque).
            </div>

            {migratingInv && (
              <div style={{ fontSize: 12, color: "#7f1d1d", marginBottom: 8, fontFamily: "monospace" }}>
                ⏳ Migration en cours : {progressInv.done}/{progressInv.total} (
                {progressInv.total > 0 ? Math.round((progressInv.done / progressInv.total) * 100) : 0}%)
                <div style={{ height: 6, background: "#fecaca", borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progressInv.total > 0 ? (progressInv.done / progressInv.total) * 100 : 0}%`, background: "#dc2626", transition: "width 0.3s" }} />
                </div>
              </div>
            )}

            {migrationResultInv && !migratingInv && (
              <div
                style={{
                  fontSize: 12,
                  color: "#065f46",
                  marginBottom: 12,
                  padding: 8,
                  borderRadius: 6,
                  background: migrationResultInv.failed === 0 ? "#d1fae5" : "#fee2e2",
                }}
              >
                {migrationResultInv.failed === 0
                  ? `✅ ${migrationResultInv.success} inventaire(s) migré(s) avec succès.`
                  : `⚠️ ${migrationResultInv.success} OK, ${migrationResultInv.failed} échoués.`}
              </div>
            )}

            <button
              onClick={handleMigrateInventories}
              disabled={migratingInv || countInventories() === 0}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                background: migratingInv || countInventories() === 0 ? "#d1d5db" : "#dc2626",
                color: "white",
                fontWeight: 600,
                fontSize: 13,
                cursor: migratingInv || countInventories() === 0 ? "not-allowed" : "pointer",
              }}
            >
              {migratingInv
                ? "Migration en cours..."
                : `📤 Migrer ${countInventories()} inventaires vers Firestore`}
            </button>
          </div>

          <div
            style={{
              padding: 10,
              borderRadius: 6,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              fontSize: 12,
              color: "#1e40af",
            }}
          >
            💡 <strong>Dual-write activé</strong> — tes prochaines saisies (mouvements + inventaires
            physiques : ajout/édition/suppression) iront dans Firestore + GitHub automatiquement.
          </div>
        </>
      ) : (
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#6b7280",
                display: "block",
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Email admin
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@agroberry.ma"
              required
              autoComplete="email"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#6b7280",
                display: "block",
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          {loginError && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                background: "#fee2e2",
                color: "#991b1b",
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={loginLoading}
            style={{
              width: "100%",
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: loginLoading ? "#9ca3af" : "#10b981",
              color: "white",
              fontWeight: 600,
              fontSize: 14,
              cursor: loginLoading ? "not-allowed" : "pointer",
            }}
          >
            {loginLoading ? "Connexion..." : "🔓 Se connecter à Firestore"}
          </button>
        </form>
      )}
    </div>
  );
}
