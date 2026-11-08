# Android-приложение Искры

Та же оболочка Capacitor, что и у iOS (`appId com.dany.iskra`), папка `android/`.

Android — одна из четырёх версий Искры; её интерфейсные отличия (без iOS-стекла и
мягкого края, фейды SCROLL-01, системная «Назад») — в [platforms.md](platforms.md).

## Сборка

APK раздаёт только чат «TF сборки и APK на устройства»; `versionCode` = номер сборки,
базовый QA перед выдачей — [builds.md](builds.md).

```bash
npm run build && npx cap sync android
cd android && JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew assembleDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`.
`android/local.properties` (не в git): `sdk.dir=/opt/homebrew/share/android-commandlinetools`.

Эмулятор: `$SDK/emulator/emulator -avd onix_test`, установка — `adb install -r <apk>`.

## Что перенесено с iOS

- **NativeSpeech** (`NativeSpeechPlugin.java`) — системный TextToSpeech, тот же
  договор, что у Swift-плагина: `speak` → `{done}`, события `speechStart` и
  `speechWord` (позиция в UTF-16). Регистрируется в `MainActivity`.
- **Возврат после входа через Google/Apple** — intent-filter `iskra://auth` в
  манифесте; на Android вход идёт через `Browser` (плагина GoogleAuth нет).
- **NativeGlass** — только iOS (`GLASS` в `src/lib/nativeGlass.ts` проверяет платформу).
- Иконки и заставка собраны из `ios/App/App/Assets.xcassets/AppIcon.appiconset`.

## Не сделано

- Подписанная release-сборка (keystore) и публикация в Google Play.
- Блокировка приложения кодом/отпечатком на Android не переносилась.
