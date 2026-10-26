import React, { useState, useRef } from 'react';
import { uploadDocument, skipInference } from './api.js';
import DocumentView from './pages/DocumentView.jsx';
import TopHeaderBar from './components/TopHeaderBar.jsx';
import { AnnotationProvider } from './context/AnnotationContext.jsx';

export default function App() {
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [askModelChoice, setAskModelChoice] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef(null);

  /*
   * The file is uploaded first and classified by the API, which is what decides
   * the workflow. Only an annotation document is then asked about the model; a
   * file that arrives already annotated by the pipeline opens straight into
   * validation and is never offered a model option at all.
   */
  const onFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    setLoading(true);
    setError('');
    try {
      const doc = await uploadDocument(file);
      setCurrent(doc);
      setPreviewMode(false);
      if (doc.kind === 'validate') {
        setAskModelChoice(null);
      } else {
        setAskModelChoice(doc);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  /** Answered only for annotation documents, after the file is in. */
  const handleModelChoice = async (useModel) => {
    const doc = askModelChoice;
    setAskModelChoice(null);
    if (!doc || useModel) return;
    try {
      await skipInference(doc._id);
      setCurrent((prev) =>
        prev && prev._id === doc._id
          ? {
              ...prev,
              segments: (prev.segments || []).map((s) =>
                s.nerStatus === 'pending' ? { ...s, nerStatus: 'skipped' } : s
              ),
            }
          : prev
      );
    } catch (err) {
      setError(err.message);
    }
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

        {askModelChoice && !loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-md border border-rule bg-sheet shadow-[0_24px_60px_-24px_rgba(28,38,33,0.45)]">
              <div className="border-b border-rule px-5 py-4">
                <h2 className="font-serif text-[20px] leading-tight text-ink">
                  Should the model read this file?
                </h2>
                <p className="mt-1 truncate text-[12.5px] text-ink-faint" title={askModelChoice.filename}>
                  {askModelChoice.filename} — {(askModelChoice.segments || []).length} passages, ready now
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleModelChoice(true)}
                className="block w-full border-b border-rule px-5 py-4 text-left transition hover:bg-paper"
              >
                <span className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                  <span className="inline-block h-0 w-4 border-b-2 border-solid border-machine" />
                  Yes, suggest entities as I go
                </span>
                <span className="mt-1 block text-[12.5px] leading-snug text-ink-soft">
                  The model reads the passage you are on and the next few, so you correct rather
                  than start from nothing.
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleModelChoice(false)}
                className="block w-full px-5 py-4 text-left transition hover:bg-paper"
              >
                <span className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                  <span className="inline-block h-0 w-4 border-b-2 border-dashed border-hand" />
                  No, I will mark everything myself
                </span>
                <span className="mt-1 block text-[12.5px] leading-snug text-ink-soft">
                  No predictions at all.
                </span>
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm">
            <div className="rounded-md border border-rule bg-sheet px-6 py-5 text-center">
              <p className="font-serif text-[17px] text-ink">Reading the document</p>
              <p className="mt-1 text-[12.5px] text-ink-soft">
                Splitting it into passages and checking what it already contains.
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
                Open a JSON or JSONL file of agricultural text and mark up the entities, or open a
                file the pipeline has already tagged and validate what it found.
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
