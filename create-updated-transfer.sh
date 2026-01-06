#!/bin/bash
echo "📦 Creating updated transfer package with bug fixes..."

# Create ZIP excluding unnecessary files
zip -r ../mern-masterpiece-updated-$(date +%Y%m%d-%H%M%S).zip . \
  -x "*.git*" \
  -x "*node_modules*" \
  -x "*dist*" \
  -x "*server/uploads*" \
  -x "*.DS_Store" \
  -x "*bun.lockb" \
  -x "*package-lock.json" \
  -x "*server/package-lock.json"

echo ""
echo "✅ Updated package created!"
echo "📁 Location: ~/Downloads/mern-masterpiece-updated-*.zip"
echo ""
echo "Next steps:"
echo "1. Transfer ZIP to MacBook (AirDrop/USB/Cloud)"
echo "2. Extract on MacBook"
echo "3. Run: cd server && npm install && cd .. && npm install"
