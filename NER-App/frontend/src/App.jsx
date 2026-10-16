import React, { useState } from 'react';
import { uploadDocument } from './api.js';
import DocumentView from './pages/DocumentView.jsx';
import { Upload } from "lucide-react";

export default function App() {
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true); setError('');
    try {
      const doc = await uploadDocument(file);
      setCurrent(doc);
    } catch (err) { setError(err.message); }
    setLoading(false);
    e.target.value = '';
  };

  const handleDocChange = (updatedDoc) => {
    setCurrent(updatedDoc);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                CSIO  NER Annotation 
              </h1>
              <p className="text-xs text-slate-500">
                
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              {sidebarCollapsed ? 'Show Documents Sidebar' : 'Hide Sidebar'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl p-6">
        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
            {error}
          </div>
        )}

        <div className={`grid gap-6 transition-all ${sidebarCollapsed ? 'grid-cols-1' : 'md:grid-cols-[18rem_1fr]'}`}>
          {/* Sidebar */}
          {!sidebarCollapsed && (
            <aside className="space-y-4">
              <label className="block cursor-pointer rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/40 p-5 text-center transition hover:bg-blue-50 hover:border-blue-400">
                <span className="block text-sm font-bold text-blue-700">
                  {loading ? 'Running NER model… please wait' : '+ Upload Document JSON'}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  Upload json file 
                </span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={onFile}
                  disabled={loading}
                />
              </label>
            </aside>
          )}

          {/* Main Stage */}
          <main className="min-w-0">
            {current ? (
              <DocumentView doc={current} onChange={handleDocChange} />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center shadow-xs">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 text-2xl font-bold">
                   <Upload/>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
            
                </h3>
                <p className="text-sm text-slate-500 max-w-md mb-6">
                  Upload a JSON file  to start line-by-line annotation.
                </p>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition">
                  Upload json Document 
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={onFile}
                    disabled={loading}
                  />
                </label>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
