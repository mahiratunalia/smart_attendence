#!/bin/bash
# Script to replace Supabase imports with API imports

# Find all files with Supabase imports
files=$(find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec grep -l "from '@/integrations/supabase" {} \;)

for file in $files; do
  echo "Updating $file..."
  # Replace import statement
  sed -i '' "s|import { supabase } from '@/integrations/supabase/client';|import { api } from '@/lib/api';|g" "$file"
done

echo "Done! Please review the changes and update the actual API calls manually."

