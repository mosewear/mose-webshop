'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type BarcodeDetectorCtor = new (opts: { formats: string[] }) => {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>
}

/**
 * Mobile-friendly: optional BarcodeDetector + manual SKU filter helper.
 */
export function InventorySkuScan(props: { onSku: (sku: string) => void }) {
  const [scanning, setScanning] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }, [])

  useEffect(() => () => stop(), [stop])

  const startScan = async () => {
    const BD = (typeof window !== 'undefined'
      ? (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
      : undefined) as BarcodeDetectorCtor | undefined
    if (!BD) {
      setErr('Geen barcode-scanner in deze browser. Gebruik het zoekveld.')
      return
    }
    setErr(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      const v = videoRef.current
      if (v) {
        v.srcObject = stream
        await v.play()
      }
      setScanning(true)
      const detector = new BD({ formats: ['code_128', 'ean_13', 'ean_8', 'upc_a', 'qr_code'] })

      const tick = async () => {
        const video = videoRef.current
        if (!video || video.readyState < 2) {
          rafRef.current = requestAnimationFrame(tick)
          return
        }
        try {
          const codes = await detector.detect(video)
          if (codes.length > 0 && codes[0].rawValue) {
            props.onSku(codes[0].rawValue.trim())
            stop()
            return
          }
        } catch {
          /* ignore frame errors */
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      setErr('Camera niet beschikbaar of geweigerd.')
      setScanning(false)
    }
  }

  const hasDetector =
    typeof window !== 'undefined' &&
    typeof (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector !== 'undefined'

  return (
    <div className="flex flex-col gap-1 min-w-0">
      {hasDetector && (
        <button
          type="button"
          onClick={() => (scanning ? stop() : void startScan())}
          className="text-xs font-bold uppercase border-2 border-black px-3 py-2 bg-white hover:bg-gray-50 whitespace-nowrap"
        >
          {scanning ? 'Stop camera' : 'Scan barcode'}
        </button>
      )}
      {scanning && (
        <div className="relative w-full max-w-[200px] aspect-video bg-black rounded overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        </div>
      )}
      {err && <p className="text-xs text-orange-700 max-w-[200px]">{err}</p>}
    </div>
  )
}
