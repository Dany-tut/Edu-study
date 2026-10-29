import Capacitor
import UIKit

// Системные контролы iOS поверх WebView: в приложении алерты, подтверждения,
// выпадающие списки и нижняя навигация рисуются самой системой — с её стеклом
// (Liquid Glass на iOS 26), шрифтом, хаптикой и анимациями. Веб-версия этих же
// мест остаётся для браузера; выбор — в src/lib/nativeGlass.ts.
//
// АЛЕРТ. UIAlertController: кнопки приходят списком, ответ — номер нажатой.
// Стиль 'cancel' система ставит на своё место сама, 'destructive' — красным.
//
// МЕНЮ. Выпадающий список = UIMenu у прозрачной кнопки, поставленной ровно на
// место веб-триггера (прямоугольник из getBoundingClientRect, точки = CSS px).
// performPrimaryAction (iOS 17.4+) открывает его как настоящее меню кнопки.
// Закрыли без выбора — ответ index = -1.
//
// ТАБ-БАР. Настоящий UITabBar поверх WebView. Пункты задаёт JS (id, подпись,
// имя SF Symbol, бейдж), нажатие уходит событием tabSelect. Над веб-шторками
// и окнами бар прятать должен JS (hidden): у WebView нет своего способа
// оказаться выше нативного вида.
@objc(NativeGlassPlugin)
public class NativeGlassPlugin: CAPPlugin, CAPBridgedPlugin, UITabBarDelegate {
    public let identifier = "NativeGlassPlugin"
    public let jsName = "NativeGlass"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "alert", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "menu", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "tabBarSet", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "tabBarHidden", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "tabBarRemove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setAppearance", returnType: CAPPluginReturnPromise),
    ]

    private var tabBar: UITabBar?
    private var tabIds: [String] = []
    private var anchor: UIButton?
    private var menuCall: CAPPluginCall?
    private var menuPicked = false

    private var host: UIViewController? { bridge?.viewController }

    // MARK: — тема

    /// Тема кабинета своя (data-theme), системные контролы смотрят на тему
    /// окна — подгоняем окно под кабинет.
    @objc func setAppearance(_ call: CAPPluginCall) {
        let dark = call.getBool("dark") ?? false
        DispatchQueue.main.async {
            self.host?.view.window?.overrideUserInterfaceStyle = dark ? .dark : .light
            call.resolve()
        }
    }

    // MARK: — алерт

    @objc func alert(_ call: CAPPluginCall) {
        let title = call.getString("title")
        let message = call.getString("message")
        let buttons = call.getArray("buttons", JSObject.self) ?? [["label": "OK"]]
        DispatchQueue.main.async {
            guard let host = self.host else { call.resolve(["index": -1]); return }
            let ac = UIAlertController(title: title, message: message, preferredStyle: .alert)
            for (i, b) in buttons.enumerated() {
                let style: UIAlertAction.Style
                switch b["style"] as? String {
                case "cancel": style = .cancel
                case "destructive": style = .destructive
                default: style = .default
                }
                let action = UIAlertAction(title: b["label"] as? String ?? "", style: style) { _ in
                    call.resolve(["index": i])
                }
                ac.addAction(action)
                if b["preferred"] as? Bool == true { ac.preferredAction = action }
            }
            host.present(ac, animated: true)
        }
    }

    // MARK: — меню

    @objc func menu(_ call: CAPPluginCall) {
        let items = call.getArray("items", JSObject.self) ?? []
        let rect = CGRect(
            x: call.getDouble("x") ?? 0, y: call.getDouble("y") ?? 0,
            width: max(1, call.getDouble("width") ?? 1), height: max(1, call.getDouble("height") ?? 1)
        )
        let title = call.getString("title") ?? ""
        DispatchQueue.main.async {
            guard let host = self.host, let web = self.bridge?.webView else { call.resolve(["index": -1]); return }
            self.finishMenu(index: -1)
            self.menuCall = call
            self.menuPicked = false

            let actions: [UIMenuElement] = items.enumerated().map { (i, it) in
                var attrs: UIMenuElement.Attributes = []
                if it["destructive"] as? Bool == true { attrs.insert(.destructive) }
                if it["disabled"] as? Bool == true { attrs.insert(.disabled) }
                let image = (it["symbol"] as? String).flatMap { UIImage(systemName: $0) }
                let action = UIAction(title: it["label"] as? String ?? "", image: image, attributes: attrs) { [weak self] _ in
                    self?.menuPicked = true
                    self?.finishMenu(index: i)
                }
                action.state = (it["checked"] as? Bool == true) ? .on : .off
                return action
            }

            let button = MenuAnchorButton(type: .custom)
            // Закрыли мимо пунктов — ответ -1. С запасом по времени: действие
            // пункта UIKit может вызвать уже после конца анимации закрытия.
            button.onMenuEnd = { [weak self] in
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                    guard let self, !self.menuPicked else { return }
                    self.finishMenu(index: -1)
                }
            }
            button.frame = web.convert(rect, to: host.view)
            button.backgroundColor = .clear
            button.menu = UIMenu(title: title, options: .singleSelection, children: actions)
            button.showsMenuAsPrimaryAction = true
            host.view.addSubview(button)
            self.anchor = button

            if #available(iOS 17.4, *) {
                button.performPrimaryAction()
            } else {
                // Старые системы: меню откроется по касанию прозрачной кнопки,
                // а до него — снимать её нечем, поэтому сразу отвечаем «нет».
                self.finishMenu(index: -1)
            }
        }
    }

    private func finishMenu(index: Int) {
        if let call = menuCall {
            menuCall = nil
            call.resolve(["index": index])
        }
        anchor?.removeFromSuperview()
        anchor = nil
    }

    // MARK: — таб-бар

    @objc func tabBarSet(_ call: CAPPluginCall) {
        let items = call.getArray("items", JSObject.self) ?? []
        let selected = call.getString("selected")
        DispatchQueue.main.async {
            guard let host = self.host else { call.resolve(); return }
            let bar: UITabBar
            if let existing = self.tabBar {
                bar = existing
            } else {
                bar = UITabBar()
                bar.delegate = self
                bar.translatesAutoresizingMaskIntoConstraints = false
                host.view.addSubview(bar)
                NSLayoutConstraint.activate([
                    bar.leadingAnchor.constraint(equalTo: host.view.leadingAnchor),
                    bar.trailingAnchor.constraint(equalTo: host.view.trailingAnchor),
                    bar.bottomAnchor.constraint(equalTo: host.view.bottomAnchor),
                ])
                self.tabBar = bar
            }
            if let tint = call.getString("tint") { bar.tintColor = UIColor(hex: tint) }

            let ids = items.map { $0["id"] as? String ?? "" }
            let tabItems: [UITabBarItem] = items.enumerated().map { (i, it) in
                let symbol = it["symbol"] as? String ?? "circle"
                let item = UITabBarItem(title: it["title"] as? String, image: UIImage(systemName: symbol), tag: i)
                if let badge = it["badge"] as? Int, badge > 0 { item.badgeValue = badge > 99 ? "99+" : String(badge) }
                return item
            }
            // Пункты пересоздаём только когда сменился их состав — иначе при
            // каждом бейдже бар мигал бы выделением.
            if ids != self.tabIds || bar.items?.count != tabItems.count {
                bar.setItems(tabItems, animated: false)
                self.tabIds = ids
            } else {
                for (i, it) in tabItems.enumerated() {
                    bar.items?[i].badgeValue = it.badgeValue
                    bar.items?[i].title = it.title
                }
            }
            if let sel = selected, let i = ids.firstIndex(of: sel) { bar.selectedItem = bar.items?[i] }
            call.resolve()
        }
    }

    @objc func tabBarHidden(_ call: CAPPluginCall) {
        let hidden = call.getBool("hidden") ?? false
        DispatchQueue.main.async {
            guard let bar = self.tabBar else { call.resolve(); return }
            let shift = hidden ? bar.bounds.height + 40 : 0
            UIView.animate(withDuration: 0.25, delay: 0, options: [.curveEaseOut, .beginFromCurrentState]) {
                bar.transform = CGAffineTransform(translationX: 0, y: shift)
                bar.alpha = hidden ? 0 : 1
            }
            bar.isUserInteractionEnabled = !hidden
            call.resolve()
        }
    }

    @objc func tabBarRemove(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.tabBar?.removeFromSuperview()
            self.tabBar = nil
            self.tabIds = []
            call.resolve()
        }
    }

    public func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        guard item.tag < tabIds.count else { return }
        notifyListeners("tabSelect", data: ["id": tabIds[item.tag]])
    }
}

/// Кнопка-якорь меню: UIControl сам делегат своего контекстного меню, и
/// подкласс может узнать, что меню закрылось (выбором или мимо).
private final class MenuAnchorButton: UIButton {
    var onMenuEnd: (() -> Void)?
    override func contextMenuInteraction(_ interaction: UIContextMenuInteraction, willEndFor configuration: UIContextMenuConfiguration, animator: UIContextMenuInteractionAnimating?) {
        super.contextMenuInteraction(interaction, willEndFor: configuration, animator: animator)
        if let animator { animator.addCompletion { [weak self] in self?.onMenuEnd?() } } else { onMenuEnd?() }
    }
}

private extension UIColor {
    convenience init?(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespaces)
        if s.hasPrefix("#") { s.removeFirst() }
        guard s.count == 6, let v = UInt32(s, radix: 16) else { return nil }
        self.init(red: CGFloat((v >> 16) & 0xFF) / 255, green: CGFloat((v >> 8) & 0xFF) / 255, blue: CGFloat(v & 0xFF) / 255, alpha: 1)
    }
}
