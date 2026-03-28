/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '../lib/utils';
import trimCanvas from '../lib/trimCanvas';

interface SignaturePadProps {
  onSave: (base64: string) => void;
  onClear: () => void;
  className?: string;
}

export const SignaturePad = React.memo(({ onSave, onClear, className }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const { width, height } = container.getBoundingClientRect();
    
    // Only resize if dimensions actually changed to avoid unnecessary clears
    if (canvas.width === width * window.devicePixelRatio && canvas.height === height * window.devicePixelRatio) {
      return;
    }

    // Save current content to restore after resize
    let tempCanvas: HTMLCanvasElement | null = null;
    if (!isEmpty) {
      tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, 0);
      }
    }

    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      
      if (tempCanvas && !isEmpty) {
        ctx.drawImage(tempCanvas, 0, 0, width, height);
      }
    }
  }, [isEmpty]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Only allow left mouse button or touch/pen
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    setIsDrawing(true);
    setIsEmpty(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // Capture pointer to continue drawing even if it leaves the canvas
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      save();
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onClear();
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;

    // Create a copy to trim so we don't modify the visible canvas
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const ctx = copy.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, 0);
      const trimmed = trimCanvas(copy);
      const base64 = trimmed.toDataURL('image/png');
      if (base64) onSave(base64);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div 
        ref={containerRef}
        className="border border-white/10 rounded-xl bg-white/5 backdrop-blur-md overflow-hidden h-48 relative touch-none"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          className="w-full h-full cursor-crosshair"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={clear}
          className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
        >
          Clear Signature
        </button>
      </div>
    </div>
  );
});
