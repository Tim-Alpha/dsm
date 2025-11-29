#!/bin/bash

# Script to build a release APK for Android

echo "🔨 Building Release APK..."

cd android

# Clean previous builds
echo "🧹 Cleaning previous builds..."
./gradlew clean

# Build release APK
echo "📦 Building release APK (this may take a few minutes)..."
./gradlew assembleRelease

# Check if APK was created
APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo ""
    echo "✅ Release APK built successfully!"
    echo "📱 Location: android/$APK_PATH"
    echo "📊 Size: $APK_SIZE"
    echo ""
    echo "To install on a connected device:"
    echo "  adb install -r android/$APK_PATH"
else
    echo "❌ Failed to build APK. Check the errors above."
    exit 1
fi

cd ..


