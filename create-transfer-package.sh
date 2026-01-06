#!/bin/bash
echo "📦 Creating transfer package..."

# Create ZIP excluding unnecessary files
zip -r ../mern-masterpiece-transfer.zip . \
  -x "*.git*" \
  -x "*node_modules*" \
  -x "*dist*" \
  -x "*server/uploads*" \
  -x "*.DS_Store" \
  -x "*bun.lockb" \
  -x "*package-lock.json"

echo "✅ Package created: ../mern-masterpiece-transfer.zip"
echo "📁 Size: $(du -h ../mern-masterpiece-transfer.zip | cut -f1)"
echo ""
echo "Next steps:"
echo "1. Transfer the ZIP file to your MacBook"
echo "2. Extract it"
echo "3. Run: cd server && npm install && cd .. && npm install"
