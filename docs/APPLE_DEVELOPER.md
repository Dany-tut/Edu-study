# Apple Developer

## Искра в App Store Connect

- Приложение: **Искра — уроки и задания**.
- [TestFlight · iOS](https://appstoreconnect.apple.com/teams/b8a9a9eb-11ae-4f4c-90ad-2223f2e42cb4/apps/6829159015/testflight/ios)
- App Store Connect ID: `6829159015`.
- Bundle ID: `com.dany.iskra`.
- SKU: `iskra-ios`.
- Apple Developer Team ID для подписи: `T9LW5YL65T` (Daniil Makarenko).
- App Store Connect provider/team UUID: `b8a9a9eb-11ae-4f4c-90ad-2223f2e42cb4` — это не Xcode DEVELOPMENT_TEAM.

## Разделение проектов

`6829079558` / `dev.dany.taskly` — отдельное приложение Taskly. Предыдущая версия этой инструкции ошибочно называла его записью Искры. Не загружать туда сборки Искры.

`com.iskra.app` не удалось зарегистрировать в этой команде: Apple сообщает, что идентификатор недоступен. Для релиза Искры зарегистрирован `com.dany.iskra`; Capacitor и Xcode используют одинаковый ID. Установка с новым ID будет отдельным приложением относительно прежних локальных dev-сборок.

## Сборка

Первая TestFlight-сборка: iOS `1.0 (1291)`, веб-ресурсы `1.0.1291` из коммита `58d87e399b907316d13b072ab250afb5a0a4c8bc` (Мой день преподавателя). Релизный архив собирается из изолированного checkout; незакоммиченные изменения других задач не включаются.

Для распространения использовать стабильный Xcode: `DEVELOPER_DIR=/Applications/Xcode-27.1.app/Contents/Developer`. Xcode-beta 27.0 beta 3 собирает приложение для симулятора, но Apple отклоняет загрузку с ошибкой Unsupported SDK or Xcode version.

В `xcodebuild -exportArchive` использовать `method=app-store-connect`, `destination=upload`, `teamID=T9LW5YL65T`, `signingStyle=automatic`, `manageAppVersionAndBuildNumber=false`, `uploadSymbols=true` и `-allowProvisioningUpdates`. Номер CURRENT_PROJECT_VERSION повышать при каждом новом загружаемом релизе. Сертификаты и токены в репозитории не хранятся.

Внутренняя группа: «Искра · личная проверка» (ручное добавление сборок), тестировщик — владелец команды. Публикация в App Store и внешний beta-review не требуются для личной внутренней проверки.
