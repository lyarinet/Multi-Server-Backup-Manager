# Android Build Setup - Linux Server

## Problem
The Android SDK was not configured on the Linux server. The `local.properties` file had a macOS path, and the Android SDK Command-Line Tools were not installed.

## Solution Applied

### 1. Installed Android SDK Command-Line Tools
```bash
mkdir -p ~/Android/Sdk
cd ~/Android/Sdk
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools-linux-*_latest.zip
mkdir -p cmdline-tools/latest
mv cmdline-tools/* cmdline-tools/latest/
```

### 2. Accepted SDK Licenses
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
echo "y" | sdkmanager --licenses
```

### 3. Installed Required SDK Components
```bash
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

### 4. Updated local.properties
```bash
echo "sdk.dir=$HOME/Android/Sdk" > android/local.properties
```

## Build Command

To build the APK on this Linux server, run:

```bash
cd /var/www/html/backup/bk
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
npm run android:build-apk
```

Or use the npm script directly (it will use the local.properties file):

```bash
cd /var/www/html/backup/bk
npm run android:build-apk
```

## Important Notes

1. **No Android Studio GUI Needed**: On Linux servers, you don't need Android Studio GUI. The command-line tools are sufficient.

2. **Environment Variables**: The `ANDROID_HOME` and `PATH` variables need to be set, or the `local.properties` file will be used (which is already configured).

3. **APK Location**: After successful build, the APK will be at:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

4. **Permanent Setup**: To make the environment variables permanent, add to `~/.bashrc`:
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
   ```

## Troubleshooting

### Permission Errors
If you get permission errors:
```bash
sudo chown -R $USER:$USER /var/www/html/backup/bk/dist/
sudo chown -R $USER:$USER /var/www/html/backup/bk/android/
```

### SDK Not Found
If Gradle still can't find the SDK:
1. Check `android/local.properties` contains: `sdk.dir=/home/fida/Android/Sdk`
2. Verify SDK is installed: `ls -la $HOME/Android/Sdk/platforms/`
3. Re-run: `npm run android:build-apk`

### Java Issues
Make sure Java 17 is installed:
```bash
java -version  # Should show OpenJDK 17
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
```

