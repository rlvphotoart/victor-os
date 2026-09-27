import AppKit
import Foundation

func generate(size: Int, filename: String) throws {
    guard let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
        let context = NSGraphicsContext(bitmapImageRep: bitmap) else { return }
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    let s = CGFloat(size)
    NSColor(calibratedRed: 0.09, green: 0.10, blue: 0.125, alpha: 1).setFill()
    NSBezierPath(roundedRect: NSRect(x: 0, y: 0, width: s, height: s), xRadius: s * 0.22, yRadius: s * 0.22).fill()
    let v = NSBezierPath()
    v.move(to: NSPoint(x: s * 0.25, y: s * 0.73))
    v.line(to: NSPoint(x: s * 0.49, y: s * 0.27))
    v.line(to: NSPoint(x: s * 0.75, y: s * 0.73))
    v.lineWidth = s * 0.085
    v.lineCapStyle = .round
    v.lineJoinStyle = .round
    NSColor(calibratedRed: 0.93, green: 0.94, blue: 0.95, alpha: 1).setStroke()
    v.stroke()
    NSColor(calibratedRed: 0.57, green: 0.64, blue: 0.96, alpha: 1).setFill()
    NSBezierPath(ovalIn: NSRect(x: s * 0.73, y: s * 0.22, width: s * 0.08, height: s * 0.08)).fill()
    context.flushGraphics()
    NSGraphicsContext.restoreGraphicsState()
    if let png = bitmap.representation(using: .png, properties: [:]) {
        try png.write(to: URL(fileURLWithPath: "public/\(filename)"))
    }
}

try generate(size: 192, filename: "pwa-192.png")
try generate(size: 512, filename: "pwa-512.png")
try generate(size: 180, filename: "apple-touch-icon.png")
