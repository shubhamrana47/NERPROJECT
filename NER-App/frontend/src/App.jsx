import React, { useEffect, useState } from 'react';
import { uploadDocument, listDocuments, getDocument, deleteDocument } from './api.js';
import DocumentView from './pages/DocumentView.jsx';

export default function App() {
  const [docs, setDocs] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = () => listDocuments().then(setDocs).catch((e) => setError(e.message));
  useEffect(() => { refresh(); }, []);

  const onFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true); setError('');
    try {
      setCurrent(await uploadDocument(file));
      refresh();
    } catch (err) { setError(err.message); }
    setLoading(false);
    e.target.value = '';
  };

  const open = async (id) => {
    try { setCurrent(await getDocument(id)); } catch (e) { setError(e.message); }
  };
  const remove = async (id) => {
    await deleteDocument(id);
    if (current?._id === id) setCurrent(null);
    refresh();
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">CSIO Annotation Tool</h1>
      {error && <div className="mb-4 rounded bg-red-100 p-3 text-red-700">{error}</div>}
      <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
        <aside className="space-y-4">
          <label className="block cursor-pointer rounded-lg border-2 border-dashed border-indigo-300 bg-white p-4 text-center text-indigo-600 hover:bg-indigo-50">
            {loading ? 'Running NER model… please wait' : 'Upload JSON file'}
            <input type="file" accept=".json,application/json" className="hidden" onChange={onFile} disabled={loading} />
          </label>
          <div className="rounded-lg bg-white p-3 shadow">
            <h2 className="mb-2 font-semibold text-slate-700">Saved documents</h2>
            {docs.length === 0 && <p className="text-sm text-slate-400">None yet</p>}
            <ul className="space-y-1">
              {docs.map((d) => (
                <li key={d._id} className={`flex items-center justify-between rounded p-2 text-sm ${current?._id === d._id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                  <button className="truncate text-left" onClick={() => open(d._id)}>
                    {d.filename}
                    <span className="block text-xs text-slate-400">{d.stats?.totalEntities} entities</span>
                  </button>
                  <button className="ml-2 text-red-500" onClick={() => remove(d._id)}>✕</button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <main>
          {current ? <DocumentView doc={current} onChange={setCurrent} /> : (
            <p className="rounded-lg bg-white p-10 text-center text-slate-400 shadow">Upload or select a document to begin.</p>
          )}
        </main>
      </div>
    </div>
  );
}
