import Capacitor
import UIKit
import SwiftUI

// Выбор иконки приложения на главном экране телефона. Набор лежит в
// Assets.xcassets (AppIcon-Classic, AppIcon-Night…), имена перечислены в
// ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES — оттуда actool сам пишет
// CFBundleAlternateIcons в Info.plist. name = nil возвращает основную иконку.
// Система после смены показывает своё окошко «Иконка изменена» — убрать его
// публичным API нельзя.
@objc(AppIconPlugin)
public class AppIconPlugin: CAPPlugin, CAPBridgedPlugin, UISheetPresentationControllerDelegate {
    public let identifier = "AppIconPlugin"
    public let jsName = "AppIcon"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showMoreSetting", returnType: CAPPluginReturnPromise),
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
            AppIconService.setIcon(name) { error in
                if let error = error as NSError? {
                    call.reject(error.localizedDescription, "\(error.domain)#\(error.code)")
                } else {
                    call.resolve()
                }
            }
        }
    }

    private var settingsCall: CAPPluginCall?
    private weak var settingsController: UIViewController?

    @objc func showMoreSetting(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [self] in
            if self.settingsCall != nil {
                call.resolve()
                return
            }
            guard AppLock.shared.screen == .none else { call.resolve(); return }
            guard let host = self.bridge?.viewController, host.viewIfLoaded?.window != nil,
                  host.presentedViewController == nil,
                  let setting = call.getString("setting"),
                  ["theme", "language", "icon"].contains(setting),
                  let title = call.getString("title"),
                  let rawOptions = call.getArray("options", JSObject.self) else {
                call.reject("Settings unavailable")
                return
            }
            let isIcon = setting == "icon"
            guard !isIcon || UIApplication.shared.supportsAlternateIcons else {
                call.reject("Alternate icons unavailable")
                return
            }
            let options = rawOptions.compactMap(MoreSettingOption.init)
            guard !options.isEmpty else { call.reject("Missing settings options"); return }

            let selected = isIcon
                ? options.first { $0.iconName == UIApplication.shared.alternateIconName }?.id ?? "ogonek"
                : call.getString("selected") ?? ""
            let content = MoreSettingSheet(
                title: title,
                errorTitle: call.getString("errorTitle") ?? "",
                options: options,
                isIcon: isIcon,
                selected: selected,
                onSelect: { [weak self] in self?.dismissSetting(selected: $0) },
                onPending: { [weak self] in self?.settingsController?.isModalInPresentation = $0 }
            )
            let controller = UIHostingController(rootView: content)
            controller.overrideUserInterfaceStyle = call.getBool("dark") == true ? .dark : .light
            controller.modalPresentationStyle = .pageSheet
            controller.view.backgroundColor = .clear
            if let sheet = controller.sheetPresentationController {
                sheet.configureIskraGlass(largeOnly: isIcon)
                sheet.delegate = self
            }
            self.settingsCall = call
            self.settingsController = controller
            host.present(controller, animated: true)
        }
    }

    private func dismissSetting(selected: String?) {
        guard let controller = settingsController, !controller.isBeingDismissed else { return }
        controller.dismiss(animated: true) { self.finishSetting(selected: selected) }
    }

    public func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        guard presentationController.presentedViewController === settingsController else { return }
        finishSetting(selected: nil)
    }

    private func finishSetting(selected: String?) {
        let call = settingsCall
        settingsCall = nil
        settingsController = nil
        if let selected { call?.resolve(["selected": selected]) } else { call?.resolve() }
    }
}

private enum AppIconService {
    static func setIcon(_ name: String?, completion: @escaping (Error?) -> Void) {
        let app = UIApplication.shared
        guard app.supportsAlternateIcons else {
            completion(NSError(domain: "Iskra.AppIcon", code: 1))
            return
        }
        if app.alternateIconName == name { completion(nil); return }
        apply(name, attempt: 0, completion: completion)
    }

    // iOS 26 отвечает NSPOSIXErrorDomain 35 («Resource temporarily
    // unavailable») через раз: в симуляторе 26.3 первая смена с этой ошибкой
    // применилась, вторая — нет. Ошибка временная: повторяем с паузой, а итог
    // проверяем по alternateIconName — он правдивее ответа.
    private static func apply(_ name: String?, attempt: Int, completion: @escaping (Error?) -> Void) {
        let app = UIApplication.shared
        app.setAlternateIconName(name) { error in
            DispatchQueue.main.async {
                if app.alternateIconName == name { completion(nil); return }
                guard let error = error as NSError? else { completion(nil); return }
                let busy = error.domain == NSPOSIXErrorDomain && error.code == Int(EAGAIN)
                if busy && attempt < 3 {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4 * Double(attempt + 1)) {
                        if app.alternateIconName == name { completion(nil); return }
                        apply(name, attempt: attempt + 1, completion: completion)
                    }
                    return
                }
                completion(error)
            }
        }
    }
}

private struct MoreSettingOption: Identifiable {
    let id: String
    let title: String
    let iconName: String?
    let preview: UIImage?

    init?(_ object: JSObject) {
        guard let id = object["id"] as? String, let title = object["title"] as? String else { return nil }
        self.id = id
        self.title = title
        iconName = object["native"] as? String
        if let path = object["preview"] as? String,
           path == "/app-icons/\(id).jpg",
           id.range(of: "^[a-z]+$", options: .regularExpression) != nil,
           let url = Bundle.main.url(forResource: id, withExtension: "jpg", subdirectory: "public/app-icons") {
            preview = UIImage(contentsOfFile: url.path)
        } else {
            preview = nil
        }
    }
}

private struct MoreSettingSheet: View {
    let title: String
    let errorTitle: String
    let options: [MoreSettingOption]
    let isIcon: Bool
    @State var selected: String
    let onSelect: (String?) -> Void
    let onPending: (Bool) -> Void

    @State private var pending = false
    @State private var failed = false

    var body: some View {
        VStack(spacing: 12) {
            Text(title)
                .font(.title3.weight(.semibold))
                .accessibilityAddTraits(.isHeader)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)
            if #available(iOS 26.0, *) {
                choices
                    .scrollEdgeEffectStyle(.soft, for: .top)
                    .scrollEdgeEffectStyle(.soft, for: .bottom)
            } else {
                choices
            }
        }
        .padding(.top, 24)
        .alert(errorTitle, isPresented: $failed) { }
        .accessibilityAction(.escape) {
            if !pending { onSelect(nil) }
        }
    }

    private var choices: some View {
        ScrollView {
            if isIcon {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 90), spacing: 8)], spacing: 16) {
                    ForEach(options) { option in
                        Button { choose(option) } label: {
                            VStack(spacing: 8) {
                                if let preview = option.preview {
                                    Image(uiImage: preview)
                                        .resizable()
                                        .frame(width: 64, height: 64)
                                        .clipShape(RoundedRectangle(cornerRadius: 14))
                                        .overlay(alignment: .bottomTrailing) {
                                            if selected == option.id {
                                                selectionMark.padding(4).background(.regularMaterial, in: Circle())
                                            }
                                        }
                                        .accessibilityHidden(true)
                                }
                                Text(option.title).font(.subheadline).multilineTextAlignment(.center)
                            }
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .disabled(pending)
                        .accessibilityAddTraits(selected == option.id ? .isSelected : [])
                    }
                }
                .padding(20)
            } else {
                VStack(spacing: 0) {
                    ForEach(options) { option in
                        Button { choose(option) } label: {
                            HStack {
                                Text(option.title)
                                Spacer()
                                if selected == option.id { selectionMark }
                            }
                            .padding(.horizontal, 16)
                            .frame(minHeight: 44)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityAddTraits(selected == option.id ? .isSelected : [])
                        if option.id != options.last?.id { Divider().padding(.leading, 16) }
                    }
                }
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18))
                .padding(.horizontal, 20)
            }
        }
    }

    private var selectionMark: some View {
        Image(systemName: "checkmark")
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(Color.accentColor)
            .accessibilityHidden(true)
    }

    private func choose(_ option: MoreSettingOption) {
        if !isIcon {
            onSelect(option.id)
            return
        }
        guard !pending, selected != option.id else { return }
        pending = true
        onPending(true)
        let previous = selected
        selected = option.id
        AppIconService.setIcon(option.iconName) { error in
            pending = false
            onPending(false)
            if error != nil {
                selected = previous
                failed = true
            }
        }
    }
}
