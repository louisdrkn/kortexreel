# 🧪 Guide de Test Rapide - Discover Companies

## ✅ Déploiement Confirmé

- Function: `discover-companies`
- Status: **Deployed successfully**
- Dashboard:
  https://supabase.com/dashboard/project/ocblkbykswegxpdvonof/functions

---

## 🎯 Test Rapide (5 minutes)

### 1. Prérequis

Assurez-vous que votre **Cerveau Agence** contient :

- ✅ **Pitch** : Votre proposition de valeur
- ✅ **Cible** : Description de votre client idéal

**Comment vérifier :**

1. Ouvrez l'application
2. Allez dans "Cerveau Agence" ou "Agency Brain"
3. Vérifiez que les champs sont remplis

---

### 2. Test du Scan Marché

#### Premier Scan (Fresh Search)

1. **Action** : Cliquez sur "Scan Market" / "Radar Marché"
2. **Attendu** :
   - ⏱️ Temps : 10-30 secondes
   - 📊 Barre de progression visible
   - 📝 Console logs (F12) :
     ```
     [DISCOVER] Fetching project context...
     [DISCOVER] ✅ Project context loaded
     [COMMANDANT] Generated 4 search missions
     [SWARM] Found X URLs
     [ANALYST] Validated Y qualified prospects
     ```
   - 🎯 Résultat : Liste d'entreprises avec scores

#### Deuxième Scan (Cache Test)

1. **Action** : Cliquez à nouveau sur "Scan Market" **immédiatement**
2. **Attendu** :
   - ⚡ Temps : **< 1 seconde** (quasi-instantané)
   - 📝 Console log :
     ```
     🚀 CACHE HIT: Prospects found in database!
     ```
   - 🎯 Résultat : **Mêmes entreprises** qu'avant

---

### 3. Test d'Erreur (Optionnel)

#### Vérifier la Validation

1. **Action** : Videz temporairement le Pitch dans Cerveau Agence
2. **Action** : Cliquez sur "Scan Market"
3. **Attendu** :
   - ❌ Toast d'erreur : "Missing Agency Pitch"
   - 📝 Pas de crash, message clair

---

## 🐛 Console de Debug (F12)

### Ouvrir les DevTools

- **Chrome/Edge** : F12 ou Cmd+Option+I (Mac)
- **Firefox** : F12 ou Cmd+Option+K (Mac)
- Onglet **Console**

### Logs à Surveiller

#### ✅ Succès

```
[DISCOVER] Fetching project context for <projectId>...
[DISCOVER] ✅ Project context loaded: { pitch: "...", target: "..." }
[DISCOVER] Checking cache with signature: ...
[DISCOVER] Cache miss - proceeding with fresh search...
[COMMANDANT] Generated 4 search missions: [...]
[SWARM] Searching: "..."
[SWARM] Found 10 URLs, filtered to 5 unique company sites
[SWARM] Scraping 5 sites...
[SWARM] Successfully scraped 4/5 sites
[ANALYST] Evaluating 4 prospects...
[ANALYST] Validated 3 qualified prospects
[DISCOVER] Saving results to cache...
[DISCOVER] ✅ Cache updated successfully
```

#### 🚀 Cache Hit

```
[DISCOVER] Fetching project context for <projectId>...
[DISCOVER] ✅ Project context loaded
[DISCOVER] Checking cache with signature: ...
🚀 CACHE HIT: Prospects found in database!
```

#### ❌ Erreur

```
[DISCOVER-COMPANIES] Fatal Error: Missing Agency Pitch
```

---

## 📊 Vérification dans Supabase Dashboard

### Voir les Logs Edge Function

1. Allez sur :
   https://supabase.com/dashboard/project/ocblkbykswegxpdvonof/functions
2. Cliquez sur `discover-companies`
3. Onglet **Logs** ou **Invocations**
4. Vérifiez les derniers appels

### Vérifier le Cache

1. Allez sur :
   https://supabase.com/dashboard/project/ocblkbykswegxpdvonof/editor
2. Table : `kortex_prospects`
3. Vérifiez que des lignes sont ajoutées après le premier scan

---

## 🔧 Debug Checklist

Si ça ne fonctionne pas :

### ✅ Vérifier les Variables d'Environnement

Dans Supabase Dashboard > Settings > Edge Functions > Secrets :

- `GOOGLE_API_KEY` (pour Gemini)
- `FIRECRAWL_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### ✅ Vérifier la Structure de Données

Dans Supabase Dashboard > Table Editor :

- Table `project_data` contient :
  - `data_type = 'agency_dna'` avec `data.pitch` rempli
  - `data_type = 'target_definition'` avec `data.targetDescription` rempli

### ✅ Vérifier le Frontend

Dans `useRadar.ts`, la fonction `scanMarket` envoie :

```typescript
{
  projectId: currentProject.id,
  force_refresh: options?.forceRefresh,
  strategy: options?.strategy,
}
```

---

## 🎉 Résultat Attendu

Si tout fonctionne :

1. ✅ Premier scan : 10-30s, trouve des entreprises
2. ✅ Deuxième scan : < 1s, retourne les mêmes résultats
3. ✅ Pas d'erreur "Context Missing"
4. ✅ Pas d'erreur 404 sur Gemini
5. ✅ Logs détaillés dans la console
6. ✅ Entreprises affichées avec scores et détails

---

## 📞 Support

Si problèmes persistent :

1. Copiez les logs de la console (F12)
2. Vérifiez les logs Supabase Edge Function
3. Vérifiez que `project_data` est bien rempli

**Tout est prêt ! Testez maintenant le Radar Marché.** 🚀
