"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, LoaderCircle, X } from "lucide-react";
import { BrowserQRCodeReader } from "@zxing/browser";

type TicketQrScannerProps = {
  onDetected: (value: string) => void;
  onClose: () => void;
};

function getCameraError(error: unknown) {
  if (error instanceof Error && error.name === "InsecureContextError") {
    return "Camera access requires HTTPS or localhost. Open this page over a secure connection.";
  }
  if (error instanceof Error && error.name === "NotSupportedError") {
    return "This browser does not support camera access. Use a supported browser or enter the ticket ID manually.";
  }
  if (error instanceof Error && error.name === "NotAllowedError") {
    return "Camera permission was denied. Allow access for this site and use HTTPS (or localhost), then try again.";
  }
  if (error instanceof Error && error.name === "NotFoundError") {
    return "No camera was found on this device. You can enter the ticket ID manually.";
  }
  if (error instanceof Error && error.name === "NotReadableError") {
    return "The camera is busy in another app or browser tab. Close it there and try again.";
  }
  return "Could not start the camera. Check browser permissions and make sure no other app is using it.";
}

export default function TicketQrScanner({
  onDetected,
  onClose,
}: TicketQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let stopped = false;
    let scannerControls: { stop: () => void } | null = null;
    const reader = new BrowserQRCodeReader();
    const stopScanner = (controls = scannerControls) => {
      if (!controls || stopped) return;
      stopped = true;
      controls.stop();
    };

    void (async () => {
      if (!window.isSecureContext) {
        const error = new Error("Insecure camera context");
        error.name = "InsecureContextError";
        throw error;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        const error = new Error("Camera API unavailable");
        error.name = "NotSupportedError";
        throw error;
      }

      const video = videoRef.current;
      if (!video) throw new Error("Camera preview could not be initialized");

      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        },
        video,
        (result, _error, controls) => {
          if (!active || !result) return;

          active = false;
          stopScanner(controls);
          onDetected(result.getText());
        },
      );
      scannerControls = controls;
      if (!active) stopScanner(controls);
    })().catch((error: unknown) => {
      if (active) setCameraError(getCameraError(error));
    });

    return () => {
      active = false;
      stopScanner();
    };
  }, [onDetected]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
        <video
          ref={videoRef}
          aria-label="Live camera preview for scanning a ticket QR code"
          className="aspect-[4/3] w-full object-cover sm:aspect-video"
          muted
          autoPlay
          playsInline
        />
        {!cameraError && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative aspect-square w-[62%] max-w-64 rounded-2xl border-2 border-[#55DFFF]/90 shadow-[0_0_24px_rgba(85,223,255,0.2)]">
              <span className="absolute -left-0.5 -top-0.5 h-5 w-5 rounded-tl-xl border-l-4 border-t-4 border-[#55DFFF]" />
              <span className="absolute -right-0.5 -top-0.5 h-5 w-5 rounded-tr-xl border-r-4 border-t-4 border-[#55DFFF]" />
              <span className="absolute -bottom-0.5 -left-0.5 h-5 w-5 rounded-bl-xl border-b-4 border-l-4 border-[#55DFFF]" />
              <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-br-xl border-b-4 border-r-4 border-[#55DFFF]" />
            </div>
          </div>
        )}
      </div>

      {cameraError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-relaxed text-amber-100"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span>{cameraError}</span>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-xs text-slate-400" role="status">
          <LoaderCircle className="h-4 w-4 animate-spin text-[#55DFFF]" />
          Point the camera at the ticket QR code.
        </p>
      )}

      <button
        type="button"
        onClick={onClose}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
      >
        <X className="h-4 w-4" />
        {cameraError ? "Close scanner" : "Stop scanning"}
      </button>
    </div>
  );
}
