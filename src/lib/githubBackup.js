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
 * Sauvegarder les données sur GitHub
 */
export const backupToGitHub = async (data) => {
  const config = getGitHubConfig();
  if (!config.token || !config.owner || !config.repo) {
    throw new Error('GitHub non configuré');
  }

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${BACKUP_PATH}`;

  // Vérifier si le fichier existe déjà (pour avoir le SHA)
  let sha = null;
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
    }
  } catch (e) {
    // Fichier n'existe pas encore, c'est OK
  }

  // Créer ou mettre à jour le fichier
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
 * Appelé à chaque modification de données
 */
export const scheduleAutoBackup = (exportAllDataFn, onSuccess, onError) => {
  if (!isGitHubConfigured() || !autoBackupEnabled) return;

  // Reset le timer à chaque changement
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
