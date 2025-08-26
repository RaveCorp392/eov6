'use client';

import React from 'react';
import FileUploader from './FileUploader';

type Props = {
  code: string;                    // session code
  role?: 'agent' | 'caller';       // who is uploading (used for chat message metadata)
  className?: string;
};

export default function UploadButton({ code, role = 'caller', className }: Props) {
  return (
    <div className={className}>
      <h3 className="mb-2 text-sm font-semibold text-white/90">File upload (beta)</h3>
      <p className="mb-2 text-xs text-white/60">Allowed: images & PDF • Max 10 MB</p>

      {/* Single input; progress/state handled inside FileUploader */}
      <FileUploader code={code} role={role} />
    </div>
  );
}
