// Чтение текста кадра через Apple Vision (локально, без сети).
//
// Собирается при сборке .app (scripts/buildTranscriptionMacInstaller.sh) в
// Contents/MacOS/IskraFrameText, приложение передаёт путь в ISKRA_FRAME_TEXT.
// У учителя swiftc не нужен.
//
// Режимы:
//   IskraFrameText              — один кадр (PNG/JPEG/PPM) из stdin → JSON-массив строк
//                                 (прежний формат slides.py, совместим со старыми модулями);
//   IskraFrameText --lines      — один кадр → JSON-массив строк с геометрией;
//   IskraFrameText --stream     — поток кадров PPM (P6) из stdin, на каждый — одна
//                                 строка JSON с геометрией; процесс живёт всё задание;
//   IskraFrameText --version    — «iskra-frame-text 2»: так модуль отличает этот
//                                 хелпер от старого (тот читал только латиницу).
//
// Геометрия — доли кадра, начало координат слева сверху (как в slide_chapters.py).
import Foundation
import Vision
import ImageIO
import CoreGraphics

let protocolVersion = 2

struct Line: Encodable {
    let text: String
    let x: Double
    let y: Double
    let width: Double
    let height: Double
    let confidence: Double
}

func recognize(_ image: CGImage) -> [Line] {
    let request = VNRecognizeTextRequest()
    // .fast распознаёт только латиницу: русский заголовок превращался в
    // «KneTorue». Русский поддерживает только .accurate (macOS 13+).
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["ru-RU", "en-US"]
    request.usesLanguageCorrection = true
    request.minimumTextHeight = 0.02
    do { try VNImageRequestHandler(cgImage: image).perform([request]) } catch { return [] }
    return (request.results ?? []).compactMap { observation in
        guard let best = observation.topCandidates(1).first, best.confidence >= 0.3 else { return nil }
        let box = observation.boundingBox
        return Line(text: best.string, x: Double(box.minX), y: Double(1 - box.maxY),
                    width: Double(box.width), height: Double(box.height), confidence: Double(best.confidence))
    }
}

// MARK: PPM (P6): ffmpeg отдаёт кадры без сжатия — так не кодируем PNG на каждый кадр.

final class Input {
    private let handle: FileHandle?
    private var buffer: Data

    init(handle: FileHandle? = FileHandle.standardInput, data: Data = Data()) {
        self.handle = handle
        self.buffer = data
    }

    private func fill(_ count: Int) -> Bool {
        while buffer.count < count {
            guard let chunk = handle?.availableData else { return false }
            if chunk.isEmpty { return false }
            buffer.append(chunk)
        }
        return true
    }

    private func take(_ count: Int) -> Data? {
        guard fill(count) else { return nil }
        let part = buffer.prefix(count)
        buffer.removeFirst(count)
        return Data(part)
    }

    private func token() -> String? {
        var bytes = [UInt8]()
        while true {
            guard let byte = take(1)?.first else { return bytes.isEmpty ? nil : String(bytes: bytes, encoding: .ascii) }
            if byte == 0x20 || byte == 0x0A || byte == 0x0D || byte == 0x09 {
                if bytes.isEmpty { continue }
                return String(bytes: bytes, encoding: .ascii)
            }
            bytes.append(byte)
            if bytes.count > 16 { return nil }
        }
    }

    /// nil — поток закончился; бросает при битом кадре.
    func nextPPM() throws -> CGImage? {
        guard let magic = token() else { return nil }
        guard magic == "P6", let w = token().flatMap(Int.init), let h = token().flatMap(Int.init),
              token() == "255", w > 0, h > 0, w * h <= 25_000_000,
              let body = take(w * h * 3), let provider = CGDataProvider(data: body as CFData),
              let image = CGImage(width: w, height: h, bitsPerComponent: 8, bitsPerPixel: 24, bytesPerRow: w * 3,
                                  space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGBitmapInfo(rawValue: 0),
                                  provider: provider, decode: nil, shouldInterpolate: false, intent: .defaultIntent)
        else { throw NSError(domain: "IskraFrameText", code: 2) }
        return image
    }
}

func decodeAny(_ bytes: Data) -> CGImage? {
    if bytes.starts(with: Array("P6".utf8)) {
        return try? Input(handle: nil, data: bytes).nextPPM()
    }
    guard let source = CGImageSourceCreateWithData(bytes as CFData, nil) else { return nil }
    return CGImageSourceCreateImageAtIndex(source, 0, nil)
}

let arguments = Set(CommandLine.arguments.dropFirst())
let encoder = JSONEncoder()
let out = FileHandle.standardOutput

// Vision text recognition sometimes hands work to the main queue and waits on
// it; running it on the main thread then deadlocks (seen in long streams).
// Work runs on a background queue, the main thread just services the queue.
func run() throws {

    if arguments.contains("--version") {
        out.write(Data("iskra-frame-text \(protocolVersion)\n".utf8))
        exit(0)
    }

    if arguments.contains("--stream") {
        let input = Input()
        do {
            while let image = try input.nextPPM() {
                var data = try encoder.encode(recognize(image))
                data.append(0x0A)
                out.write(data)
            }
        } catch { exit(2) }
        exit(0)
    }

    guard let image = decodeAny(FileHandle.standardInput.readDataToEndOfFile()) else { exit(2) }
    let lines = recognize(image)
    if arguments.contains("--lines") {
        out.write(try encoder.encode(lines))
    } else {
        out.write(try encoder.encode(lines.filter { $0.confidence >= 0.45 }.map(\.text)))
    }
    exit(0)
}

DispatchQueue.global(qos: .userInitiated).async {
    do { try run() } catch { exit(2) }
}
dispatchMain()
