#!/bin/bash
# Auto-deploy all projects to Vercel
# Run: npm run deploy-all

echo "🚀 Deploying all projects to Vercel..."

# List of projects to deploy
projects=(
    "portfolio"
    "resume-adjuster"
    "SIH_26"
    "dashboard"
    "interview-prep"
    "apex-intelligence-platform"
    "voltix-home"
    "scarpper"
    "apex_intt"
    "ai-website-cloner"
    "instant-scraper"
    "restro_web"
    "server"
    "face-deepfake"
    "aanya-voice-agent"
)

cd "$(dirname "$0")"

for proj in "${projects[@]}"; do
    echo ""
    echo "=========================================="
    echo "Deploying: $proj"
    echo "=========================================="
    
    if [ -d "$proj" ]; then
        cd "$proj"
        npx vercel@latest deploy --prod --token="$VERCEL_TOKEN" || echo "⚠️  Failed: $proj"
        cd ..
    else
        echo "⚠️  Directory not found: $proj"
    fi
done

echo ""
echo "=========================================="
echo "✅ All deployments complete!"
echo "Check https://vercel.com/dashboard for status"
echo "=========================================="
