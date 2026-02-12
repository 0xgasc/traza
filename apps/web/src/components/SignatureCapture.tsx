"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

interface SignatureCaptureProps {
  onComplete: (signatureData: string) => void;
}

type TabMode = "draw" | "type";

export default function SignatureCapture({ onComplete }: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabMode>("draw");
  const [typedName, setTypedName] = useState("");

  const getCanvas = useCallback(() => canvasRef.current, []);
  const getCtx = useCallback(() => {
    const canvas = getCanvas();
    return canvas ? canvas.getContext("2d") : null;
  }, [getCanvas]);

  useEffect(() => {
    const canvas = getCanvas();
    const ctx = getCtx();
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.lineCap = "square";
    ctx.lineJoin = "miter";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [getCanvas, getCtx, activeTab]);

  const getPosition = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = getCanvas();
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPosition(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPosition(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = getCanvas();
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    setHasDrawn(false);
  };

  const handleDone = () => {
    if (activeTab === "draw") {
      const canvas = getCanvas();
      if (!canvas || !hasDrawn) return;
      const dataUrl = canvas.toDataURL("image/png");
      onComplete(dataUrl);
    } else {
      if (!typedName.trim()) return;
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 200;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, 600, 200);
      ctx.fillStyle = "#000000";
      ctx.font = 'italic 48px "Inter", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedName, 300, 100);
      const dataUrl = canvas.toDataURL("image/png");
      onComplete(dataUrl);
    }
  };

  const drawDisabled = activeTab === "draw" ? !hasDrawn : !typedName.trim();
  const enabledClass = "bg-black text-white hover:bg-stone-900";
  const disabledClass = "bg-stone-200 text-stone-400 cursor-not-allowed";

  return (
    <div className="border-4 border-black bg-white">
      {/* Tabs */}
      <div className="flex border-b-4 border-black">
        <button
          onClick={() => setActiveTab("draw")}
          className={`flex-1 px-4 py-3 font-semibold uppercase text-sm tracking-wide transition-colors ${
            activeTab === "draw"
              ? "bg-black text-white"
              : "bg-white text-black hover:bg-stone-100"
          }`}
        >
          Draw
        </button>
        <button
          onClick={() => setActiveTab("type")}
          className={`flex-1 px-4 py-3 font-semibold uppercase text-sm tracking-wide transition-colors border-l-4 border-black ${
            activeTab === "type"
              ? "bg-black text-white"
              : "bg-white text-black hover:bg-stone-100"
          }`}
        >
          Type
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "draw" ? (
          <div>
            <canvas
              ref={canvasRef}
              className="w-full h-48 border-3 border-black cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <p className="text-xs text-stone-500 mt-2 font-mono">
              DRAW YOUR SIGNATURE ABOVE
            </p>
          </div>
        ) : (
          <div>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Type your full name"
              className="input w-full text-2xl italic"
            />
            {typedName && (
              <div className="mt-4 p-6 border-3 border-stone-200 bg-stone-50 text-center">
                <span className="text-3xl italic">{typedName}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex border-t-4 border-black">
        {activeTab === "draw" && (
          <button
            onClick={clearCanvas}
            className="flex-1 px-4 py-3 font-semibold uppercase text-sm tracking-wide bg-white text-black hover:bg-stone-100 transition-colors border-r-4 border-black"
          >
            Clear
          </button>
        )}
        <button
          onClick={handleDone}
          disabled={drawDisabled}
          className={`flex-1 px-4 py-3 font-semibold uppercase text-sm tracking-wide transition-colors ${
            drawDisabled ? disabledClass : enabledClass
          }`}
        >
          Done
        </button>
      </div>
    </div>
  );
}
