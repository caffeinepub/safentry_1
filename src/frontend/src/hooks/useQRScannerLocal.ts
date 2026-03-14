import { useCallback, useEffect, useRef, useState } from "react";

export interface QRResult {
  data: string;
}

export interface QRScannerHook {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  startScanning: () => void;
  stopScanning: () => void;
  qrResults: QRResult[];
  isScanning: boolean;
  canStartScanning: boolean;
  error: string | null;
  isSupported: boolean;
}

export function useQRScannerLocal(): QRScannerHook {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [qrResults, setQrResults] = useState<QRResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isSupported =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  const startScanning = useCallback(async () => {
    if (!isSupported) {
      setError("QR tarama bu cihazda desteklenmiyor.");
      return;
    }
    setError(null);
    setQrResults([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsScanning(true);

      // Use BarcodeDetector if available
      if ("BarcodeDetector" in window) {
        // @ts-ignore - BarcodeDetector is not in all TS libs yet
        const detector = new BarcodeDetector({ formats: ["qr_code"] });
        scanIntervalRef.current = setInterval(async () => {
          const video = videoRef.current;
          if (!video || video.readyState < 2) return;
          try {
            const barcodes = await detector.detect(video);
            if (barcodes.length > 0) {
              setQrResults(
                barcodes.map((b: { rawValue: string }) => ({
                  data: b.rawValue,
                })),
              );
            }
          } catch {
            // ignore detection errors
          }
        }, 500);
      }
    } catch (e) {
      setError("Kamera erişimi reddedildi.");
      console.error(e);
    }
  }, [isSupported]);

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return {
    videoRef,
    canvasRef,
    startScanning,
    stopScanning,
    qrResults,
    isScanning,
    canStartScanning: isSupported,
    error,
    isSupported,
  };
}
