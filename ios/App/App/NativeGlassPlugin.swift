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
        CAPPluginMethod(name: "headerSet", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "headerHidden", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "headerRemove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setAppearance", returnType: CAPPluginReturnPromise),
    ]

    private var tabBar: UITabBar?
    private var tabIds: [String] = []
    private var anchor: UIButton?
    private var menuCall: CAPPluginCall?
    private var menuPicked = false
    private var headerHost: UIView?
    private var leadingPill: GlassPillView?
    private var trailingPill: GlassPillView?

    private var host: UIViewController? { bridge?.viewController }

    // MARK: — верхняя шапка (плавающие стеклянные пилюли)

    // Пилюли шапки каждого экрана (приветствие + счётчик, либо заголовок) —
    // настоящим стеклом, как нижний бар. Веб-topZone в приложении прячется,
    // а их место занимают эти капсулы: leading слева, trailing справа; если
    // trailing нет — одна капсула по центру (экраны с одним заголовком).
    @objc func headerSet(_ call: CAPPluginCall) {
        let leading = call.getString("leading") ?? ""
        let leadingSymbol = call.getString("leadingSymbol")
        let trailingText = call.getString("trailingText")
        let trailingSymbol = call.getString("trailingSymbol")
        DispatchQueue.main.async {
            guard let host = self.host else { call.resolve(); return }
            let container: UIView
            if let existing = self.headerHost {
                container = existing
            } else {
                container = UIView()
                container.translatesAutoresizingMaskIntoConstraints = false
                container.isUserInteractionEnabled = false
                host.view.addSubview(container)
                NSLayoutConstraint.activate([
                    container.leadingAnchor.constraint(equalTo: host.view.leadingAnchor, constant: 16),
                    container.trailingAnchor.constraint(equalTo: host.view.trailingAnchor, constant: -16),
                    container.topAnchor.constraint(equalTo: host.view.safeAreaLayoutGuide.topAnchor, constant: 8),
                    container.heightAnchor.constraint(equalToConstant: 40),
                ])
                self.headerHost = container
            }

            let lead = self.leadingPill ?? { let p = GlassPillView(); container.addSubview(p); self.leadingPill = p; return p }()
            lead.setText(leading, symbol: leadingSymbol, accentIcon: false)

            if let tt = trailingText {
                let tr = self.trailingPill ?? { let p = GlassPillView(); container.addSubview(p); self.trailingPill = p; return p }()
                tr.setText(tt, symbol: trailingSymbol, accentIcon: true)
                tr.isHidden = false
                // leading слева, trailing справа.
                lead.center(in: container, axis: .leading)
                tr.center(in: container, axis: .trailing)
            } else {
                self.trailingPill?.isHidden = true
                // единственная капсула — по центру.
                lead.center(in: container, axis: .center)
            }
            call.resolve()
        }
    }

    @objc func headerHidden(_ call: CAPPluginCall) {
        let hidden = call.getBool("hidden") ?? false
        DispatchQueue.main.async {
            guard let c = self.headerHost else { call.resolve(); return }
            UIView.animate(withDuration: 0.2, delay: 0, options: [.beginFromCurrentState]) {
                c.alpha = hidden ? 0 : 1
                c.transform = hidden ? CGAffineTransform(translationX: 0, y: -24) : .identity
            }
            call.resolve()
        }
    }

    @objc func headerRemove(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.headerHost?.removeFromSuperview()
            self.headerHost = nil
            self.leadingPill = nil
            self.trailingPill = nil
            call.resolve()
        }
    }

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

/// Плавающая капсула со стеклом — верхняя шапка. На iOS 26 это Liquid Glass
/// (UIGlassEffect), на старых — системное размытие. Внутри иконка SF Symbol
/// (для счётчика) и подпись; ширина обнимает содержимое.
private final class GlassPillView: UIView {
    private let effect = UIVisualEffectView()
    private let label = UILabel()
    private let icon = UIImageView()
    private var lastAxis: Axis?

    enum Axis { case leading, trailing, center }

    override init(frame: CGRect) {
        super.init(frame: frame)
        translatesAutoresizingMaskIntoConstraints = false
        if #available(iOS 26.0, *) {
            effect.effect = UIGlassEffect(style: .regular)
        } else {
            effect.effect = UIBlurEffect(style: .systemThinMaterial)
        }
        effect.translatesAutoresizingMaskIntoConstraints = false
        effect.clipsToBounds = true
        effect.layer.cornerRadius = 20
        effect.layer.cornerCurve = .continuous
        addSubview(effect)

        icon.contentMode = .scaleAspectFit
        icon.translatesAutoresizingMaskIntoConstraints = false
        label.font = .systemFont(ofSize: 15, weight: .bold)
        label.translatesAutoresizingMaskIntoConstraints = false

        let stack = UIStackView(arrangedSubviews: [icon, label])
        stack.axis = .horizontal
        stack.spacing = 6
        stack.alignment = .center
        stack.translatesAutoresizingMaskIntoConstraints = false
        effect.contentView.addSubview(stack)

        NSLayoutConstraint.activate([
            effect.topAnchor.constraint(equalTo: topAnchor),
            effect.bottomAnchor.constraint(equalTo: bottomAnchor),
            effect.leadingAnchor.constraint(equalTo: leadingAnchor),
            effect.trailingAnchor.constraint(equalTo: trailingAnchor),
            heightAnchor.constraint(equalToConstant: 40),
            stack.centerYAnchor.constraint(equalTo: effect.contentView.centerYAnchor),
            stack.leadingAnchor.constraint(equalTo: effect.contentView.leadingAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: effect.contentView.trailingAnchor, constant: -16),
            icon.widthAnchor.constraint(equalToConstant: 17),
        ])
    }

    required init?(coder: NSCoder) { fatalError() }

    func setText(_ text: String, symbol: String?, accentIcon: Bool) {
        label.text = text
        label.textColor = .label
        icon.tintColor = accentIcon
            ? UIColor(red: 0x78/255, green: 0x6A/255, blue: 0xD7/255, alpha: 1) // акцент кабинета
            : .label
        if let symbol, let img = UIImage(systemName: symbol) {
            icon.image = img
            icon.isHidden = false
        } else {
            icon.image = nil
            icon.isHidden = true
        }
    }

    /// Поставить капсулу к краю контейнера или по центру (повторный тот же —
    /// без переустановки, иначе констрейнты копятся).
    func center(in container: UIView, axis: Axis) {
        guard axis != lastAxis else { return }
        lastAxis = axis
        constraints.filter { $0.firstAttribute == .centerX || $0.firstAttribute == .leading || $0.firstAttribute == .trailing }.forEach { _ in }
        // Снимаем прежние опорные констрейнты этой капсулы в контейнере.
        container.constraints.filter { ($0.firstItem === self || $0.secondItem === self) }.forEach { container.removeConstraint($0) }
        centerYAnchor.constraint(equalTo: container.centerYAnchor).isActive = true
        switch axis {
        case .leading: leadingAnchor.constraint(equalTo: container.leadingAnchor).isActive = true
        case .trailing: trailingAnchor.constraint(equalTo: container.trailingAnchor).isActive = true
        case .center: centerXAnchor.constraint(equalTo: container.centerXAnchor).isActive = true
        }
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
