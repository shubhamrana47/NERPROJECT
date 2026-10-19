/**
 * Reads back the file that was just saved, so what the interface reports is
 * what is actually on disk.
 *
 * The counts also arrive as X-Dataset-* response headers, but a browser hides
 * custom headers on a cross-origin request unless the server lists them in
 * Access-Control-Expose-Headers — which older deployments do not. Counting the
 * file itself needs no cooperation from the server.
 */
export function summariseAnnotatedJsonl(text) {
  let records = 0;
  let spans = 0;
  let verified = 0;
  let unreadable = 0;

  for (const line of String(text || '').split('\n')) {
    if (!line.trim()) continue;
    records += 1;
    try {
      const row = JSON.parse(line);
      const entities = Array.isArray(row.entities) ? row.entities : [];
      spans += entities.length;
      for (const e of entities) if (e && e.verified) verified += 1;
    } catch (_) {
      unreadable += 1;
    }
  }

  return { records, spans, verified, unreadable };
}

/** One plain sentence describing a saved export. */
export function describeExport(filename, { records, spans, verified }) {
  if (records === 0) return 'That export came out empty.';
  const head = `Saved ${filename} — ${records.toLocaleString()} ${
    records === 1 ? 'record' : 'records'
  }`;
  if (spans === 0) {
    return `${head}, with nothing annotated yet.`;
  }
  return `${head}, ${spans.toLocaleString()} ${spans === 1 ? 'span' : 'spans'}, ${
    verified === 0 ? 'none verified by hand yet' : `${verified.toLocaleString()} verified by hand`
  }.`;
}
