import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { AnnotationProvider } from '/Users/arshsingh/WORK/NERPROJECT/NER-App/frontend/src/context/AnnotationContext.jsx';
import DocumentView from '/Users/arshsingh/WORK/NERPROJECT/NER-App/frontend/src/pages/DocumentView.jsx';
import TopHeaderBar from '/Users/arshsingh/WORK/NERPROJECT/NER-App/frontend/src/components/TopHeaderBar.jsx';

const TEXT = 'For wheat sown after mid-December, apply 55 kg DAP per acre at sowing.';

const annotateDoc = {
  _id: 'a1', filename: 'annotate.jsonl', kind: 'annotate', threshold: 0.75,
  stats: {}, segments: [{
    index: 0, text: TEXT, passageTag: 'PUN-0001', crops: ['WHEAT'], stages: ['Sowing'],
    section: 'WHEAT (Sowing)', nerStatus: 'skipped', entities: [], originalEntities: [],
    sourceRecord: { text: TEXT },
  }],
};

const validateDoc = {
  _id: 'v1', filename: 'validate.jsonl', kind: 'validate', threshold: 0.75,
  stats: {}, segments: [{
    index: 0, text: TEXT, passageTag: 'PUN-0001', section: 'PUN-0001',
    nerStatus: 'provided',
    entities: [
      { _id: 'e1', text: 'wheat', label: 'Crop', start: TEXT.indexOf('wheat'), end: TEXT.indexOf('wheat') + 5,
        confidence: 1, status: 'accepted', source: 'llm', validationStatus: 'unreviewed', originalLabel: 'Crop' },
      { _id: 'e2', text: 'DAP', label: 'Chemical', start: TEXT.indexOf('DAP'), end: TEXT.indexOf('DAP') + 3,
        confidence: 0.9, status: 'accepted', source: 'llm', validationStatus: 'unreviewed', originalLabel: 'Chemical' },
    ],
    originalEntities: [
      { text: 'wheat', label: 'Crop', start: TEXT.indexOf('wheat'), end: TEXT.indexOf('wheat') + 5, confidence: 1, source: 'llm' },
      { text: 'DAP', label: 'Chemical', start: TEXT.indexOf('DAP'), end: TEXT.indexOf('DAP') + 3, confidence: 0.9, source: 'llm' },
    ],
    sourceRecord: { text: TEXT, entities: [
      { text: 'wheat', type: 'Crop', start: TEXT.indexOf('wheat'), end: TEXT.indexOf('wheat') + 5, score: 1, sources: ['berta','llm'] },
      { text: 'DAP', type: 'Chemical', start: TEXT.indexOf('DAP'), end: TEXT.indexOf('DAP') + 3, score: 0.9, sources: ['llm'] },
    ]},
  }],
};

// An annotation passage as it really looks: several sentences, model spans
// already on it, and the model having run.
const TWO = 'For wheat sown after mid-December, apply 55 kg DAP per acre at sowing. '
  + 'Broadcast 45 kg urea for timely sown crops in Punjab during January.';
const taggedDoc = {
  _id: 't1', filename: 'tagged.jsonl', kind: 'annotate', threshold: 0.75,
  stats: {}, segments: [{
    index: 0, text: TWO, passageTag: 'PUN-0001', crops: ['WHEAT'], stages: ['Sowing'],
    section: 'WHEAT (Sowing)', nerStatus: 'done',
    entities: [
      { _id: 'm1', text: 'wheat', label: 'Crop', start: TWO.indexOf('wheat'), end: TWO.indexOf('wheat') + 5,
        confidence: 0.97, status: 'accepted', source: 'model' },
      { _id: 'm2', text: 'DAP', label: 'Chemical', start: TWO.indexOf('DAP'), end: TWO.indexOf('DAP') + 3,
        confidence: 0.9, status: 'accepted', source: 'model' },
      { _id: 'm3', text: 'urea', label: 'Chemical', start: TWO.indexOf('urea'), end: TWO.indexOf('urea') + 4,
        confidence: 0.93, status: 'accepted', source: 'model' },
    ],
    originalEntities: [],
    sourceRecord: { text: TWO },
  }],
};

/*
 * Attached to globalThis, not to a particular window: a test swaps in a fresh
 * jsdom for each case, and the mount reads the current global document when it
 * runs. The harness also owns the React instance and exposes act, so a test
 * never ends up with two copies of React.
 */
globalThis.__act = act;

globalThis.__mount = async (which) => {
  // 'header' mounts the top bar too, which is where Export lives.
  const withHeader = which.endsWith('+header');
  const kind = withHeader ? which.slice(0, -'+header'.length) : which;
  const doc = kind === 'validate' ? validateDoc : kind === 'tagged' ? taggedDoc : annotateDoc;
  const host = globalThis.document.getElementById('root');
  const root = createRoot(host);
  let current = JSON.parse(JSON.stringify(doc));
  const onChange = (next) => { current = next; render(); };
  const render = () => act(() => {
    root.render(
      <AnnotationProvider>
        {withHeader && <TopHeaderBar doc={current} onOpenUpload={() => {}} onTogglePreview={() => {}} />}
        <DocumentView doc={current} onChange={onChange} onOpenUpload={() => {}} />
      </AnnotationProvider>
    );
  });
  render();
  await act(async () => {});

  // Unmounting matters: React's scheduler holds an open handle, and a test run
  // would never exit with roots still mounted.
  const unmount = () => act(() => root.unmount());

  return { host, getDoc: () => current, unmount };
};
