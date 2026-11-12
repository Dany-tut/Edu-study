import Capacitor
import UIKit
import SwiftUI

// App-owned bar/header glyphs use the same Loop artwork as the mobile web UI.
// Public assets are copied by Capacitor; system controls keep their own symbols.
private enum LoopNativeIcons {
    private static let names = [
        "house": "Home", "calendar": "CalendarCheck", "person.2": "Users",
        "checkmark.rectangle.stack": "CheckCircle2", "checklist": "NotebookPen",
        "person.crop.circle": "UserCircle", "book": "BookOpen", "dumbbell": "Dumbbell", "magnifyingglass": "Search", "slider.horizontal.3": "SlidersHorizontal",
    ]
    private static var images: [String: UIImage] = [:]

    static func image(_ symbol: String, traits: UITraitCollection = .current) -> UIImage? {
        guard let name = names[symbol] else { return UIImage(systemName: symbol) }
        let theme = traits.userInterfaceStyle == .dark ? "dark" : "light"
        let resource = "\(name)-\(theme)@3x"
        if let cached = images[resource] { return cached }
        guard let url = Bundle.main.url(forResource: resource, withExtension: "png", subdirectory: "public/icons/loop"),
              let data = try? Data(contentsOf: url), let glyph = UIImage(data: data, scale: 3) else {
            return UIImage(systemName: symbol)
        }
        // The resource is 72 physical pixels. Keep its 24-point logical size
        // when handing it to UITabBarItem, including after appearance changes.
        let image = glyph.withRenderingMode(.alwaysOriginal)
        images[resource] = image
        return image
    }

}

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
public class NativeGlassPlugin: CAPPlugin, CAPBridgedPlugin, UITabBarDelegate, UISheetPresentationControllerDelegate {
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
        CAPPluginMethod(name: "barSet", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "barHidden", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "barRemove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "documentScrollEdges", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "lockMfaScroll", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sheetShow", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sheetClose", returnType: CAPPluginReturnPromise),
    ]

    private var tabBar: UITabBar?
    private var tabBarEdges: [NSLayoutConstraint] = []
    private var tabBarCompact = false
    private var tabIds: [String] = []
    private var tabSymbols: [String] = []
    private var anchor: UIButton?
    private var menuCall: CAPPluginCall?
    private var menuPicked = false
    private var headerHost: UIView?
    private var leadingPill: GlassPillView?
    private var trailingPill: GlassPillView?
    private var headerBackButton: UIButton?
    private var headerTitleWidth: NSLayoutConstraint?
    // Стеклянный бар экрана (ученик, iPhone): таблетка сверху + ряд снизу.
    private var barTopViews: [UIButton] = []
    private var barBottomView: UIStackView?
    private var barBottomConstraint: NSLayoutConstraint?
    private var barBottomButtonSizes: [NSLayoutConstraint] = []
    private var barBottomWidth: NSLayoutConstraint?
    private var barBottomExpandedWidthInset: CGFloat = 0
    private var barLastOptions: JSObject?
    private var barLastKey = ""

    private var mfaOffsetObservation: NSKeyValueObservation?
    private var restoreMfaScroll: (() -> Void)?

    @objc func lockMfaScroll(_ call: CAPPluginCall) {
        let locked = call.getBool("locked") ?? false
        DispatchQueue.main.async {
            if locked, UIDevice.current.userInterfaceIdiom == .phone,
               self.restoreMfaScroll == nil, let scroll = self.bridge?.webView?.scrollView {
                let wasEnabled = scroll.isScrollEnabled
                let wasBouncing = scroll.bounces
                self.restoreMfaScroll = { [weak scroll] in
                    scroll?.isScrollEnabled = wasEnabled
                    scroll?.bounces = wasBouncing
                }
                scroll.isScrollEnabled = false
                scroll.bounces = false
                // WebKit can still change contentOffset programmatically to reveal
                // a focused input. The MFA layout already clears the keyboard.
                self.mfaOffsetObservation = scroll.observe(\.contentOffset, options: [.initial, .new]) { scroll, _ in
                    guard abs(scroll.zoomScale - 1) < 0.01 else { return }
                    let top = -scroll.adjustedContentInset.top
                    guard abs(scroll.contentOffset.y - top) > 0.5 else { return }
                    scroll.setContentOffset(CGPoint(x: scroll.contentOffset.x, y: top), animated: false)
                }
            } else if !locked {
                self.mfaOffsetObservation?.invalidate()
                self.mfaOffsetObservation = nil
                self.restoreMfaScroll?()
                self.restoreMfaScroll = nil
            }
            call.resolve()
        }
    }

    private var documentEdgesEnabled = false
    private var restoreDocumentEdges: (() -> Void)?
    private var documentTopInteraction: UIInteraction?
    private var documentBottomInteraction: UIInteraction?

    @objc func documentScrollEdges(_ call: CAPPluginCall) {
        let enabled = call.getBool("enabled") ?? false
        DispatchQueue.main.async {
            guard #available(iOS 26.0, *), let scroll = self.bridge?.webView?.scrollView else {
                call.resolve(["enabled": false])
                return
            }
            if enabled && !self.documentEdgesEnabled {
                let topStyle = scroll.topEdgeEffect.style
                let bottomStyle = scroll.bottomEdgeEffect.style
                let topHidden = scroll.topEdgeEffect.isHidden
                let bottomHidden = scroll.bottomEdgeEffect.isHidden
                let bounces = scroll.bounces
                self.restoreDocumentEdges = { [weak scroll] in
                    scroll?.bounces = bounces
                    scroll?.topEdgeEffect.style = topStyle
                    scroll?.bottomEdgeEffect.style = bottomStyle
                    scroll?.topEdgeEffect.isHidden = topHidden
                    scroll?.bottomEdgeEffect.isHidden = bottomHidden
                }
                // Capacitor disables bounce on its WebView by default.
                scroll.bounces = true
                scroll.topEdgeEffect.style = .soft
                scroll.bottomEdgeEffect.style = .soft
                scroll.topEdgeEffect.isHidden = false
                scroll.bottomEdgeEffect.isHidden = false
            } else if !enabled {
                self.restoreDocumentEdges?()
                self.restoreDocumentEdges = nil
            }
            self.documentEdgesEnabled = enabled
            self.updateDocumentEdge(in: self.barTopViews.first ?? self.headerHost, edge: .top)
            self.updateDocumentEdge(in: self.tabBar, edge: .bottom)
            call.resolve(["enabled": enabled])
        }
    }

    private func updateDocumentEdge(in container: UIView?, edge: UIRectEdge) {
        guard #available(iOS 26.0, *) else { return }
        let previous = edge == .top ? documentTopInteraction : documentBottomInteraction
        if let previous { previous.view?.removeInteraction(previous) }
        let replacement: UIInteraction?
        if documentEdgesEnabled, let container, let scroll = bridge?.webView?.scrollView {
            let interaction = UIScrollEdgeElementContainerInteraction()
            interaction.scrollView = scroll
            interaction.edge = edge
            container.addInteraction(interaction)
            replacement = interaction
        } else {
            replacement = nil
        }
        if edge == .top {
            documentTopInteraction = replacement
        } else {
            documentBottomInteraction = replacement
        }
    }

    private var contentSheet: UIViewController?
    private var contentSheetID: String?
    private var contentSheetModel: GlassContentSheetModel?

    @objc func sheetShow(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [self] in
            guard let id = call.getString("id"), let host = self.host else {
                call.reject("Sheet unavailable")
                return
            }
            if self.contentSheetID == id, let model = self.contentSheetModel {
                model.content = GlassSheetContent(call.options as? JSObject ?? [:])
                call.resolve()
                return
            }
            guard self.contentSheet == nil, host.presentedViewController == nil else {
                call.reject("Another sheet is open")
                return
            }
            let model = GlassContentSheetModel(content: GlassSheetContent(call.options as? JSObject ?? [:]))
            let content = GlassContentSheet(model: model) { [weak self] action in
                self?.notifyListeners("sheetAction", data: ["id": id, "action": action])
            }
            let controller = UIHostingController(rootView: content)
            controller.modalPresentationStyle = .pageSheet
            controller.view.backgroundColor = .clear
            if let sheet = controller.sheetPresentationController {
                let medium = UISheetPresentationController.Detent.medium()
                let large = UISheetPresentationController.Detent.large()
                if #available(iOS 26.1, *) {
                    func background() -> UIGlassEffect {
                        let effect = UIGlassEffect(style: .regular)
                        if model.content.glass {
                            effect.tintColor = UIColor { traits in
                                if traits.userInterfaceStyle == .dark {
                                    return UIColor(red: 0.17, green: 0.15, blue: 0.22, alpha: 0.82)
                                }
                                return UIColor(red: 0.96, green: 0.94, blue: 0.99, alpha: 0.78)
                            }
                        }
                        return effect
                    }
                    medium.backgroundEffect = background()
                    large.backgroundEffect = background()
                }
                sheet.detents = [medium, large]
                sheet.prefersGrabberVisible = true
                sheet.prefersScrollingExpandsWhenScrolledToEdge = false
                sheet.delegate = self
            }
            self.contentSheetID = id
            self.contentSheet = controller
            self.contentSheetModel = model
            host.present(controller, animated: true)
            call.resolve()
        }
    }

    @objc func sheetClose(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let id = call.getString("id"), self.contentSheetID == id,
                  let controller = self.contentSheet else { call.resolve(); return }
            controller.dismiss(animated: true) {
                if self.contentSheet === controller { self.clearContentSheet() }
                call.resolve()
            }
        }
    }

    public func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        guard contentSheet === presentationController.presentedViewController, let id = contentSheetID else { return }
        clearContentSheet()
        notifyListeners("sheetDismiss", data: ["id": id])
    }

    private func clearContentSheet() {
        contentSheet = nil
        contentSheetID = nil
        contentSheetModel = nil
    }

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
        let showBack = call.getBool("back") ?? false
        let backLabel = call.getString("backLabel") ?? "Назад"
        DispatchQueue.main.async {
            guard let host = self.host else { call.resolve(); return }
            let container: UIView
            if let existing = self.headerHost {
                container = existing
            } else {
                container = UIView()
                container.translatesAutoresizingMaskIntoConstraints = false
                container.isUserInteractionEnabled = true
                host.view.addSubview(container)
                NSLayoutConstraint.activate([
                    container.leadingAnchor.constraint(equalTo: host.view.leadingAnchor, constant: 16),
                    container.trailingAnchor.constraint(equalTo: host.view.trailingAnchor, constant: -16),
                    // Канон iPhone «туго-к-верху» (Дани): нативный хедер на той же
                    // линии, что веб-шапки (mobileTokens MOBILE_TOP_GAP=2). Было 22.
                    container.topAnchor.constraint(equalTo: host.view.safeAreaLayoutGuide.topAnchor, constant: 2),
                    container.heightAnchor.constraint(equalToConstant: 44),
                ])
                self.headerHost = container
                self.updateDocumentEdge(in: container, edge: .top)
            }

            let lead = self.leadingPill ?? { let p = GlassPillView(); container.addSubview(p); self.leadingPill = p; return p }()
            lead.setText(leading, symbol: leadingSymbol, accentIcon: false)
            lead.isAccessibilityElement = true
            lead.accessibilityLabel = leading
            lead.accessibilityTraits = .header
            if self.headerBackButton == nil {
                let button = UIButton(type: .system)
                button.translatesAutoresizingMaskIntoConstraints = false
                if #available(iOS 26.0, *) {
                    var config = UIButton.Configuration.glass()
                    config.cornerStyle = .capsule
                    button.configuration = config
                } else {
                    button.backgroundColor = .secondarySystemBackground
                    button.layer.cornerRadius = 22
                }
                button.addTarget(self, action: #selector(self.headerBackTapped), for: .touchUpInside)
                container.addSubview(button)
                NSLayoutConstraint.activate([
                    button.leadingAnchor.constraint(equalTo: container.leadingAnchor),
                    button.centerYAnchor.constraint(equalTo: container.centerYAnchor),
                    button.widthAnchor.constraint(equalToConstant: 44),
                    button.heightAnchor.constraint(equalToConstant: 44),
                ])
                self.headerBackButton = button
            }
            self.headerBackButton?.isHidden = !showBack
            self.headerBackButton?.accessibilityLabel = backLabel
            self.headerBackButton?.setImage(LoopNativeIcons.image("chevron.left", traits: host.traitCollection) ?? UIImage(systemName: "chevron.left"), for: .normal)
            lead.center(in: container, axis: .center)
            if self.headerTitleWidth == nil {
                self.headerTitleWidth = lead.widthAnchor.constraint(lessThanOrEqualTo: container.widthAnchor)
                self.headerTitleWidth?.isActive = true
            }
            var titleSideInset: CGFloat = showBack ? 56 : 0

            if let tt = trailingText {
                let tr = self.trailingPill ?? { let p = GlassPillView(); container.addSubview(p); self.trailingPill = p; return p }()
                tr.setText(tt, symbol: trailingSymbol, accentIcon: true)
                tr.isHidden = false
                // leading слева, trailing справа.
                tr.center(in: container, axis: .trailing)
                let trailingWidth = tr.systemLayoutSizeFitting(UIView.layoutFittingCompressedSize).width
                titleSideInset = max(titleSideInset, trailingWidth + 12)
            } else {
                self.trailingPill?.isHidden = true
                // единственная капсула — по центру.
                lead.center(in: container, axis: .center)
            }
            self.headerTitleWidth?.constant = -2 * titleSideInset
            call.resolve()
        }
    }

    @objc private func headerBackTapped() {
        UISelectionFeedbackGenerator().selectionChanged()
        notifyListeners("headerBack", data: [:])
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
            self.updateDocumentEdge(in: self.barTopViews.first, edge: .top)
            self.leadingPill = nil
            self.headerBackButton = nil
            self.headerTitleWidth = nil
            self.trailingPill = nil
            call.resolve()
        }
    }


    // MARK: — стеклянный бар экрана (ученик, iPhone)

    // Органы управления экраном — настоящими кнопками Liquid Glass: таблетка
    // по центру сверху (переключатель, обычно с меню) и ряд над вкладками
    // (круги и таблетки). Пункт с `menu` открывает системное UIMenu прямо от
    // кнопки и сообщает выбор событием barMenu {id, value}; без меню — barTap
    // {id}. Шапка и вкладки учителя (headerSet/tabBarSet) не затрагиваются.
    @objc func barSet(_ call: CAPPluginCall) {
        let opts = call.options as? JSObject ?? [:]
        DispatchQueue.main.async {
            guard let host = self.host else { call.resolve(); return }
            // Тот же состав — ничего не пересоздаём: иначе кнопки мигали бы на
            // каждом рендере экрана.
            var layoutOptions = opts
            if var sections = opts["expandingSections"] as? JSObject {
                // The native control updates its selection in place. Keep the
                // React echo from rebuilding the row mid-animation.
                sections.removeValue(forKey: "selected")
                layoutOptions["expandingSections"] = sections
            }
            let key = (try? JSONSerialization.data(withJSONObject: layoutOptions, options: [.sortedKeys])).map { String(decoding: $0, as: UTF8.self) } ?? ""
            self.barLastOptions = opts
            if key == self.barLastKey { call.resolve(); return }
            self.barLastKey = key
            self.buildBar(opts, traits: host.traitCollection)
            call.resolve()
        }
    }

    private func buildBar(_ opts: JSObject, traits: UITraitCollection) {
        guard let host = self.host else { return }
        self.barTopViews.forEach { $0.removeFromSuperview() }; self.barTopViews.removeAll()
        self.barBottomView?.removeFromSuperview(); self.barBottomView = nil
        self.barBottomConstraint = nil
        self.barBottomButtonSizes = []
        self.barBottomWidth = nil

        let topItems = opts["top"] as? [JSObject] ?? (opts["top"] as? JSObject).map { [$0] } ?? []
        for item in topItems {
            let button = self.barButton(item, traits: traits)
            button.translatesAutoresizingMaskIntoConstraints = false
            host.view.addSubview(button)
            let horizontal: NSLayoutConstraint
            switch item["position"] as? String {
            case "leading": horizontal = button.leadingAnchor.constraint(equalTo: host.view.safeAreaLayoutGuide.leadingAnchor, constant: 16)
            case "trailing": horizontal = button.trailingAnchor.constraint(equalTo: host.view.safeAreaLayoutGuide.trailingAnchor, constant: -16)
            default: horizontal = button.centerXAnchor.constraint(equalTo: host.view.centerXAnchor)
            }
            NSLayoutConstraint.activate([
                horizontal,
                button.topAnchor.constraint(equalTo: host.view.safeAreaLayoutGuide.topAnchor, constant: 2),
                button.heightAnchor.constraint(equalToConstant: 44),
                button.widthAnchor.constraint(lessThanOrEqualTo: host.view.widthAnchor, constant: topItems.count > 1 ? -136 : -120),
            ])
            if (item["kind"] as? String) == "circle" {
                button.widthAnchor.constraint(equalToConstant: 44).isActive = true
            }
            self.barTopViews.append(button)
        }
        self.updateDocumentEdge(in: self.barTopViews.first ?? self.headerHost, edge: .top)

        let items = opts["bottom"] as? [JSObject] ?? []
        if !items.isEmpty {
            let row = UIStackView()
            row.axis = .horizontal
            row.spacing = 10
            row.alignment = .center
            row.distribution = .fill
            row.translatesAutoresizingMaskIntoConstraints = false
            for it in items {
                let b = self.barButton(it, traits: traits)
                b.translatesAutoresizingMaskIntoConstraints = false
                let height = b.heightAnchor.constraint(equalToConstant: 48)
                height.isActive = true
                self.barBottomButtonSizes.append(height)
                if (it["kind"] as? String) == "circle" {
                    let width = b.widthAnchor.constraint(equalToConstant: 48)
                    width.isActive = true
                    self.barBottomButtonSizes.append(width)
                    b.setContentHuggingPriority(.required, for: .horizontal)
                } else {
                    b.setContentHuggingPriority(.defaultLow, for: .horizontal)
                }
                row.addArrangedSubview(b)
            }
            host.view.addSubview(row)
            let bottom = row.bottomAnchor.constraint(equalTo: host.view.safeAreaLayoutGuide.bottomAnchor,
                                                     constant: self.barBottomOffset(in: host.view))
            self.barBottomConstraint = bottom
            // Над системными вкладками: капсула UITabBar начинается ~48 pt выше
            // нижней безопасной зоны, ряд встаёт с зазором 10.
            let width: NSLayoutConstraint
            let center: NSLayoutConstraint
            if let ratio = opts["bottomTabBarWidthRatio"] as? Double, ratio > 0, ratio <= 1 {
                // UIKit does not expose the visible capsule width. Allow 20 pt per side.
                center = row.centerXAnchor.constraint(equalTo: host.view.safeAreaLayoutGuide.centerXAnchor)
                width = row.widthAnchor.constraint(equalTo: host.view.safeAreaLayoutGuide.widthAnchor,
                                                   multiplier: CGFloat(ratio), constant: -40 * CGFloat(ratio))
            } else {
                center = row.centerXAnchor.constraint(equalTo: host.view.centerXAnchor)
                width = row.widthAnchor.constraint(equalTo: host.view.widthAnchor, constant: -32)
            }
            if items.contains(where: { ($0["kind"] as? String) != "circle" }) {
                self.barBottomExpandedWidthInset = width.constant
                self.barBottomWidth = width
            }
            self.updateBarBottomSize()
            NSLayoutConstraint.activate([bottom, center, width])
            if let sections = opts["expandingSections"] as? JSObject,
               let id = sections["trigger"] as? String,
               let index = items.firstIndex(where: { $0["id"] as? String == id }),
               let first = row.arrangedSubviews.first, index > 0 {
                let anchor = row.arrangedSubviews[index]
                anchor.alpha = 0
                anchor.isUserInteractionEnabled = false
                let covered = row.arrangedSubviews.dropFirst().filter { $0 !== anchor }
                let picker = GlassSectionPicker(
                    row: row, anchor: anchor, search: first, covered: covered,
                    items: sections["items"] as? [JSObject] ?? [],
                    selected: sections["selected"] as? String ?? "",
                    label: items[index]["label"] as? String ?? "", traits: traits
                ) { [weak self] value in
                    self?.notifyListeners("barMenu", data: ["id": id, "value": value])
                }
                row.addSubview(picker)
                picker.install()
            }
            self.barBottomView = row
        }
    }

    private func barButton(_ it: JSObject, traits: UITraitCollection) -> UIButton {
        let id = it["id"] as? String ?? ""
        let title = it["title"] as? String
        let symbol = it["symbol"] as? String
        let active = it["active"] as? Bool ?? false
        let menuItems = it["menu"] as? [JSObject]
        let accent = UIColor(red: 0x78/255, green: 0x6A/255, blue: 0xD7/255, alpha: 1)

        var config: UIButton.Configuration
        if #available(iOS 26.0, *) { config = .glass() } else { config = .gray() }
        config.cornerStyle = .capsule
        config.baseForegroundColor = active ? accent : .label
        if let title {
            var text = AttributedString(title)
            text.font = .systemFont(ofSize: 15, weight: .semibold)
            config.attributedTitle = text
            config.titleLineBreakMode = .byClipping
            config.contentInsets = NSDirectionalEdgeInsets(top: 0, leading: 18, bottom: 0, trailing: 16)
            if let symbol, menuItems == nil {
                config.image = LoopNativeIcons.image(symbol, traits: traits)
                config.imagePadding = 6
            }
            if menuItems != nil {
                config.image = UIImage(systemName: "chevron.down", withConfiguration: UIImage.SymbolConfiguration(pointSize: 11, weight: .bold))?.withTintColor(accent, renderingMode: .alwaysOriginal)
                config.imagePlacement = .trailing
                config.imagePadding = 6
            }
        } else if let symbol {
            config.image = LoopNativeIcons.image(symbol, traits: traits)
            config.contentInsets = .zero
        }
        let button = GlassBarButton(configuration: config)
        button.accessibilityLabel = (it["label"] as? String) ?? title
        if it["passive"] as? Bool == true {
            button.accessibilityTraits = .staticText
            button.isUserInteractionEnabled = false
            return button
        }
        // Точка «фильтр включён» у круга.
        let unread = it["unread"] as? Bool ?? false
        if (active || unread) && title == nil {
            let dot = UIView()
            dot.backgroundColor = unread ? .systemRed : accent
            dot.layer.cornerRadius = 4
            dot.translatesAutoresizingMaskIntoConstraints = false
            dot.isUserInteractionEnabled = false
            button.addSubview(dot)
            NSLayoutConstraint.activate([
                dot.widthAnchor.constraint(equalToConstant: 8), dot.heightAnchor.constraint(equalToConstant: 8),
                dot.topAnchor.constraint(equalTo: button.topAnchor, constant: 8),
                dot.trailingAnchor.constraint(equalTo: button.trailingAnchor, constant: -8),
            ])
        }
        if let menuItems {
            let actions: [UIMenuElement] = menuItems.map { m in
                let value = m["value"] as? String ?? ""
                let action = UIAction(title: m["title"] as? String ?? "") { [weak self] _ in
                    UISelectionFeedbackGenerator().selectionChanged()
                    self?.notifyListeners("barMenu", data: ["id": id, "value": value])
                }
                action.state = (m["checked"] as? Bool == true) ? .on : .off
                return action
            }
            button.menu = UIMenu(title: (it["menuTitle"] as? String) ?? "", options: .singleSelection, children: actions)
            button.showsMenuAsPrimaryAction = true
            // Порядок пунктов — как задан, сверху вниз, даже когда меню
            // раскрывается вверх от нижнего ряда.
            if #available(iOS 16.0, *) { button.preferredMenuElementOrder = .fixed }
        } else {
            button.addAction(UIAction { [weak self] _ in
                UISelectionFeedbackGenerator().selectionChanged()
                self?.notifyListeners("barTap", data: ["id": id])
            }, for: .touchUpInside)
        }
        return button
    }

    @objc func barHidden(_ call: CAPPluginCall) {
        let top = call.getBool("top") ?? false
        let bottom = call.getBool("bottom") ?? false
        DispatchQueue.main.async {
            UIView.animate(withDuration: 0.22, delay: 0, options: [.curveEaseOut, .beginFromCurrentState]) {
                self.barTopViews.forEach { button in
                    button.alpha = top ? 0 : 1
                    button.transform = top ? CGAffineTransform(translationX: 0, y: -24) : .identity
                }
                self.barBottomView?.alpha = bottom ? 0 : 1
                self.barBottomView?.transform = bottom ? CGAffineTransform(translationX: 0, y: 40) : .identity
            }
            self.barTopViews.forEach { $0.isUserInteractionEnabled = !top && !$0.accessibilityTraits.contains(.staticText) }
            self.barBottomView?.isUserInteractionEnabled = !bottom
            if bottom {
                self.barBottomView?.subviews.compactMap { $0 as? GlassSectionPicker }.first?.collapse()
            }
            call.resolve()
        }
    }

    @objc func barRemove(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.barTopViews.forEach { $0.removeFromSuperview() }; self.barTopViews.removeAll()
            self.barBottomView?.removeFromSuperview(); self.barBottomView = nil
            self.barBottomConstraint = nil
            self.barBottomButtonSizes = []
            self.barBottomWidth = nil
            self.updateDocumentEdge(in: self.headerHost, edge: .top)
            self.barLastOptions = nil
            self.barLastKey = ""
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
            if let hex = call.getString("background"), let color = UIColor(hex: hex),
               let webView = self.bridge?.webView {
                webView.underPageBackgroundColor = color
                webView.scrollView.backgroundColor = color
            }
            // Refresh app-owned images explicitly; the bar may retain its items
            // while the cabinet switches theme without changing the tab list.
            let traits = UITraitCollection(userInterfaceStyle: dark ? .dark : .light)
            for (index, item) in (self.tabBar?.items ?? []).enumerated() where index < self.tabSymbols.count {
                let image = self.tabImage(self.tabSymbols[index], traits: traits)
                item.image = image
                item.selectedImage = image
            }
            self.leadingPill?.refreshIcon(traits: traits)
            self.headerBackButton?.setImage(LoopNativeIcons.image("chevron.left", traits: traits) ?? UIImage(systemName: "chevron.left"), for: .normal)
            self.trailingPill?.refreshIcon(traits: traits)
            if let opts = self.barLastOptions { self.buildBar(opts, traits: traits) }
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
                let image = (it["symbol"] as? String).flatMap { LoopNativeIcons.image($0, traits: host.traitCollection) }
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

    private func tabImage(_ symbol: String, traits: UITraitCollection) -> UIImage? {
        let image = LoopNativeIcons.image(symbol, traits: traits)
        guard tabBarCompact, let image else { return image }
        let size = CGSize(width: image.size.width * 0.88, height: image.size.height * 0.88)
        let format = UIGraphicsImageRendererFormat()
        format.scale = image.scale
        return UIGraphicsImageRenderer(size: size, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: size))
        }.withRenderingMode(image.renderingMode)
    }

    private var tabBarHeightScale: CGFloat { tabBarCompact ? 0.82 : 1 }

    private func updateBarBottomSize() {
        for size in barBottomButtonSizes {
            size.constant = tabBarCompact ? 45 : 48
        }
        barBottomWidth?.constant = barBottomExpandedWidthInset - (tabBarCompact ? 16 : 0)
    }

    private func barBottomOffset(in view: UIView) -> CGFloat {
        guard tabBar != nil else { return -10 }
        // The capsule normally starts about 48 pt above the safe-area bottom.
        // Move the row by the same distance as that edge, preserving its 10 pt gap.
        let capsuleTop = view.safeAreaInsets.bottom + 48
        return -58 + capsuleTop * (1 - tabBarHeightScale)
    }

    private func tabBarTransform(_ bar: UITabBar, hidden: Bool) -> CGAffineTransform {
        let scale = tabBarHeightScale
        // Keep the bar anchored to the bottom as its height changes.
        let bottomOffset = bar.bounds.height * (1 - scale) / 2
        let hiddenOffset = hidden ? bar.bounds.height + 40 : 0
        return CGAffineTransform(translationX: 0, y: bottomOffset + hiddenOffset)
            .scaledBy(x: 1, y: scale)
    }

    @objc func tabBarSet(_ call: CAPPluginCall) {
        let items = call.getArray("items", JSObject.self) ?? []
        let selected = call.getString("selected")
        DispatchQueue.main.async {
            guard let host = self.host else { call.resolve(); return }
            let compactRequested = call.getBool("compact")
            let compact = compactRequested == true && host.traitCollection.userInterfaceIdiom == .phone
            let compactChanged = compact != self.tabBarCompact
            let creatingBar = self.tabBar == nil
            let animate = !creatingBar && compactChanged && !UIAccessibility.isReduceMotionEnabled
            self.tabBarCompact = compact
            let bar: UITabBar
            if let existing = self.tabBar {
                bar = existing
            } else {
                bar = UITabBar()
                bar.delegate = self
                bar.translatesAutoresizingMaskIntoConstraints = false
                host.view.addSubview(bar)
                self.tabBarEdges = [
                    bar.leadingAnchor.constraint(equalTo: host.view.leadingAnchor),
                    host.view.trailingAnchor.constraint(equalTo: bar.trailingAnchor),
                ]
                NSLayoutConstraint.activate(self.tabBarEdges + [
                    bar.bottomAnchor.constraint(equalTo: host.view.bottomAnchor),
                ])
                self.tabBar = bar
                self.updateDocumentEdge(in: bar, edge: .bottom)
            }
            if let tint = call.getString("tint") { bar.tintColor = UIColor(hex: tint) }

            let ids = items.map { $0["id"] as? String ?? "" }
            self.tabSymbols = items.map { $0["symbol"] as? String ?? "circle" }
            let tabItems: [UITabBarItem] = items.enumerated().map { (i, it) in
                let symbol = it["symbol"] as? String ?? "circle"
                let image = self.tabImage(symbol, traits: host.traitCollection)
                let title = it["title"] as? String
                let item = UITabBarItem(title: compact ? nil : title, image: image, selectedImage: image)
                item.accessibilityLabel = title
                item.tag = i
                if let badge = it["badge"] as? Int, badge > 0 { item.badgeValue = badge > 99 ? "99+" : String(badge) }
                return item
            }
            // Пункты пересоздаём только когда сменился их состав — иначе при
            // каждом бейдже бар мигал бы выделением.
            let updateBar = {
                if ids != self.tabIds || bar.items?.count != tabItems.count {
                    bar.setItems(tabItems, animated: false)
                    self.tabIds = ids
                } else {
                    for (i, item) in tabItems.enumerated() {
                        let existing = bar.items?[i]
                        existing?.badgeValue = item.badgeValue
                        existing?.title = item.title
                        existing?.accessibilityLabel = item.accessibilityLabel
                        existing?.image = item.image
                        existing?.selectedImage = item.selectedImage
                    }
                }
                if let sel = selected, let i = ids.firstIndex(of: sel) { bar.selectedItem = bar.items?[i] }
                if compactChanged || (creatingBar && compactRequested != nil) {
                    // Leave room for the tab targets and the system capsule's margins.
                    let minimumWidth = CGFloat(tabItems.count) * 44 + 40
                    let inset = min(40, max(0, (host.view.bounds.width - minimumWidth) / 2))
                    for edge in self.tabBarEdges { edge.constant = compact ? inset : 0 }
                    self.barBottomConstraint?.constant = self.barBottomOffset(in: host.view)
                    self.updateBarBottomSize()
                    host.view.layoutIfNeeded()
                    bar.transform = self.tabBarTransform(bar, hidden: !bar.isUserInteractionEnabled)
                }
            }
            if animate {
                UIView.animate(withDuration: 0.22, delay: 0,
                               options: [.curveEaseOut, .beginFromCurrentState, .allowUserInteraction],
                               animations: updateBar)
            } else {
                updateBar()
            }
            call.resolve()
        }
    }

    @objc func tabBarHidden(_ call: CAPPluginCall) {
        let hidden = call.getBool("hidden") ?? false
        DispatchQueue.main.async {
            guard let bar = self.tabBar else { call.resolve(); return }
            guard bar.isUserInteractionEnabled == hidden else { call.resolve(); return }
            UIView.animate(withDuration: 0.25, delay: 0, options: [.curveEaseOut, .beginFromCurrentState]) {
                bar.transform = self.tabBarTransform(bar, hidden: hidden)
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
            if self.tabBarCompact {
                self.tabBarCompact = false
                self.barBottomConstraint?.constant = -10
                self.updateBarBottomSize()
            }
            self.tabBarEdges = []
            self.tabIds = []
            self.tabSymbols = []
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
    private let label = SoftEdgeTitleLabel()
    private let icon = UIImageView()
    private var loopSymbol: String?
    private var lastAxis: Axis?
    private var positionConstraints: [NSLayoutConstraint] = []

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
        label.lineBreakMode = .byClipping
        label.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
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
        loopSymbol = symbol
        label.textColor = .label
        icon.tintColor = accentIcon
            ? UIColor(red: 0x78/255, green: 0x6A/255, blue: 0xD7/255, alpha: 1) // акцент кабинета
            : .label
        refreshIcon(traits: traitCollection)
    }

    func refreshIcon(traits: UITraitCollection) {
        if let symbol = loopSymbol, let img = LoopNativeIcons.image(symbol, traits: traits) {
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
        NSLayoutConstraint.deactivate(positionConstraints)
        let horizontal: NSLayoutConstraint
        switch axis {
        case .leading: horizontal = leadingAnchor.constraint(equalTo: container.leadingAnchor)
        case .trailing: horizontal = trailingAnchor.constraint(equalTo: container.trailingAnchor)
        case .center: horizontal = centerXAnchor.constraint(equalTo: container.centerXAnchor)
        }
        positionConstraints = [centerYAnchor.constraint(equalTo: container.centerYAnchor), horizontal]
        NSLayoutConstraint.activate(positionConstraints)
    }
}

/// Кнопка стеклянного бара: длинная подпись гаснет фейдом у края (TEXT-01),
/// а не многоточием; стекло и шеврон остаются чёткими.
/// The same glass surface changes width, from the section circle to the
/// space between Search and the trailing edge of the screen bar.
private final class GlassSectionPicker: UIVisualEffectView {
    private unowned let row: UIStackView
    private let anchor: UIView
    private let search: UIView
    private let covered: [UIView]
    private let items: [JSObject]
    private let label: String
    private let traits: UITraitCollection
    private let onSelect: (String) -> Void
    private let trigger = UIButton(type: .system)
    private let choices = UIStackView()
    private var collapsed: [NSLayoutConstraint] = []
    private var expanded: [NSLayoutConstraint] = []
    private var selected: String
    private var isExpanded = false

    init(row: UIStackView, anchor: UIView, search: UIView, covered: [UIView],
         items: [JSObject], selected: String, label: String, traits: UITraitCollection,
         onSelect: @escaping (String) -> Void) {
        self.row = row
        self.anchor = anchor
        self.search = search
        self.covered = covered
        self.items = items
        self.selected = selected
        self.label = label
        self.traits = traits
        self.onSelect = onSelect
        let effect: UIVisualEffect
        if #available(iOS 26.0, *) {
            let glass = UIGlassEffect(style: .regular)
            glass.isInteractive = true
            effect = glass
        } else {
            effect = UIBlurEffect(style: .systemThinMaterial)
        }
        super.init(effect: effect)
    }

    required init?(coder: NSCoder) { return nil }

    func install() {
        translatesAutoresizingMaskIntoConstraints = false
        clipsToBounds = true
        layer.cornerRadius = 24
        layer.cornerCurve = .continuous
        trigger.translatesAutoresizingMaskIntoConstraints = false
        trigger.tintColor = .label
        trigger.addAction(UIAction { [weak self] _ in self?.setExpanded(true) }, for: .touchUpInside)
        contentView.addSubview(trigger)

        choices.translatesAutoresizingMaskIntoConstraints = false
        choices.distribution = .fillEqually
        for item in items {
            guard let id = item["id"] as? String else { continue }
            let title = item["title"] as? String ?? ""
            let symbol = item["symbol"] as? String ?? ""
            var config = UIButton.Configuration.plain()
            config.image = LoopNativeIcons.image(symbol, traits: traits)
            config.imagePlacement = .top
            config.imagePadding = 1
            config.contentInsets = .zero
            var text = AttributedString(title)
            text.font = .systemFont(ofSize: 10, weight: .medium)
            config.attributedTitle = text
            config.titleLineBreakMode = .byClipping
            let choice = UIButton(configuration: config)
            choice.accessibilityIdentifier = id
            choice.accessibilityLabel = title
            choice.layer.cornerRadius = 20
            choice.addAction(UIAction { [weak self] _ in
                guard let self, self.isExpanded else { return }
                self.selected = id
                self.updateSelection()
                self.setExpanded(false)
                self.onSelect(id)
            }, for: .touchUpInside)
            choices.addArrangedSubview(choice)
        }
        choices.alpha = 0
        choices.isUserInteractionEnabled = false
        choices.accessibilityElementsHidden = true
        contentView.addSubview(choices)
        collapsed = [leadingAnchor.constraint(equalTo: anchor.leadingAnchor),
                     trailingAnchor.constraint(equalTo: anchor.trailingAnchor)]
        expanded = [leadingAnchor.constraint(equalTo: search.trailingAnchor, constant: row.spacing),
                    trailingAnchor.constraint(equalTo: row.trailingAnchor)]
        NSLayoutConstraint.activate(collapsed + [
            topAnchor.constraint(equalTo: anchor.topAnchor),
            bottomAnchor.constraint(equalTo: anchor.bottomAnchor),
            trigger.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            trigger.widthAnchor.constraint(equalToConstant: 48),
            trigger.topAnchor.constraint(equalTo: contentView.topAnchor),
            trigger.bottomAnchor.constraint(equalTo: contentView.bottomAnchor),
            choices.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            choices.widthAnchor.constraint(equalTo: row.widthAnchor, constant: -48 - row.spacing),
            choices.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 2),
            choices.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -2),
        ])
        updateSelection()
    }

    private func updateSelection() {
        let item = items.first { $0["id"] as? String == selected }
        let symbol = item?["symbol"] as? String ?? "square.grid.2x2"
        trigger.setImage(LoopNativeIcons.image(symbol, traits: traits), for: .normal)
        trigger.accessibilityLabel = [label, item?["title"] as? String ?? ""].joined(separator: ": ")
        for case let choice as UIButton in choices.arrangedSubviews {
            let active = choice.accessibilityIdentifier == selected
            choice.accessibilityTraits = active ? [.button, .selected] : .button
            choice.backgroundColor = active ? UIColor.label.withAlphaComponent(0.10) : .clear
            choice.tintColor = .label
        }
    }

    func collapse() { setExpanded(false, feedback: false) }

    override func accessibilityPerformEscape() -> Bool {
        guard isExpanded else { return super.accessibilityPerformEscape() }
        collapse()
        return true
    }

    private func setExpanded(_ open: Bool, feedback: Bool = true) {
        guard isExpanded != open else { return }
        if feedback { UISelectionFeedbackGenerator().selectionChanged() }
        row.layoutIfNeeded()
        isExpanded = open
        NSLayoutConstraint.deactivate(open ? collapsed : expanded)
        NSLayoutConstraint.activate(open ? expanded : collapsed)
        trigger.isUserInteractionEnabled = !open
        trigger.accessibilityElementsHidden = open
        choices.isUserInteractionEnabled = open
        choices.accessibilityElementsHidden = !open
        for view in covered {
            view.isUserInteractionEnabled = !open
            view.accessibilityElementsHidden = open
        }
        let animations = {
            self.row.layoutIfNeeded()
            self.trigger.alpha = open ? 0 : 1
            self.choices.alpha = open ? 1 : 0
            self.covered.forEach { $0.alpha = open ? 0 : 1 }
        }
        if UIAccessibility.isReduceMotionEnabled {
            animations()
        } else {
            UIView.animate(withDuration: 0.34, delay: 0, usingSpringWithDamping: 0.86,
                           initialSpringVelocity: 0, options: [.beginFromCurrentState, .allowUserInteraction],
                           animations: animations)
        }
        if feedback && UIAccessibility.isVoiceOverRunning {
            UIAccessibility.post(notification: .layoutChanged,
                                 argument: open ? choices.arrangedSubviews.first { $0.accessibilityIdentifier == selected } : trigger)
        }
    }
}

private final class GlassBarButton: UIButton {
    override func layoutSubviews() {
        super.layoutSubviews()
        guard let label = titleLabel, label.bounds.width > 0 else { return }
        guard label.intrinsicContentSize.width > label.bounds.width + 0.5 else {
            label.layer.mask = nil
            return
        }
        let fade = CAGradientLayer()
        fade.frame = label.bounds
        fade.startPoint = CGPoint(x: 0, y: 0.5)
        fade.endPoint = CGPoint(x: 1, y: 0.5)
        fade.colors = [UIColor.black.cgColor, UIColor.black.cgColor, UIColor.clear.cgColor]
        fade.locations = [0, NSNumber(value: max(0, 1 - 18 / label.bounds.width)), 1]
        label.layer.mask = fade
    }
}

/// Fade only the title; the Loop glyph and native glass remain crisp.
private final class SoftEdgeTitleLabel: UILabel {
    override var text: String? { didSet { setNeedsLayout() } }
    override func layoutSubviews() {
        super.layoutSubviews()
        guard bounds.width > 0, intrinsicContentSize.width > bounds.width + 0.5 else {
            layer.mask = nil
            return
        }
        let fade = CAGradientLayer()
        fade.frame = bounds
        fade.startPoint = CGPoint(x: 0, y: 0.5)
        fade.endPoint = CGPoint(x: 1, y: 0.5)
        fade.colors = [UIColor.black.cgColor, UIColor.black.cgColor, UIColor.clear.cgColor]
        fade.locations = [0, NSNumber(value: max(0, 1 - 18 / bounds.width)), 1]
        layer.mask = fade
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

private struct GlassSheetRow {
    let id: String
    let title: String
    let detail: String?
    let caption: String?
    let checked: Bool?
    let unread: Bool
    let disclosure: Bool

    init?(_ values: JSObject) {
        guard let id = values["id"] as? String, let title = values["title"] as? String else { return nil }
        self.id = id
        self.title = title
        detail = values["detail"] as? String
        caption = values["caption"] as? String
        checked = values["checked"] as? Bool
        unread = values["unread"] as? Bool ?? false
        disclosure = values["disclosure"] as? Bool ?? false
    }
}

private struct GlassSheetSection {
    let title: String?
    let rows: [GlassSheetRow]
    let layout: String?

    init(_ values: JSObject) {
        title = values["title"] as? String
        layout = values["layout"] as? String
        rows = (values["rows"] as? [JSObject] ?? []).compactMap(GlassSheetRow.init)
    }
}

private struct GlassSheetContent {
    let title: String
    let empty: String?
    let glass: Bool
    let sections: [GlassSheetSection]
    let footer: GlassSheetRow?

    init(_ values: JSObject) {
        title = values["title"] as? String ?? ""
        empty = values["empty"] as? String
        glass = values["glass"] as? Bool ?? false
        sections = (values["sections"] as? [JSObject] ?? []).map(GlassSheetSection.init)
        footer = (values["footer"] as? JSObject).flatMap(GlassSheetRow.init)
    }
}

private final class GlassContentSheetModel: ObservableObject {
    @Published var content: GlassSheetContent
    init(content: GlassSheetContent) { self.content = content }
}

private struct GlassContentSheet: View {
    @ObservedObject var model: GlassContentSheetModel
    let onAction: (String) -> Void

    var body: some View {
        sheetContent
            .background {
                if model.content.glass {
                    Rectangle().fill(.regularMaterial).ignoresSafeArea()
                }
            }
    }

    @ViewBuilder private var sheetContent: some View {
        if #available(iOS 26.0, *) {
            scrollContent
                .safeAreaInset(edge: .top, spacing: 12) {
                    title.padding(.top, 24)
                }
                .safeAreaInset(edge: .bottom, spacing: 0) {
                    if let footer = model.content.footer {
                        footerButton(footer)
                            .buttonStyle(.glass)
                            .padding(.bottom, 8)
                    }
                }
                .scrollClipDisabled()
                .scrollEdgeEffectStyle(.soft, for: .top)
                .scrollEdgeEffectHidden(false, for: .top)
                .scrollEdgeEffectHidden(true, for: .bottom)
        } else {
            VStack(alignment: .leading, spacing: 12) {
                title
                scrollContent
                if let footer = model.content.footer {
                    footerButton(footer).buttonStyle(.bordered)
                }
            }
            .padding(.top, 24)
            .padding(.bottom, 8)
        }
    }

    private var title: some View {
        Text(model.content.title)
            .font(.title3.weight(.semibold))
            .accessibilityAddTraits(.isHeader)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 20)
    }

    private var scrollContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                if let empty = model.content.empty {
                    Text(empty)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, minHeight: 84)
                }
                ForEach(model.content.sections.indices, id: \.self) { index in
                    let section = model.content.sections[index]
                    VStack(alignment: .leading, spacing: 0) {
                        if let title = section.title {
                            Text(title)
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(.secondary)
                                .accessibilityAddTraits(.isHeader)
                                .padding(.leading, 12)
                        }
                        if section.layout == "segments" {
                            segments(section)
                        } else if section.layout == "actions" {
                            ForEach(section.rows, id: \.id) { action in
                                row(action).foregroundStyle(settingsTint)
                                Divider()
                            }
                        } else {
                            ForEach(section.rows, id: \.id, content: row)
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
        }
    }

    private func footerButton(_ footer: GlassSheetRow) -> some View {
        Button(footer.title) { onAction(footer.id) }
            .frame(maxWidth: .infinity, minHeight: 44)
            .padding(.horizontal, 20)
    }

    @Environment(\.colorScheme) private var colorScheme

    private var settingsTint: Color {
        colorScheme == .dark ? Color(red: 0.79, green: 0.72, blue: 1) : Color(red: 0.31, green: 0.21, blue: 0.66)
    }

    private func segments(_ section: GlassSheetSection) -> some View {
        HStack(spacing: 3) {
            ForEach(section.rows, id: \.id) { item in
                let selected = item.checked == true
                Button {
                    onAction(item.id)
                } label: {
                    Text(item.title)
                        .font(.subheadline.weight(selected ? .semibold : .regular))
                        .multilineTextAlignment(.center)
                        .foregroundStyle(selected ? settingsTint : .primary)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .padding(.horizontal, 3)
                        .background(selected ? settingsTint.opacity(colorScheme == .dark ? 0.23 : 0.15) : .clear,
                                    in: RoundedRectangle(cornerRadius: 12))
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(selected ? .isSelected : [])
            }
        }
        .padding(3)
        .background(Color.primary.opacity(0.08), in: RoundedRectangle(cornerRadius: 15))
        .padding(.top, 5)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(section.title ?? "")
    }

    private func row(_ row: GlassSheetRow) -> some View {
        Button { onAction(row.id) } label: {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(row.title).font(.body.weight(row.unread ? .semibold : .regular))
                    if let detail = row.detail, !detail.isEmpty {
                        Text(detail).font(.subheadline).foregroundStyle(.secondary)
                    }
                    if let caption = row.caption {
                        Text(caption).font(.caption).foregroundStyle(.secondary)
                    }
                }
                Spacer(minLength: 8)
                if row.checked == true { Image(systemName: "checkmark").foregroundStyle(.tint).accessibilityHidden(true) }
                if row.disclosure { Image(systemName: "chevron.right").font(.footnote).accessibilityHidden(true) }
                if row.unread { Circle().fill(Color.accentColor).frame(width: 7, height: 7).accessibilityHidden(true) }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .frame(minHeight: 44, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(row.checked == true ? .isSelected : [])
    }
}
