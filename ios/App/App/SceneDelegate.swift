import UIKit
import Capacitor

// UIScene-адаптация для iOS 26+ (см. Info.plist UIApplicationSceneManifest).
//
// Почему делегат, а не UISceneStoryboardFile: с одним лишь сторибордом в
// манифесте WebView Capacitor создавался и грузил страницу (DOM отрисован,
// размер верный), но окно на экран не выходило — чёрный экран. Здесь окно
// создаётся и показывается явно, корень — тот же MainViewController
// (подкласс CAPBridgeViewController, он же регистрирует наши плагины).
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = MainViewController()
        self.window = window
        window.makeKeyAndVisible()
        // Экран блокировки кодом и Face ID — своим окном поверх WebView (AppLock.swift).
        AppLockWindow.install(in: windowScene)
        self.scene(scene, openURLContexts: connectionOptions.urlContexts)
    }

    func scene(_ scene: UIScene, openURLContexts contexts: Set<UIOpenURLContext>) {
        for context in contexts {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url)
        }
    }
}
