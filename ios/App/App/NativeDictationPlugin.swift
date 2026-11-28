import AVFoundation
import Capacitor
import Speech

// Ответ голосом в приложении — системной диктовкой iOS (SFSpeechRecognizer),
// а не Web Speech: в WKWebView его нет. Бесплатно, на устройстве, где можно,
// и с пунктуацией (iOS 16+). Подход — из диктовки Taskly (Sources/Dictation.swift).
//
// ОДИН МИКРОФОН НА ДВОИХ. Тот же поток с микрофона идёт и в распознавание, и в
// файл .m4a — запись для учителя. getUserMedia в WebView параллельно не
// открываем: два владельца микрофона на iOS глушат друг друга.
//
// СОБЫТИЯ (jsName NativeDictation): dictationText {id, text} — живой текст
// целиком; dictationLevel {id, level 0…1} — уровень голоса для капсулы.
// stop() отдаёт {text, audio (base64), mime, sec}; cancel() — без результата.
@objc(NativeDictationPlugin)
public class NativeDictationPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeDictationPlugin"
    public let jsName = "NativeDictation"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise),
    ]

    private let engine = AVAudioEngine()
    private let audioQueue = DispatchQueue(label: "iskra.dictation.audio", qos: .userInteractive)
    private var recognizer: SFSpeechRecognizer?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var file: AVAudioFile?
    private var fileURL: URL?
    private var text = ""
    private var id = 0
    private var startedAt = Date()

    @objc func available(_ call: CAPPluginCall) {
        let lang = call.getString("lang") ?? "ru-RU"
        let r = SFSpeechRecognizer(locale: Locale(identifier: lang))
        call.resolve(["available": r != nil])
    }

    @objc func start(_ call: CAPPluginCall) {
        let lang = call.getString("lang") ?? "ru-RU"
        let id = call.getInt("id") ?? 0
        let keep = call.getBool("keep") ?? true
        Task { @MainActor in
            guard await Self.authorized() else {
                call.reject("Нет доступа к микрофону или распознаванию речи", "denied")
                return
            }
            self.teardown(deleteFile: true)
            guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: lang)), recognizer.isAvailable else {
                call.reject("Распознавание речи сейчас недоступно", "unavailable")
                return
            }
            self.recognizer = recognizer
            self.id = id
            self.text = ""
            self.startedAt = Date()

            let request = SFSpeechAudioBufferRecognitionRequest()
            request.shouldReportPartialResults = true
            if #available(iOS 16.0, *) { request.addsPunctuation = true }
            // На устройстве — без лимита в минуту и без сети. Где модели нет,
            // iOS распознаёт на своих серверах (тоже бесплатно).
            if recognizer.supportsOnDeviceRecognition { request.requiresOnDeviceRecognition = true }
            self.request = request

            let engine = self.engine
            self.audioQueue.async { [weak self] in
                do {
                    let session = AVAudioSession.sharedInstance()
                    try session.setCategory(.playAndRecord, mode: .measurement, options: [.duckOthers, .defaultToSpeaker, .allowBluetooth])
                    try session.setActive(true, options: .notifyOthersOnDeactivation)
                    let input = engine.inputNode
                    // Во время звонка вход отдаёт пустой формат — installTap на нём
                    // бросает исключение, которое не поймать.
                    let format = input.outputFormat(forBus: 0)
                    guard format.sampleRate > 0, format.channelCount > 0 else { throw CocoaError(.featureUnsupported) }

                    var audioFile: AVAudioFile?
                    var url: URL?
                    if keep {
                        let u = FileManager.default.temporaryDirectory.appendingPathComponent("dictation-\(UUID().uuidString).m4a")
                        let settings: [String: Any] = [
                            AVFormatIDKey: kAudioFormatMPEG4AAC,
                            AVSampleRateKey: format.sampleRate,
                            AVNumberOfChannelsKey: format.channelCount,
                            AVEncoderBitRateKey: 48_000,
                        ]
                        audioFile = try? AVAudioFile(forWriting: u, settings: settings,
                                                     commonFormat: format.commonFormat, interleaved: format.isInterleaved)
                        url = audioFile == nil ? nil : u
                    }

                    var lastMeter: TimeInterval = 0
                    input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
                        request.append(buffer)
                        try? audioFile?.write(from: buffer)
                        let now = ProcessInfo.processInfo.systemUptime
                        guard now - lastMeter >= 0.1, let samples = buffer.floatChannelData?[0], buffer.frameLength > 0 else { return }
                        lastMeter = now
                        var energy: Float = 0
                        for i in 0..<Int(buffer.frameLength) { let s = samples[i * buffer.stride]; energy += s * s }
                        let db = 10 * log10(max(energy / Float(buffer.frameLength), 1e-8))
                        let level = min(1, max(0, (db + 47) / 30))
                        DispatchQueue.main.async {
                            guard let self, self.request === request else { return }
                            self.notifyListeners("dictationLevel", data: ["id": id, "level": level])
                        }
                    }
                    engine.prepare()
                    try engine.start()
                    DispatchQueue.main.async {
                        guard let self, self.request === request else { return }
                        self.file = audioFile
                        self.fileURL = url
                        self.task = recognizer.recognitionTask(with: request) { [weak self] result, _ in
                            guard let said = result?.bestTranscription.formattedString else { return }
                            DispatchQueue.main.async {
                                guard let self, self.request === request || self.request == nil else { return }
                                self.text = said
                                self.notifyListeners("dictationText", data: ["id": id, "text": said])
                            }
                        }
                        call.resolve()
                    }
                } catch {
                    DispatchQueue.main.async {
                        self?.teardown(deleteFile: true)
                        call.reject("Микрофон занят или недоступен", "audio")
                    }
                }
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.request != nil else { call.resolve(["text": self.text]); return }
            let sec = max(1, Int(Date().timeIntervalSince(self.startedAt).rounded()))
            self.request?.endAudio()
            self.stopEngine()
            // Дать распознаванию дописать хвост — до 1,2 с, дальше отдаём что есть.
            let deadline = Date().addingTimeInterval(1.2)
            let request = self.request
            func finish() {
                let text = self.text
                self.task?.cancel()
                self.task = nil
                self.request = nil
                self.file = nil  // закрывает .m4a
                var out: [String: Any] = ["text": text, "sec": sec]
                if let url = self.fileURL, let data = try? Data(contentsOf: url), !data.isEmpty {
                    out["audio"] = data.base64EncodedString()
                    out["mime"] = "audio/mp4"
                }
                if let url = self.fileURL { try? FileManager.default.removeItem(at: url) }
                self.fileURL = nil
                call.resolve(out)
            }
            func poll() {
                if self.request !== request { return }
                if self.task?.state == .completed || self.task == nil || Date() > deadline { finish(); return }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { poll() }
            }
            poll()
        }
    }

    @objc func cancel(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.teardown(deleteFile: true)
            call.resolve()
        }
    }

    private func stopEngine() {
        let engine = engine
        audioQueue.async {
            if engine.isRunning { engine.stop() }
            engine.inputNode.removeTap(onBus: 0)
            try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        }
    }

    private func teardown(deleteFile: Bool) {
        request?.endAudio()
        task?.cancel()
        task = nil
        request = nil
        file = nil
        stopEngine()
        if deleteFile, let url = fileURL { try? FileManager.default.removeItem(at: url) }
        fileURL = nil
    }

    private static func authorized() async -> Bool {
        let speech: Bool
        switch SFSpeechRecognizer.authorizationStatus() {
        case .authorized: speech = true
        case .notDetermined:
            speech = await withCheckedContinuation { c in
                SFSpeechRecognizer.requestAuthorization { c.resume(returning: $0 == .authorized) }
            }
        default: speech = false
        }
        guard speech else { return false }
        return await withCheckedContinuation { c in
            AVAudioSession.sharedInstance().requestRecordPermission { c.resume(returning: $0) }
        }
    }
}
