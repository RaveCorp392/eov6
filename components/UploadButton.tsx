'use client';
import FileUploader from './FileUploader';

export default function UploadButton({ code }: { code: string; }) {
  return (
    <div className="panel">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <div><strong>File upload (beta)</strong></div>
          <div className="small">Allowed: images & PDF • Max 10 MB</div>
        </div>
      </div>
      <div style={{height:8}} />
      <FileUploader code={code} />
    </div>
  );
}
