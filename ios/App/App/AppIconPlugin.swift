import Capacitor
import UIKit

// Выбор иконки приложения на главном экране телефона. Набор лежит в
// Assets.xcassets (AppIcon-Ogonek, AppIcon-Night…), имена перечислены в
// ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES — оттуда actool сам пишет
// CFBundleAlternateIcons в Info.plist. name = nil возвращает основную иконку.
// Система после смены показывает своё окошко «Иконка изменена» — убрать его
// публичным API нельзя.
@objc(AppIconPlugin)
public class AppIconPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppIconPlugin"
    public let jsName = "AppIcon"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
    ]

    @objc func get(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let app = UIApplication.shared
            call.resolve([
                "supported": app.supportsAlternateIcons,
                "name": app.alternateIconName ?? NSNull(),
            ])
        }
    }

    @objc func set(_ call: CAPPluginCall) {
        let name = call.getString("name")
        DispatchQueue.main.async {
            let app = UIApplication.shared
            guard app.supportsAlternateIcons else {
                call.reject("Смена иконки не поддерживается")
                return
            }
            if app.alternateIconName == name { call.resolve(); return }
            self.apply(name, call: call, attempt: 0)
        }
    }

    // iOS 26 отвечает NSPOSIXErrorDomain 35 («Resource temporarily
    // unavailable») через раз: в симуляторе 26.3 первая смена с этой ошибкой
    // применилась, вторая — нет. Ошибка временная: повторяем с паузой, а итог
    // проверяем по alternateIconName — он правдивее ответа.
    private func apply(_ name: String?, call: CAPPluginCall, attempt: Int) {
        let app = UIApplication.shared
        app.setAlternateIconName(name) { error in
            DispatchQueue.main.async {
                if app.alternateIconName == name { call.resolve(); return }
                guard let error = error as NSError? else { call.resolve(); return }
                let busy = error.domain == NSPOSIXErrorDomain && error.code == Int(EAGAIN)
                if busy && attempt < 3 {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4 * Double(attempt + 1)) {
                        if app.alternateIconName == name { call.resolve(); return }
                        self.apply(name, call: call, attempt: attempt + 1)
                    }
                    return
                }
                call.reject(error.localizedDescription, "\(error.domain)#\(error.code)")
            }
        }
    }
}
