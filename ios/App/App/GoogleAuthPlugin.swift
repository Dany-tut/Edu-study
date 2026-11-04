import AuthenticationServices
import Capacitor

@objc(GoogleAuthPlugin)
public class GoogleAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "GoogleAuthPlugin"
    public let jsName = "GoogleAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise)
    ]
    private var session: ASWebAuthenticationSession?
    private var anchor: UIWindow?

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        // Retained for the lifetime of the authentication sheet.
        return anchor!
    }

    @objc func open(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.session == nil,
                  let window = self.bridge?.viewController?.view.window,
                  let value = call.getString("url"), let url = URL(string: value),
                  url.scheme == "https" else {
                call.reject("Не удалось открыть окно входа Google.")
                return
            }
            self.anchor = window
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: "iskra") { url, error in
                self.session = nil
                self.anchor = nil
                if let url = url {
                    call.resolve(["url": url.absoluteString])
                } else if (error as? ASWebAuthenticationSessionError)?.code == .canceledLogin {
                    call.resolve(["cancelled": true])
                } else {
                    call.reject("Не удалось загрузить страницу входа Google.", nil, error)
                }
            }
            self.session = session
            session.presentationContextProvider = self
            if !session.start() {
                self.session = nil
                self.anchor = nil
                call.reject("Не удалось начать вход через Google.")
            }
        }
    }

    @objc func cancel(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.session?.cancel()
            call.resolve()
        }
    }
}
