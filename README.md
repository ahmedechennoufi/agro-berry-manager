# 🫐 Agro Berry Manager

Application de gestion de stock et coûts de production agricole.

## 🚀 Déploiement sur GitHub Pages

### Étape 1: Créer le repository sur GitHub

1. Va sur [github.com](https://github.com)
2. Clique sur **New repository**
3. Nom: `agro-berry-manager`
4. Laisse **Public** sélectionné
5. Ne coche **rien** d'autre (pas de README, pas de .gitignore)
6. Clique sur **Create repository**

### Étape 2: Télécharger et préparer le projet

1. Télécharge le dossier `agro-berry-web` sur ton ordinateur
2. Ouvre un terminal dans ce dossier
3. Exécute les commandes suivantes:

```bash
# Installer les dépendances
npm install

# Tester en local
npm run dev
```

4. Ouvre http://localhost:5173 pour vérifier que ça fonctionne

### Étape 3: Déployer sur GitHub

```bash
# Initialiser Git
git init

# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "Initial commit"

# Ajouter le remote (remplace TON_USERNAME par ton nom GitHub)
git remote add origin https://github.com/TON_USERNAME/agro-berry-manager.git

# Envoyer sur GitHub
git push -u origin main

# Build et déployer sur GitHub Pages
npm run build
npm run deploy
```

### Étape 4: Activer GitHub Pages

1. Va sur ton repository GitHub
2. Clique sur **Settings** → **Pages**
3. Source: **Deploy from a branch**
4. Branch: `gh-pages` / `(root)`
5. Clique **Save**
6. Attends 2-3 minutes

### ✅ C'est prêt !

Ton application est maintenant accessible à:
```
https://TON_USERNAME.github.io/agro-berry-manager/
```

---

## 📱 Fonctionnalités

- 📦 **Stock Global** - Gestion du stock au magasin
- 🚚 **Mouvements** - Entrées, sorties, transferts
- 🌱 **Fermes** - Stock par ferme (AGB1, AGB2, AGB3)
- 🔄 **Transferts** - Entre fermes
- 🔥 **Consommation** - Saisie par culture et destination
- 💰 **Coûts Production** - Analyse des coûts
- 📈 **Historique** - Inventaire par mois
- 📊 **Comparaison** - Entre deux périodes
- ⚙️ **Import/Export** - Sauvegarde des données

## 💾 Stockage

Les données sont stockées dans le **LocalStorage** du navigateur.
- ✅ Gratuit
- ✅ Fonctionne hors ligne
- ⚠️ Pensez à exporter régulièrement (Paramètres → Exporter)

## 🔧 Développement

```bash
# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Build pour production
npm run build

# Déployer sur GitHub Pages
npm run deploy
```

## 📄 Licence

MIT - Libre d'utilisation
