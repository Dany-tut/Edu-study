import AuthenticationServices
import Capacitor
import UIKit

// Ключ доступа (passkey) в приложении.
//
// ЗАЧЕМ. Страница приложения открыта с capacitor://localhost, а WebAuthn в
// WKWebView работает только на домене из Associated Domains, поэтому
// navigator.credentials здесь не годится. Запрос и проверку делает supabase-js
// (src/lib/passkey.ts) двумя шагами, а сюда приходят только параметры
// системного окна — и обратно уходит ответ ключа в том же JSON, что отдал бы
// браузер (AuthenticationResponseJSON / RegistrationResponseJSON).
//
// Домен ключа — rpId из ответа Supabase. Для него нужны entitlement
// `webcredentials:edu-study-app.vercel.app` (App.entitlements) и файл
// /.well-known/apple-app-site-association на сайте.
@objc(PasskeyPlugin)
public class PasskeyPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "PasskeyPlugin"
    public let jsName = "IskraPasskey"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "register", returnType: CAPPluginReturnPromise),
    ]

    private var pending: CAPPluginCall?
    private var controller: ASAuthorizationController?

    @objc func authenticate(_ call: CAPPluginCall) {
        guard let options = call.getObject("options"),
              let challenge = (options["challenge"] as? String).flatMap(Data.init(base64URL:)),
              let rpId = options["rpId"] as? String else {
            call.reject("Неверные параметры входа", "invalid_options"); return
        }
        let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: rpId)
        let request = provider.createCredentialAssertionRequest(challenge: challenge)
        let allowed = (options["allowCredentials"] as? [[String: Any]] ?? []).compactMap { ($0["id"] as? String).flatMap(Data.init(base64URL:)) }
        if !allowed.isEmpty {
            request.allowedCredentials = allowed.map { ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: $0) }
        }
        request.userVerificationPreference = Self.verification(options["userVerification"] as? String)
        start(request, call)
    }

    @objc func register(_ call: CAPPluginCall) {
        guard let options = call.getObject("options"),
              let challenge = (options["challenge"] as? String).flatMap(Data.init(base64URL:)),
              let rp = options["rp"] as? [String: Any], let rpId = rp["id"] as? String,
              let user = options["user"] as? [String: Any],
              let userId = (user["id"] as? String).flatMap(Data.init(base64URL:)) else {
            call.reject("Неверные параметры ключа", "invalid_options"); return
        }
        let name = (user["name"] as? String) ?? (user["displayName"] as? String) ?? "Искра"
        let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: rpId)
        let request = provider.createCredentialRegistrationRequest(challenge: challenge, name: name, userID: userId)
        if let selection = options["authenticatorSelection"] as? [String: Any] {
            request.userVerificationPreference = Self.verification(selection["userVerification"] as? String)
        }
        if #available(iOS 17.4, *) {
            let excluded = (options["excludeCredentials"] as? [[String: Any]] ?? []).compactMap { ($0["id"] as? String).flatMap(Data.init(base64URL:)) }
            if !excluded.isEmpty { request.excludedCredentials = excluded.map { ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: $0) } }
        }
        start(request, call)
    }

    private func start(_ request: ASAuthorizationRequest, _ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.pending?.reject("Отменено новым запросом", "cancelled")
            self.pending = call
            // Системное окно ключа делает приложение неактивным — шторку блокировки не показываем.
            AppLock.shared.systemPromptBegan()
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            self.controller = controller
            controller.performRequests()
        }
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        bridge?.webView?.window ?? UIApplication.shared.connectedScenes.compactMap { ($0 as? UIWindowScene)?.windows.first { $0.isKeyWindow } }.first ?? ASPresentationAnchor()
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        defer { finish() }
        guard let call = pending else { return }
        if let assertion = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialAssertion {
            let id = assertion.credentialID.base64URL
            var response: [String: Any] = [
                "clientDataJSON": assertion.rawClientDataJSON.base64URL,
                "authenticatorData": assertion.rawAuthenticatorData.base64URL,
                "signature": assertion.signature.base64URL,
            ]
            if !assertion.userID.isEmpty { response["userHandle"] = assertion.userID.base64URL }
            call.resolve(["credential": ["id": id, "rawId": id, "type": "public-key", "response": response,
                                         "clientExtensionResults": [String: Any](), "authenticatorAttachment": "platform"]])
        } else if let registration = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialRegistration {
            guard let attestation = registration.rawAttestationObject else {
                call.reject("Ключ не вернул данные", "no_attestation"); return
            }
            let id = registration.credentialID.base64URL
            call.resolve(["credential": ["id": id, "rawId": id, "type": "public-key",
                                         "response": ["clientDataJSON": registration.rawClientDataJSON.base64URL,
                                                      "attestationObject": attestation.base64URL,
                                                      "transports": ["internal", "hybrid"]],
                                         "clientExtensionResults": [String: Any](), "authenticatorAttachment": "platform"]])
        } else {
            call.reject("Неизвестный ответ ключа", "unknown_credential")
        }
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        defer { finish() }
        guard let call = pending else { return }
        let code = (error as? ASAuthorizationError)?.code
        if code == .canceled { call.reject("cancelled", "cancelled"); return }
        // Ключа на устройстве нет или домен не подтверждён (apple-app-site-association).
        call.reject(error.localizedDescription, code == .failed ? "failed" : "error")
    }

    private func finish() {
        pending = nil
        controller = nil
        AppLock.shared.systemPromptEnded()
    }

    private static func verification(_ value: String?) -> ASAuthorizationPublicKeyCredentialUserVerificationPreference {
        switch value {
        case "required": return .required
        case "discouraged": return .discouraged
        default: return .preferred
        }
    }
}

extension Data {
    init?(base64URL: String) {
        var s = base64URL.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while s.count % 4 != 0 { s += "=" }
        self.init(base64Encoded: s)
    }

    var base64URL: String {
        base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }
}
