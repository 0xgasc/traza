"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

interface SignatureCaptureProps {
  onComplete: (signatureData: string) => void;
}

type TabMode = "draw" | "type";

interface FontOption {
  name: string;
  family: string;
  cssFont: string;
}

const SIGNATURE_FONTS: FontOption[] = [
  { name: "Elegant", family: "Dancing Script", cssFont: '"Dancing Script", cursive' },
  { name: "Classic", family: "La Belle Aurore", cssFont: '"La Belle Aurore", cursive' },
  { name: "Casual", family: "Caveat", cssFont: '"Caveat", cursive' },
  { name: "Bold", family: "Pacifico", cssFont: '"Pacifico", cursive' },
];

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=La+Belle+Aurore&family=Caveat:wght@700&family=Pacifico&display=swap";

export default function SignatureCapture({ onComplete }: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabMode>("draw");
  const [typedName, setTypedName] = useState("");
  const [selectedFont, setSelectedFont] = useState<FontOption>(SIGNATURE_FONTS[0]!);

  // Load Google Fonts once
  useEffect(() => {
    if (document.querySelector('link[data-sig-fonts]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_URL;
    link.setAttribute("data-sig-fonts", "true");
    document.head.appendChild(link);
  }, []);

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
      ctx.font = `64px ${selectedFont.cssFont}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedName, 300, 110);
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
              className="input w-full text-xl"
            />

            {/* Font picker */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {SIGNATURE_FONTS.map((font) => (
                <button
                  key={font.family}
                  onClick={() => setSelectedFont(font)}
                  className={`p-3 border-2 text-left transition-colors ${
                    selectedFont.family === font.family
                      ? "border-black bg-black text-white"
                      : "border-stone-200 bg-white text-black hover:border-black"
                  }`}
                >
                  <span className="block text-xs font-mono uppercase tracking-wide mb-1 opacity-60">
                    {font.name}
                  </span>
                  <span
                    style={{ fontFamily: font.cssFont, fontSize: "1.75rem", lineHeight: 1.2 }}
                  >
                    {typedName || "Signature"}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-xs text-stone-500 mt-3 font-mono">
              SELECT A STYLE ABOVE
            </p>
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
