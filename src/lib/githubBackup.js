/**
 * GitHub Backup Module - GitHub comme source de vérité
 */

const GITHUB_CONFIG_KEY = 'agro_github_config';
const BACKUP_PATH = 'backups/agro-berry-data.json';

// === CONFIG ===
export const getGitHubConfig = () => {
  try { return JSON.parse(localStorage.getItem(GITHUB_CONFIG_KEY) || '{}'); }
  catch { return {}; }
};
export const saveGitHubConfig = (config) => localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
export const clearGitHubConfig = () => localStorage.removeItem(GITHUB_CONFIG_KEY);
export const isGitHubConfigured = () => {
  const c = getGitHubConfig();
  return !!(c.token && c.owner && c.repo);
};

// === FETCH RAW (sans auth pour lecture publique) ===
const getFileInfo = async (config) => {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${BACKUP_PATH}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `token ${config.token}`, 'Accept': 'application/vnd.github.v3+json' }
  });
  if (!res.ok) throw new Error(`GitHub erreur ${res.status}`);
  const file = await res.json();
  const data = JSON.parse(decodeURIComponent(escape(atob(file.content.replace(/\n/g, '')))));
  return { data, sha: file.sha };
};

// === SAUVEGARDE IMMÉDIATE (avec retry automatique en cas de conflit) ===
export const backupToGitHub = async (data, retryCount = 0) => {
  const MAX_RETRIES = 4;
  const config = getGitHubConfig();
  if (!config.token || !config.owner || !config.repo) throw new Error('GitHub non configuré');

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${BACKUP_PATH}`;

  // Récupérer SHA + mouvements existants des magasiniers
  let sha = null;
  let magasinierMovements = [];
  let existingMelangesConfig = data.melangesConfig || {};
  try {
    const { data: existing, sha: existingSha } = await getFileInfo(config);
    sha = existingSha;
    const adminIds = new Set((data.movements || []).map(m => m.id));
    const deletedIds = new Set((data.deletedMovementIds || []));
    // Garder les mouvements magasiniers sauf ceux supprimés par l'admin
    magasinierMovements = (existing.movements || []).filter(m =>
      m.id && !adminIds.has(m.id) && !deletedIds.has(m.id)
    );
    // Préserver melangesConfig depuis GitHub (priorité au fichier GitHub)
    if (existing.melangesConfig && Object.keys(existing.melangesConfig).length > 0) {
      existingMelangesConfig = existing.melangesConfig;
    }
  } catch (e) { /* fichier n'existe pas encore */ }

  // Merger mouvements admin + magasiniers
  const mergedData = {
    ...data,
    movements: [...(data.movements || []), ...magasinierMovements],
    melangesConfig: existingMelangesConfig
  };

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(mergedData, null, 2))));
  const body = {
    message: `💾 Sauvegarde ${new Date().toLocaleString('fr-FR')}`,
    content,
    branch: 'main'
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${config.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    // Retry automatique en cas de conflit 409 (SHA obsolète = le magasinier a push entre-temps)
    if (putRes.status === 409 && retryCount < MAX_RETRIES) {
      console.log(`🔄 Conflit GitHub, retry ${retryCount + 1}/${MAX_RETRIES}...`);
      // Attendre un peu pour laisser GitHub se stabiliser (backoff exponentiel)
      await new Promise(r => setTimeout(r, 300 * (retryCount + 1)));
      return backupToGitHub(data, retryCount + 1);
    }
    if (putRes.status === 409) throw new Error('Conflit GitHub persistant après plusieurs tentatives - réessayez manuellement');
    throw new Error(err.message || `Erreur GitHub (${putRes.status})`);
  }

  return { success: true, date: new Date().toISOString(), retries: retryCount };
};

// === RESTAURER DEPUIS GITHUB ===
export const restoreFromGitHub = async () => {
  const config = getGitHubConfig();
  if (!config.token || !config.owner || !config.repo) throw new Error('GitHub non configuré');
  const { data } = await getFileInfo(config);
  return data;
};

// === SYNC MOUVEMENTS MAGASINIERS ===
export const syncMovementsFromGitHub = async (getCurrentMovementsFn, addMovementFn) => {
  const config = getGitHubConfig();
  if (!config.token || !config.owner || !config.repo) return 0;
  try {
    const { data } = await getFileInfo(config);
    const backupMovements = data.movements || [];
    const localIds = new Set(getCurrentMovementsFn().map(m => m.id));
    const newMovements = backupMovements.filter(m => m.id && !localIds.has(m.id));
    for (const mv of newMovements) {
      try { addMovementFn(mv); } catch (e) { console.warn('Erreur import:', e); }
    }
    if (newMovements.length > 0) console.log(`✅ ${newMovements.length} mouvement(s) importé(s)`);
    return newMovements.length;
  } catch (e) {
    console.warn('Sync échouée:', e.message);
    return 0;
  }
};

// === TEST CONNEXION ===
export const testGitHubConnection = async (token, owner, repo) => {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Token invalide');
    if (res.status === 404) throw new Error('Repository non trouvé');
    throw new Error(`Erreur (${res.status})`);
  }
  const d = await res.json();
  return { success: true, repoName: d.full_name, private: d.private };
};

// === AUTO-BACKUP (gardé pour compatibilité mais délai = 0) ===
export const scheduleAutoBackup = (exportAllDataFn, onSuccess, onError) => {
  if (!isGitHubConfigured()) return;
  // Immédiat
  (async () => {
    try {
      const data = exportAllDataFn();
      const result = await backupToGitHub(data);
      if (onSuccess) onSuccess(result);
    } catch (err) {
      if (onError) onError(err);
    }
  })();
};

export const cancelAutoBackup = () => {};

export const getAutoBackupStatus = () => {
  try { return JSON.parse(localStorage.getItem('agro_auto_backup_status') || '{}'); }
  catch { return {}; }
};

export const getLastBackupInfo = async () => {
  const config = getGitHubConfig();
  if (!config.token || !config.owner || !config.repo) return null;
  try {
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/commits?path=${BACKUP_PATH}&per_page=1`;
    const res = await fetch(url, {
      headers: { 'Authorization': `token ${config.token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!res.ok) return null;
    const commits = await res.json();
    if (!commits.length) return null;
    return { date: commits[0].commit.committer.date, message: commits[0].commit.message };
  } catch { return null; }
};
