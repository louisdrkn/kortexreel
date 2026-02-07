#!/bin/bash

# Supabase Edge Function Deployment Script
# This script deploys the strategize-radar function using the Supabase Management API

PROJECT_REF="ocblkbykswegxpdvonof"
FUNCTION_NAME=${1:-"strategize-radar"}
ACCESS_TOKEN="sbp_ece26a3ca26e794a26ba27399956bcd49aa268cd"

echo "🚀 Deploying $FUNCTION_NAME to Supabase project $PROJECT_REF..."

# Create a temporary directory for bundling
TEMP_DIR=$(mktemp -d)
echo "📦 Creating bundle in $TEMP_DIR..."

# Copy function files
cp -r supabase/functions/$FUNCTION_NAME/* "$TEMP_DIR/"
cp -r supabase/functions/_shared "$TEMP_DIR/"

# Create deployment payload
cd "$TEMP_DIR"

# Bundle the function (create a tar.gz)
tar -czf function.tar.gz *

echo "📤 Uploading to Supabase..."

# First, check if function exists
FUNCTION_EXISTS=$(curl -s \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/functions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  | grep -q "\"slug\":\"$FUNCTION_NAME\"" && echo "yes" || echo "no")

if [ "$FUNCTION_EXISTS" = "yes" ]; then
  echo "📝 Function exists, updating..."
  # Update existing function
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PATCH \
    "https://api.supabase.com/v1/projects/$PROJECT_REF/functions/$FUNCTION_NAME" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"verify_jwt\": false,
      \"import_map\": false
    }")
else
  echo "🆕 Creating new function..."
  # Create new function
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    "https://api.supabase.com/v1/projects/$PROJECT_REF/functions" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"slug\": \"$FUNCTION_NAME\",
      \"name\": \"$FUNCTION_NAME\",
      \"verify_jwt\": false,
      \"import_map\": false
    }")
fi

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
  echo "✅ Function metadata updated!"
  
  # Now deploy the code using CLI (which should work after function is created)
  echo "📦 Deploying function code..."
  cd /Users/lb/Downloads/kortexias-main\ 5
  SUPABASE_ACCESS_TOKEN="$ACCESS_TOKEN" supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF --no-verify-jwt
  
else
  echo "❌ Deployment failed with status $HTTP_STATUS"
  echo "$RESPONSE" | grep -v "HTTP_STATUS"
fi

# Cleanup
cd -
rm -rf "$TEMP_DIR"

echo "🧹 Cleanup complete"
