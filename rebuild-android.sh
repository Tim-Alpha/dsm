#!/bin/bash

# Script to rebuild Android app after installing native modules
# This ensures react-native-zeroconf native module is properly linked

echo "🧹 Cleaning Android build..."
cd android
./gradlew clean
cd ..

echo "📦 Rebuilding Android app..."
echo "This may take a few minutes..."

# Run the android build
npm run android

echo "✅ Rebuild complete!"
echo "If you still see errors, try:"
echo "1. Close Android Studio completely"
echo "2. Delete android/.gradle folder"
echo "3. Delete android/app/build folder"
echo "4. Run this script again"

