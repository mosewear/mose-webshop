'use client'

import { useCallback, useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE,
]

/**
 * Barcode / QR scan voor voorraad (Safari iOS, PWA, Chrome Android).
 * Gebruikt html5-qrcode (ZXing) — werkt waar BarcodeDetector ontbreekt.
 */
export function InventorySkuScan({ onSku }: { onSku: (sku: string) => void }) {
  const reactId = useId().replace(/:/g, '')
  const regionId = `inv-h5q-${reactId}`
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const startInFlightRef = useRef(false)
  const [scanning, setScanning] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const stopScanner = useCallback(async () => {
    startInFlightRef.current = false
    const s = scannerRef.current
    scannerRef.current = null
    if (s) {
      try {
        if (s.isScanning) {
          await s.stop()
        }
      } catch {
        /* already stopped */
      }
      try {
        s.clear()
      } catch {
        /* */
      }
    }
    setScanning(false)
  }, [])

  const startScanner = useCallback(async () => {
    if (startInFlightRef.current || scannerRef.current) return
    startInFlightRef.current = true
    setErr(null)
    flushSync(() => {
      setScanning(true)
    })

    try {
      const scanner = new Html5Qrcode(regionId, {
        verbose: false,
        formatsToSupport: BARCODE_FORMATS,
        useBarCodeDetectorIfSupported: true,
      })
      scannerRef.current = scanner

      let cameraConfig: string | MediaTrackConstraints
      try {
        const cameras = await Html5Qrcode.getCameras()
        if (cameras.length === 0) {
          cameraConfig = { facingMode: 'environment' }
        } else {
          const back = cameras.find((c) =>
            /back|rear|environment|wide|ultra/i.test(c.label)
          )
          cameraConfig = back
            ? { deviceId: { exact: back.id } }
            : { deviceId: { exact: cameras[cameras.length - 1].id } }
        }
      } catch {
        cameraConfig = { facingMode: 'environment' }
      }

      await scanner.start(
        cameraConfig,
        {
          fps: 8,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const w = Math.min(320, Math.floor(viewfinderWidth * 0.92))
            const h = Math.min(180, Math.floor(viewfinderHeight * 0.5))
            return { width: w, height: Math.max(80, h) }
          },
          aspectRatio: 1.777777778,
        },
        (decodedText) => {
          const t = decodedText?.trim()
          if (t) {
            onSku(t)
            void stopScanner()
          }
        },
        () => {}
      )
    } catch (e) {
      console.error('[InventorySkuScan]', e)
      setErr(
        'Camera niet beschikbaar of geweigerd. Geef toestemming via het slot-icoon in de adresbalk (Safari) of via Instellingen.'
      )
      await stopScanner()
    } finally {
      startInFlightRef.current = false
    }
  }, [onSku, regionId, stopScanner])

  const onToggle = () => {
    if (scanning) {
      void stopScanner()
    } else {
      void startScanner()
    }
  }

  return (
    <div className="flex flex-col gap-2 min-w-0 w-full sm:w-auto">
      <button
        type="button"
        onClick={onToggle}
        className="text-xs font-bold uppercase border-2 border-black px-3 py-2.5 bg-white active:bg-gray-100 whitespace-nowrap w-full sm:w-auto touch-manipulation min-h-[44px]"
      >
        {scanning ? 'Stop camera' : 'Scan barcode'}
      </button>
      <div
        id={regionId}
        className={
          scanning
            ? 'w-full max-w-sm mx-auto sm:mx-0 overflow-hidden rounded border-2 border-gray-800 bg-black min-h-[220px]'
            : 'hidden'
        }
        aria-hidden={!scanning}
      />
      {err && (
        <p className="text-xs text-orange-800 max-w-sm leading-snug">{err}</p>
      )}
    </div>
  )
}
