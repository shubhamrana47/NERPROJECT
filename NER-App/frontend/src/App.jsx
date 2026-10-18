import React, { useState, useRef } from 'react';
import { uploadDocument, uploadDocumentWithoutNER } from './api.js';
import DocumentView from './pages/DocumentView.jsx';
import TopHeaderBar from './components/TopHeaderBar.jsx';
import { AnnotationProvider } from './context/AnnotationContext.jsx';

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
      <div className="flex min-h-screen flex-col">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.jsonl,application/json,application/x-jsonlines,text/plain"
          className="hidden"
          onChange={onFile}
          disabled={loading}
        />

        <TopHeaderBar
          doc={current}
          onOpenUpload={triggerUploadModal}
          onTogglePreview={() => setPreviewMode(!previewMode)}
          isPreviewOpen={previewMode}
        />

        {error && (
          <div className="mx-auto w-full max-w-[1560px] px-5 pt-5 lg:px-8">
            <div className="rounded-md border-l-2 border-hand bg-sheet px-4 py-3 text-[13px] text-ink">
              {error}
            </div>
          </div>
        )}

        {pendingFile && !loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-md border border-rule bg-sheet shadow-[0_24px_60px_-24px_rgba(28,38,33,0.45)]">
              <div className="border-b border-rule px-5 py-4">
                <h2 className="font-serif text-[20px] leading-tight text-ink">
                  How should this file start?
                </h2>
                <p className="mt-1 truncate text-[12.5px] text-ink-faint" title={pendingFile.name}>
                  {pendingFile.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleUploadChoice(true)}
                className="block w-full border-b border-rule px-5 py-4 text-left transition hover:bg-paper"
              >
                <span className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                  <span className="inline-block h-0 w-4 border-b-2 border-solid border-machine" />
                  Let the model read it first
                </span>
                <span className="mt-1 block text-[12.5px] leading-snug text-ink-soft">
                  Every sentence arrives pre-marked, and you correct what it got wrong.
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleUploadChoice(false)}
                className="block w-full border-b border-rule px-5 py-4 text-left transition hover:bg-paper"
              >
                <span className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                  <span className="inline-block h-0 w-4 border-b-2 border-dashed border-hand" />
                  Start from a clean sheet
                </span>
                <span className="mt-1 block text-[12.5px] leading-snug text-ink-soft">
                  No predictions. You mark every span yourself.
                </span>
              </button>

              <div className="px-5 py-3">
                <button
                  type="button"
                  onClick={cancelUpload}
                  className="text-[12.5px] text-ink-faint underline-offset-2 transition hover:text-ink hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm">
            <div className="rounded-md border border-rule bg-sheet px-6 py-5 text-center">
              <p className="font-serif text-[17px] text-ink">Reading the document</p>
              <p className="mt-1 text-[12.5px] text-ink-soft">
                Splitting it into sentences and marking entities. Large files take a minute.
              </p>
            </div>
          </div>
        )}

        {current ? (
          <DocumentView
            doc={current}
            onChange={handleDocChange}
            onOpenUpload={triggerUploadModal}
            previewMode={previewMode}
          />
        ) : (
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-16">
            <div className="rounded-md border border-rule bg-sheet px-7 py-9">
              <h1 className="font-serif text-[28px] leading-tight tracking-tight text-ink">
                Mark up an advisory, one line at a time
              </h1>
              <p className="mt-2.5 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-soft">
                Open a JSON or JSONL file of agricultural text. Each sentence comes up on its own,
                with 36 entity labels a keystroke away.
              </p>
              <button
                type="button"
                onClick={triggerUploadModal}
                className="mt-6 rounded-md bg-ink px-4 py-2 text-[13px] font-medium text-paper transition hover:bg-ink/90"
              >
                Open a file
              </button>
              <p className="mt-3 text-[11.5px] text-ink-faint">
                Takes <span className="font-mono">.json</span> and{' '}
                <span className="font-mono">.jsonl</span> files.
              </p>
            </div>
          </div>
        )}
      </div>
    </AnnotationProvider>
  );
}
