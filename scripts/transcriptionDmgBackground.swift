// Фон окна установщика (DMG) «Искра · Расшифровка»: фирменный градиент Искры,
// заголовок, стрелка от приложения к «Программам», подпись «Перетащите…».
//   swift scripts/transcriptionDmgBackground.swift <out-dir>
// Пишет background.png (660×420) и background@2x.png; склейку в TIFF делает
// scripts/buildTranscriptionMacInstaller.sh (tiffutil). Раскладка иконок
// (tools/transcription-macos/dmg/DS_Store) рассчитана на эти координаты:
// приложение — центр (170, 205), «Программы» — центр (490, 205).
import AppKit

let width = 660, height = 420
let out = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ".")

func render(scale: Int) -> Data? {
    guard let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width * scale, pixelsHigh: height * scale,
                                        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                                        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0) else { return nil }
    bitmap.size = NSSize(width: width, height: height)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    let rect = NSRect(x: 0, y: 0, width: width, height: height)
    // --grad-purple: #9D8BFF → #6A5AE6 (135°). На нём читаются и чёрные, и белые
    // подписи Finder (светлая и тёмная тема системы).
    NSGradient(starting: NSColor(srgbRed: 0x9D / 255, green: 0x8B / 255, blue: 1, alpha: 1),
               ending: NSColor(srgbRed: 0x6A / 255, green: 0x5A / 255, blue: 0xE6 / 255, alpha: 1))?.draw(in: rect, angle: -35)

    let shadow = NSShadow()
    shadow.shadowColor = NSColor(srgbRed: 0.16, green: 0.10, blue: 0.40, alpha: 0.35)
    shadow.shadowOffset = NSSize(width: 0, height: -1)
    shadow.shadowBlurRadius = 6
    func text(_ string: String, size: CGFloat, weight: NSFont.Weight, alpha: CGFloat, y: CGFloat) {
        let attributes: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: size, weight: weight),
            .foregroundColor: NSColor.white.withAlphaComponent(alpha), .shadow: shadow]
        let value = NSAttributedString(string: string, attributes: attributes)
        value.draw(at: NSPoint(x: (CGFloat(width) - value.size().width) / 2, y: y))
    }
    text("Искра · Расшифровка", size: 26, weight: .bold, alpha: 1, y: CGFloat(height) - 72)
    text("Установка на Mac", size: 14, weight: .medium, alpha: 0.85, y: CGFloat(height) - 98)

    // Стрелка между иконками (центры по y = 205 от верха окна).
    let midY = CGFloat(height) - 205
    let arrow = NSBezierPath()
    arrow.move(to: NSPoint(x: 262, y: midY))
    arrow.line(to: NSPoint(x: 388, y: midY))
    arrow.lineWidth = 6
    arrow.lineCapStyle = .round
    let head = NSBezierPath()
    head.move(to: NSPoint(x: 372, y: midY + 16))
    head.line(to: NSPoint(x: 396, y: midY))
    head.line(to: NSPoint(x: 372, y: midY - 16))
    head.lineWidth = 6
    head.lineCapStyle = .round
    head.lineJoinStyle = .round
    NSGraphicsContext.current?.saveGraphicsState()
    shadow.set()
    NSColor.white.withAlphaComponent(0.95).setStroke()
    arrow.stroke()
    head.stroke()
    NSGraphicsContext.current?.restoreGraphicsState()

    text("Перетащите значок в папку «Программы»", size: 15, weight: .semibold, alpha: 1, y: 52)
    text("Потом откройте «Искра · Расшифровка» из «Программ»", size: 12, weight: .regular, alpha: 0.85, y: 30)
    NSGraphicsContext.restoreGraphicsState()
    return bitmap.representation(using: .png, properties: [:])
}

for (scale, name) in [(1, "background.png"), (2, "background@2x.png")] {
    guard let data = render(scale: scale) else { exit(1) }
    do { try data.write(to: out.appendingPathComponent(name)) } catch { exit(1) }
}
