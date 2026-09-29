"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, RotateCcw, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  onFallbackToFile?: () => void;
}

export function LiveCameraModal({
  isOpen,
  onClose,
  onCapture,
  onFallbackToFile,
}: LiveCameraModalProps) {
  const { t, language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState(false);

  const stopTracks = useCallback((s: MediaStream | null) => {
    if (s) {
      s.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    setLoading(true);
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError(language === "en" ? "Your browser does not support camera access (WebRTC)." : "Browser Anda tidak mendukung akses kamera langsung (WebRTC).");
      setLoading(false);
      return;
    }

    try {
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setStream((prev) => {
        stopTracks(prev);
        return mediaStream;
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setLoading(false);
        };
      }
    } catch (err: unknown) {
      stopTracks(stream);
      setLoading(false);
      if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
        setError(language === "en" ? "Camera permission was denied. Please allow camera access in browser settings." : "Izin akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setError(language === "en" ? "No camera device found on your device." : "Perangkat kamera tidak ditemukan di perangkat Anda.");
      } else {
        setError(language === "en" ? "Failed to access camera. Make sure it is not in use by another app." : "Gagal mengakses kamera. Pastikan kamera tidak sedang dipakai aplikasi lain.");
      }
    }
  }, [stopTracks, stream, language]);

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopTracks(stream);
      setStream(null);
    }

    return () => {
      stopTracks(stream);
    };
  }, [isOpen, facingMode]);

  const triggerShutter = () => {
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setIsCapturing(false);
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `scan_${Date.now()}.jpg`, { type: "image/jpeg" });
          stopTracks(stream);
          setStream(null);
          onCapture(file);
          onClose();
        }
        setIsCapturing(false);
      },
      "image/jpeg",
      0.9
    );
  };

  const handleToggleFacing = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const handleClose = () => {
    stopTracks(stream);
    setStream(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in-0">
      <div className="relative flex flex-col w-full max-w-lg h-[92vh] max-h-[750px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
        {/* Header Bar */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-2 text-white">
            <Camera className="size-4 text-emerald-400" />
            <span className="text-xs font-semibold tracking-wide">{language === "en" ? "Live Receipt Camera" : "Live Scan Struk"}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleFacing}
              title={language === "en" ? "Flip Camera" : "Ganti Kamera"}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition active:scale-95"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              onClick={handleClose}
              title={t.common.close}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition active:scale-95"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Viewport Kamera */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {flash && <div className="absolute inset-0 z-30 bg-white opacity-80 transition-opacity" />}

          {loading && !error && (
            <div className="flex flex-col items-center gap-3 text-white/70">
              <Loader2 className="size-8 animate-spin text-emerald-500" />
              <p className="text-xs">{language === "en" ? "Connecting camera…" : "Menghubungkan kamera…"}</p>
            </div>
          )}

          {error ? (
            <div className="px-6 py-8 text-center flex flex-col items-center gap-3 text-white max-w-sm">
              <div className="size-12 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertCircle className="size-6" />
              </div>
              <p className="text-sm font-medium">{error}</p>
              <div className="mt-2 flex flex-col gap-2 w-full">
                {onFallbackToFile && (
                  <Button
                    onClick={() => {
                      handleClose();
                      onFallbackToFile();
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {language === "en" ? "Select File from Device" : "Pilih File dari Perangkat"}
                  </Button>
                )}
                <Button variant="ghost" onClick={handleClose} className="w-full text-white/70 hover:text-white">
                  {t.common.close}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder frame overlay */}
              {!loading && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6">
                  <div className="relative w-full max-w-[280px] h-[380px] rounded-xl border-2 border-emerald-500/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                    {/* Corner accents */}
                    <div className="absolute -top-1 -left-1 size-5 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
                    <div className="absolute -top-1 -right-1 size-5 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
                    <div className="absolute -bottom-1 -left-1 size-5 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
                    <div className="absolute -bottom-1 -right-1 size-5 border-b-4 border-r-4 border-emerald-400 rounded-br" />

                    <div className="absolute inset-x-0 -bottom-8 text-center">
                      <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
                        {language === "en" ? "Align receipt within frame" : "Posisikan struk di dalam kotak"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Shutter Controls Bar */}
        {!error && (
          <div className="relative z-20 flex items-center justify-around px-6 py-4 bg-gradient-to-t from-black via-black/80 to-transparent">
            <button
              onClick={handleClose}
              className="text-xs font-medium text-white/70 hover:text-white px-3 py-2"
            >
              {t.common.cancel}
            </button>

            {/* Shutter Button */}
            <button
              disabled={loading || isCapturing}
              onClick={triggerShutter}
              className="group relative flex items-center justify-center size-16 rounded-full border-4 border-white/90 p-1 transition active:scale-90 disabled:opacity-50"
            >
              <div className="size-full rounded-full bg-white group-hover:bg-emerald-400 transition" />
            </button>

            <button
              onClick={handleToggleFacing}
              className="text-xs font-medium text-white/70 hover:text-white flex items-center gap-1.5 px-3 py-2"
            >
              <RotateCcw className="size-3.5" />
              <span>{language === "en" ? "Flip" : "Putar"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
