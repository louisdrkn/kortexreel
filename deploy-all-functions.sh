#!/bin/bash

# Script de déploiement complet via Supabase CLI
# Ce script déploie toutes les fonctions radar en une seule commande

PROJECT_REF="ocblkbykswegxpdvonof"

echo "🚀 Déploiement de toutes les fonctions radar vers Supabase..."
echo "📦 Projet: $PROJECT_REF"
echo ""

# Liste des fonctions à déployer
FUNCTIONS=(
  "strategize-radar"
  "recalibrate-radar"
  "execute-radar"
  "reset-radar"
  "analyze-website"
  "discover-companies"
  "firecrawl-scrape"
  "process-document"
  "process-document-insights"
)

# Déployer chaque fonction
for FUNC in "${FUNCTIONS[@]}"; do
  echo "📤 Déploiement de $FUNC..."
  supabase functions deploy "$FUNC" --project-ref "$PROJECT_REF" --no-verify-jwt
  
  if [ $? -eq 0 ]; then
    echo "✅ $FUNC déployé avec succès!"
  else
    echo "❌ Échec du déploiement de $FUNC"
  fi
  echo ""
done

echo "🎉 Déploiement terminé!"
echo ""
echo "🔍 Vérification des fonctions déployées:"
supabase functions list --project-ref "$PROJECT_REF"
