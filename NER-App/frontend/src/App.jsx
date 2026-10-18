import React, { useState, useRef } from 'react';
import { uploadDocument, uploadDocumentWithoutNER } from './api.js';
import DocumentView from './pages/DocumentView.jsx';
import TopHeaderBar from './components/TopHeaderBar.jsx';
import { AnnotationProvider } from './context/AnnotationContext.jsx';
import { Upload, Cpu, PenTool } from 'lucide-react';

export default function App() {
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef(null);

  const onFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingFile(file);
    e.target.value = '';
  };

  const handleUploadChoice = async (withNER) => {
    if (!pendingFile) return;
    setLoading(true);
    setError('');
    try {
      const doc = withNER
        ? await uploadDocument(pendingFile)
        : await uploadDocumentWithoutNER(pendingFile);
      setCurrent(doc);
      setPreviewMode(false);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
    setPendingFile(null);
  };

  const cancelUpload = () => {
    setPendingFile(null);
  };

  const handleDocChange = (updatedDoc) => {
    setCurrent(updatedDoc);
  };

  const triggerUploadModal = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <AnnotationProvider>
      <div className="min-h-screen bg-[#FBFBFA] text-slate-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-950">
        {/* Hidden file input for header/sidebar upload buttons */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.jsonl,application/json,application/x-jsonlines,text/plain"
          className="hidden"
          onChange={onFile}
          disabled={loading}
        />

        {/* Top Header Bar matching design.png */}
        <TopHeaderBar
          doc={current}
          onOpenUpload={triggerUploadModal}
          onTogglePreview={() => setPreviewMode(!previewMode)}
          isPreviewOpen={previewMode}
        />

        {/* Main Content Area */}
        <div className="mx-auto max-w-[1560px] p-6 lg:p-8">
          {error && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
              {error}
            </div>
          )}

          {/* Upload Choice Modal */}
          {pendingFile && !loading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Processing Option</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Choose how to process <span className="font-semibold text-slate-700">{pendingFile.name}</span>
                </p>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => handleUploadChoice(true)}
                    className="flex items-center gap-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/60 p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer group"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-xs">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-900">Run NER Model</div>
                      <div className="text-xs text-slate-500">Auto-detect entities using the trained model, then review and correct</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUploadChoice(false)}
                    className="flex items-center gap-4 rounded-xl border-2 border-slate-200 bg-slate-50/60 p-4 text-left transition hover:border-slate-400 hover:bg-slate-100 cursor-pointer group"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white shadow-xs">
                      <PenTool className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-slate-950">Without NER Model</div>
                      <div className="text-xs text-slate-500">Skip auto-detection and annotate all entities manually from scratch</div>
                    </div>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={cancelUpload}
                  className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {loading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <div className="rounded-2xl bg-white p-8 shadow-2xl border border-slate-200 text-center">
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-800 border-t-transparent" />
                <p className="text-sm font-bold text-slate-900">Processing document…</p>
                <p className="text-xs text-slate-500 mt-1">Extracting sentences and detecting entities</p>
              </div>
            </div>
          )}

          {current ? (
            /* Document Loaded: 3-Column Studio Workspace */
            <DocumentView
              doc={current}
              onChange={handleDocChange}
              onOpenUpload={triggerUploadModal}
              previewMode={previewMode}
            />
          ) : (
            /* Empty State: Clean upload prompt matching Fieldnote aesthetic */
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-16 text-center shadow-xs max-w-xl mx-auto my-12">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 text-2xl font-bold">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Start Document Annotation
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
                Upload agricultural research papers or advisories in JSON / JSONL format to start interactive line-by-line precision curation.
              </p>
              <button
                type="button"
                onClick={triggerUploadModal}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-900 transition"
              >
                Upload JSON / JSONL Document
              </button>
            </div>
          )}
        </div>
      </div>
    </AnnotationProvider>
  );
}
