# Configuration Google Custom Search API

## 🔑 Clés API Configurées

### 1. Google Custom Search API Key

- **Clé**: `AIzaSyAApXmqaDiSUUqMHe0QSrL5O6Qk6F6GHI8`
- **Usage**: Recherche d'entreprises via Google
- **Localisation**: `supabase/functions/_shared/api-clients.ts`

### 2. Google Search Engine ID (CSE ID)

- **ID par défaut**: `017576662512468239146:omuauf_lfve`
- **Configuration**: Variable d'environnement `GOOGLE_SEARCH_ENGINE_ID`

---

## 📋 Configuration Supabase

Pour que l'API fonctionne en production, ajoutez ces variables d'environnement
dans Supabase :

```bash
# Dans Supabase Dashboard > Project Settings > Edge Functions > Secrets
GOOGLE_SEARCH_API_KEY=AIzaSyAApXmqaDiSUUqMHe0QSrL5O6Qk6F6GHI8
GOOGLE_SEARCH_ENGINE_ID=017576662512468239146:omuauf_lfve
```

---

## 🛠️ Créer votre propre Custom Search Engine

Si vous voulez personnaliser le moteur de recherche :

### Étape 1 : Créer un CSE

1. Allez sur
   [Google Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Cliquez sur **"Add"** ou **"Créer"**
3. Configurez :
   - **Sites à rechercher** : Laissez vide pour rechercher sur tout le web
   - **Langue** : Français
   - **Nom** : "Kortex B2B Discovery"

### Étape 2 : Récupérer le Search Engine ID

1. Une fois créé, cliquez sur **"Control Panel"**
2. Copiez le **"Search engine ID"** (format : `xxxxxxxxx:yyyyyyy`)
3. Remplacez la valeur dans votre fichier `.env` ou Supabase

### Étape 3 : Activer l'API

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Activez **"Custom Search API"**
3. Créez une clé API si nécessaire

---

## 🧪 Test Local

Pour tester localement :

```bash
# Dans votre fichier .env local
GOOGLE_SEARCH_API_KEY=AIzaSyAApXmqaDiSUUqMHe0QSrL5O6Qk6F6GHI8
GOOGLE_SEARCH_ENGINE_ID=017576662512468239146:omuauf_lfve
```

---

## 📊 Limites de l'API

- **Gratuit** : 100 requêtes/jour
- **Payant** : $5 pour 1000 requêtes supplémentaires
- **Max par requête** : 10 résultats

---

## 🔄 Architecture Kortex

```
Client Documents + Context
        ↓
   Gemini 3.0 Pro (Analyse + ICP)
        ↓
   Google Custom Search (Découverte)
        ↓
   Firecrawl (Scraping)
        ↓
   Gemini 3.0 Pro (Validation + Scoring)
        ↓
   Entreprises Qualifiées
```
