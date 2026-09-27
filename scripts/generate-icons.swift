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
    NSColor(calibratedRed: 0.063, green: 0.09, blue: 0.075, alpha: 1).setFill()
    NSBezierPath(roundedRect: NSRect(x: 0, y: 0, width: s, height: s), xRadius: s * 0.16, yRadius: s * 0.16).fill()
    let rule = NSBezierPath()
    rule.move(to: NSPoint(x: s * 0.18, y: s * 0.84))
    rule.line(to: NSPoint(x: s * 0.82, y: s * 0.84))
    rule.move(to: NSPoint(x: s * 0.18, y: s * 0.16))
    rule.line(to: NSPoint(x: s * 0.82, y: s * 0.16))
    rule.lineWidth = s * 0.015
    NSColor(calibratedRed: 0.20, green: 0.25, blue: 0.22, alpha: 1).setStroke()
    rule.stroke()
    let v = NSBezierPath()
    v.move(to: NSPoint(x: s * 0.25, y: s * 0.69))
    v.line(to: NSPoint(x: s * 0.50, y: s * 0.25))
    v.line(to: NSPoint(x: s * 0.75, y: s * 0.69))
    v.lineWidth = s * 0.07
    v.lineCapStyle = .square
    v.lineJoinStyle = .miter
    NSColor(calibratedRed: 0.925, green: 0.94, blue: 0.90, alpha: 1).setStroke()
    v.stroke()
    let seam = NSBezierPath()
    seam.move(to: NSPoint(x: s * 0.69, y: s * 0.25))
    seam.line(to: NSPoint(x: s * 0.79, y: s * 0.25))
    seam.line(to: NSPoint(x: s * 0.79, y: s * 0.35))
    seam.lineWidth = s * 0.025
    NSColor(calibratedRed: 0.86, green: 0.64, blue: 0.48, alpha: 1).setStroke()
    seam.stroke()
    context.flushGraphics()
    NSGraphicsContext.restoreGraphicsState()
    if let png = bitmap.representation(using: .png, properties: [:]) {
        try png.write(to: URL(fileURLWithPath: "public/\(filename)"))
    }
}

try generate(size: 192, filename: "pwa-192.png")
try generate(size: 512, filename: "pwa-512.png")
try generate(size: 180, filename: "apple-touch-icon.png")
