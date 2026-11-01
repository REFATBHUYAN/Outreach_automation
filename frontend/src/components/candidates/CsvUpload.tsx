import { useRef, useState } from 'react';
import { Button, UploadIcon } from '../ui';
import { API_URL } from '../../lib/api';

export function CsvUpload({ jobId }: { jobId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string>();
  const upload = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}/jobs/${jobId}/candidates/csv`, { method: 'POST', body: form });
    const body = await res.json();
    setMsg(res.ok ? `Importing ${body.rows} rows — progress appears in chat` : body.error);
  };
  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <Button size="sm" variant="outline" onClick={() => input.current?.click()}><UploadIcon /> Upload CSV</Button>
    </div>
  );
}
