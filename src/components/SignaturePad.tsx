/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { cn } from '../lib/utils';
import trimCanvas from '../lib/trimCanvas';

interface SignaturePadProps {
  onSave: (base64: string) => void;
  onClear: () => void;
  className?: string;
}

export const SignaturePad = React.memo(({ onSave, onClear, className }: SignaturePadProps) => {
  const sigCanvas = useRef<SignatureCanvas>(null);

  const clear = () => {
    sigCanvas.current?.clear();
    onClear();
  };

  const save = () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) return;
    
    // Create a copy of the canvas to trim it without affecting the original
    const canvas = sigCanvas.current.getCanvas();
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
      <div className="border border-white/10 rounded-xl bg-white/5 backdrop-blur-md overflow-hidden">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="white"
          canvasProps={{
            className: "w-full h-48 cursor-crosshair",
          }}
          onEnd={save}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button
          onClick={clear}
          className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
        >
          Clear Signature
        </button>
      </div>
    </div>
  );
});
