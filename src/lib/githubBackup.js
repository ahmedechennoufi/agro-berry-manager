/**
 * GitHub Backup Module
 * Sauvegarde et restauration des données via l'API GitHub (100% gratuit)
 * Utilise un Personal Access Token pour écrire dans le repo
 */

const GITHUB_CONFIG_KEY = 'agro_github_config';
const BACKUP_PATH = 'backups/agro-berry-data.json';

// === CONFIG ===

export const getGitHubConfig = () => {
  try {
    return JSON.parse(localStorage.getItem(GITHUB_CONFIG_KEY) || '{}');
  } catch { return {}; }
};

export const saveGitHubConfig = (config) => {
  localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
};

export const clearGitHubConfig = () => {
  localStorage.removeItem(GITHUB_CONFIG_KEY);
};

export const isGitHubConfigured = () => {
  const config = getGitHubConfig();
  return !!(config.token && config.owner && config.repo);
};

// === API CALLS ===

/**
 * Sauvegarder les données sur GitHub (MERGE avec mouvements magasiniers)
 */
export const backupToGitHub = async (data) => {
  const config = getGitHubConfig();
  if (!config.token || !config.owner || !config.repo) {
    throw new Error('GitHub non configuré');
  }

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${BACKUP_PATH}`;

  // Récupérer le fichier existant (SHA + contenu)
  let sha = null;
  let existingMovements = [];
  try {
    const getRes = await fetch(url, {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
      // Décoder le contenu existant pour récupérer les mouvements magasiniers
      try {
        const existingData = JSON.parse(decodeURIComponent(escape(atob(existing.content.replace(/\n/g, '')))));
        existingMovements = existingData.movements || [];
      } catch (e) {
        existingMovements = [];
      }
    }
  } catch (e) {
    // Fichier n'existe pas encore
  }

  // MERGE : garder les mouvements du backup (magasiniers) + ceux de l'admin
  const adminMovementIds = new Set((data.movements || []).map(m => m.id));
  const magasinierMovements = existingMovements.filter(m => !adminMovementIds.has(m.id));
  const mergedData = {
    ...data,
    movements: [...(data.movements || []), ...magasinierMovements]
  };

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(mergedData, null, 2))));

  const body = {
    message: `📦 Backup ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}`,
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
    if (putRes.status === 401) throw new Error('Token invalide ou expiré');
    if (putRes.status === 404) throw new Error('Repository non trouvé');
    if (putRes.status === 409) throw new Error('Conflit - réessayez');
    throw new Error(err.message || `Erreur GitHub (${putRes.status})`);
  }

  const result = await putRes.json();
  return {
    success: true,
    url: result.content?.html_url,
    date: new Date().toISOString()
  };
};

/**
 * Restaurer les données depuis GitHub
 */
export const restoreFromGitHub = async () => {
  const config = getGitHubConfig();
  if (!config.token || !config.owner || !config.repo) {
    throw new Error('GitHub non configuré');
  }

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${BACKUP_PATH}`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `token ${config.token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error('Aucun backup trouvé sur GitHub');
    if (res.status === 401) throw new Error('Token invalide ou expiré');
    throw new Error(`Erreur GitHub (${res.status})`);
  }

  const file = await res.json();
  const content = decodeURIComponent(escape(atob(file.content)));
  const data = JSON.parse(content);
  return data;
};

/**
 * NOUVELLE FONCTION : Synchroniser les mouvements des magasiniers depuis GitHub
 * Importe uniquement les mouvements qui n'existent pas encore dans localStorage
 * Retourne le nombre de nouveaux mouvements importés
 */
export const syncMovementsFromGitHub = async (getCurrentMovementsFn, addMovementFn) => {
  const config = getGitHubConfig();
  if (!config.token || !config.owner || !config.repo) return 0;

  try {
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${BACKUP_PATH}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!res.ok) return 0;

    const file = await res.json();
    const backupData = JSON.parse(decodeURIComponent(escape(atob(file.content.replace(/\n/g, '')))));
    const backupMovements = backupData.movements || [];

    // IDs des mouvements déjà dans localStorage
    const localMovements = getCurrentMovementsFn();
    const localIds = new Set(localMovements.map(m => m.id));

    // Trouver les nouveaux mouvements (ajoutés par magasiniers)
    const newMovements = backupMovements.filter(m => m.id && !localIds.has(m.id));

    // Importer chaque nouveau mouvement
    let count = 0;
    for (const mv of newMovements) {
      try {
        addMovementFn(mv);
        count++;
      } catch (e) {
        console.warn('Erreur import mouvement:', e);
      }
    }

    if (count > 0) {
      console.log(`✅ ${count} nouveau(x) mouvement(s) importé(s) depuis magasiniers`);
    }

    return count;
  } catch (e) {
    console.warn('Sync GitHub échouée:', e.message);
    return 0;
  }
};

/**
 * Vérifier la connexion GitHub
 */
export const testGitHubConnection = async (token, owner, repo) => {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('Token invalide');
    if (res.status === 404) throw new Error('Repository non trouvé');
    throw new Error(`Erreur (${res.status})`);
  }

  const repoData = await res.json();
  return {
    success: true,
    repoName: repoData.full_name,
    private: repoData.private
  };
};

// === AUTO-BACKUP ===

let autoBackupTimer = null;
let autoBackupEnabled = true;

const AUTO_BACKUP_DELAY = 2 * 60 * 1000; // 2 minutes après dernier changement
const AUTO_BACKUP_STATUS_KEY = 'agro_auto_backup_status';

export const getAutoBackupStatus = () => {
  try {
    return JSON.parse(localStorage.getItem(AUTO_BACKUP_STATUS_KEY) || '{}');
  } catch { return {}; }
};

const setAutoBackupStatus = (status) => {
  localStorage.setItem(AUTO_BACKUP_STATUS_KEY, JSON.stringify({
    ...getAutoBackupStatus(),
    ...status,
    updatedAt: new Date().toISOString()
  }));
};

/**
 * Déclenche un auto-backup après un délai (debounce)
 */
export const scheduleAutoBackup = (exportAllDataFn, onSuccess, onError) => {
  if (!isGitHubConfigured() || !autoBackupEnabled) return;

  if (autoBackupTimer) clearTimeout(autoBackupTimer);
  setAutoBackupStatus({ pending: true });

  autoBackupTimer = setTimeout(async () => {
    try {
      setAutoBackupStatus({ pending: false, syncing: true });
      const data = exportAllDataFn();
      const result = await backupToGitHub(data);
      setAutoBackupStatus({
        pending: false,
        syncing: false,
        lastAutoBackup: result.date,
        error: null
      });
      if (onSuccess) onSuccess(result);
    } catch (err) {
      setAutoBackupStatus({
        pending: false,
        syncing: false,
        error: err.message
      });
      if (onError) onError(err);
    }
  }, AUTO_BACKUP_DELAY);
};

export const cancelAutoBackup = () => {
  if (autoBackupTimer) {
    clearTimeout(autoBackupTimer);
    autoBackupTimer = null;
  }
  setAutoBackupStatus({ pending: false, syncing: false });
};

/**
 * Obtenir les infos du dernier backup
 */
export const getLastBackupInfo = async () => {
  const config = getGitHubConfig();
  if (!config.token || !config.owner || !config.repo) return null;

  try {
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/commits?path=${BACKUP_PATH}&per_page=1`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!res.ok) return null;
    const commits = await res.json();
    if (commits.length === 0) return null;

    return {
      date: commits[0].commit.committer.date,
      message: commits[0].commit.message,
      url: commits[0].html_url
    };
  } catch {
    return null;
  }
};
