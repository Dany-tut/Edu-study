// Иконка приложения расшифровки с плашкой версии в правом нижнем углу.
// Запускается из scripts/buildTranscriptionMacInstaller.sh при сборке .app:
//   swift scripts/transcriptionIconBadge.swift <icon.png> <версия> <out.png>
// Иконка лежит внутри приложения, поэтому после автообновления плашка
// меняется вместе с ним и всегда показывает установленную версию.
import AppKit

let args = CommandLine.arguments
guard args.count == 4, let source = NSImage(contentsOfFile: args[1]) else {
    FileHandle.standardError.write(Data("usage: transcriptionIconBadge <icon.png> <version> <out.png>\n".utf8))
    exit(2)
}
let version = args[2]
let side = 1024
guard let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: side, pixelsHigh: side, bitsPerSample: 8,
                                    samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                                    bytesPerRow: 0, bitsPerPixel: 0) else { exit(1) }
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
NSGraphicsContext.current?.imageInterpolation = .high
let full = NSRect(x: 0, y: 0, width: side, height: side)
source.draw(in: full, from: .zero, operation: .copy, fraction: 1)

// Плашка: тёмная капсула с белым текстом, читается и на светлом, и на тёмном фоне.
let font = NSFont.systemFont(ofSize: 150, weight: .heavy)
let text = NSAttributedString(string: version, attributes: [.font: font, .foregroundColor: NSColor.white])
let size = text.size()
let padX: CGFloat = 46, height: CGFloat = 210
let width = min(CGFloat(side) - 60, size.width + padX * 2)
let badge = NSRect(x: CGFloat(side) - width - 30, y: 30, width: width, height: height)
let capsule = NSBezierPath(roundedRect: badge, xRadius: height / 2, yRadius: height / 2)
NSColor(calibratedRed: 0.11, green: 0.09, blue: 0.20, alpha: 0.94).setFill()
capsule.fill()
NSColor.white.withAlphaComponent(0.9).setStroke()
capsule.lineWidth = 14
capsule.stroke()
text.draw(at: NSPoint(x: badge.midX - size.width / 2, y: badge.midY - size.height / 2 + 4))
NSGraphicsContext.restoreGraphicsState()

guard let png = bitmap.representation(using: .png, properties: [:]) else { exit(1) }
do { try png.write(to: URL(fileURLWithPath: args[3])) } catch { exit(1) }
