import AVFoundation
import Capacitor
import UIKit

// Озвучка в приложении — системным синтезом iOS, а не Web Speech в WKWebView.
//
// ЗАЧЕМ. На части айфонов синтез в браузере проходит фразу целиком (onstart,
// onend, ошибок нет), а из динамика тишина любым голосом. Системное
// «Проговаривание» на тех же телефонах звучит — это AVSpeechSynthesizer, им и
// говорим. Нарезка на реплики, паузы и промотка остаются в src/lib/speech.ts:
// сюда приходит по одной реплике, а обещание speak() закрывается, когда она
// дочитана или оборвана.
//
// СОБЫТИЯ. speechStart — реплика ЗАЗВУЧАЛА (по нему стартует бегунок),
// speechWord — голос дошёл до слова: позиция в UTF-16, как charIndex у
// boundary в браузере, поэтому караоке-подсветка работает без пересчёта.
@objc(NativeSpeechPlugin)
public class NativeSpeechPlugin: CAPPlugin, CAPBridgedPlugin, AVSpeechSynthesizerDelegate {
    public let identifier = "NativeSpeechPlugin"
    public let jsName = "NativeSpeech"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]

    private let synth = AVSpeechSynthesizer()
    /// Реплика → её вызов и номер. Номер даёт JS, по нему он отсекает события
    /// уже отменённой речи.
    private var pending: [ObjectIdentifier: (call: CAPPluginCall, id: Int)] = [:]

    override public func load() {
        synth.delegate = self
    }

    @objc func speak(_ call: CAPPluginCall) {
        let text = call.getString("text") ?? ""
        let lang = call.getString("lang") ?? "en-US"
        let rate = call.getFloat("rate") ?? 1
        let name = call.getString("voice")
        let id = call.getInt("id") ?? 0
        DispatchQueue.main.async {
            // Задание на слух обязано звучать и при выключенном звонке: в
            // категории по умолчанию (soloAmbient) переключатель глушит синтез.
            let session = AVAudioSession.sharedInstance()
            try? session.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
            try? session.setActive(true)

            self.cancelAll()
            let u = AVSpeechUtterance(string: text)
            u.voice = Self.voice(for: lang, named: name)
            // Rate 1 в Web Speech — обычный темп, у AVSpeech обычный — 0.5.
            u.rate = min(AVSpeechUtteranceMaximumSpeechRate,
                         max(AVSpeechUtteranceMinimumSpeechRate, AVSpeechUtteranceDefaultSpeechRate * rate))
            self.pending[ObjectIdentifier(u)] = (call, id)
            self.synth.speak(u)
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.cancelAll()
            call.resolve()
        }
    }

    /// Оборвать речь. Обещания закрываем сами и сразу: на оборванной реплике
    /// система зовёт то didCancel, то didFinish, и «дочитана» врать не должно.
    private func cancelAll() {
        let cut = pending
        pending.removeAll()
        if synth.isSpeaking { synth.stopSpeaking(at: .immediate) }
        for p in cut.values { p.call.resolve(["done": false]) }
    }

    /// Голос под локаль: выбранный по имени, если он есть, иначе лучший по
    /// качеству (premium → enhanced → обычный), точная локаль впереди диалекта.
    /// Характерные голоса («Пузырьки», Grandpa) не берём никогда.
    static func voice(for locale: String, named name: String?) -> AVSpeechSynthesisVoice? {
        let want = locale.replacingOccurrences(of: "_", with: "-").lowercased()
        let lang = want.split(separator: "-").first.map(String.init) ?? want
        let all = AVSpeechSynthesisVoice.speechVoices().filter {
            ($0.language.lowercased().split(separator: "-").first.map(String.init) ?? "") == lang
        }
        let usable = all.filter { v in
            if #available(iOS 17.0, *) {
                return !v.voiceTraits.contains(.isNoveltyVoice)
            }
            return true
        }
        let rank: (AVSpeechSynthesisVoice) -> Int = { v in
            var q = v.quality.rawValue * 2
            if v.language.lowercased() == want { q += 1 }
            return q
        }
        if let name, !name.isEmpty,
           let hit = usable.filter({ $0.name == name }).max(by: { rank($0) < rank($1) }) {
            return hit
        }
        return usable.max(by: { rank($0) < rank($1) })
            ?? AVSpeechSynthesisVoice(language: locale)
    }

    private func close(_ u: AVSpeechUtterance, done: Bool) {
        guard let p = pending.removeValue(forKey: ObjectIdentifier(u)) else { return }
        p.call.resolve(["done": done])
    }

    public func speechSynthesizer(_ s: AVSpeechSynthesizer, didStart u: AVSpeechUtterance) {
        guard let p = pending[ObjectIdentifier(u)] else { return }
        notifyListeners("speechStart", data: ["id": p.id])
    }

    public func speechSynthesizer(_ s: AVSpeechSynthesizer, willSpeakRangeOfSpeechString range: NSRange, utterance u: AVSpeechUtterance) {
        guard let p = pending[ObjectIdentifier(u)] else { return }
        notifyListeners("speechWord", data: ["id": p.id, "char": range.location])
    }

    public func speechSynthesizer(_ s: AVSpeechSynthesizer, didFinish u: AVSpeechUtterance) {
        close(u, done: true)
    }

    public func speechSynthesizer(_ s: AVSpeechSynthesizer, didCancel u: AVSpeechUtterance) {
        close(u, done: false)
    }
}

/// Мост с нашим плагином: локальный плагин из папки приложения Capacitor сам
/// не находит, его регистрируют вручную (Main.storyboard ссылается на этот класс).
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeSpeechPlugin())
    }
}
