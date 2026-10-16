/** Client for the Python AI service + confidence routing. */
async function runNER(segments) {
  const aiUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
  if (!segments || segments.length === 0) return [];

  // Batch segments in chunks of 5 to avoid long requests exceeding proxy timeouts
  const BATCH_SIZE = 5;
  const allResults = [];

  for (let i = 0; i < segments.length; i += BATCH_SIZE) {
    const chunk = segments.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(`${aiUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments: chunk.map((s) => ({ id: s.index, text: s.text })) }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`AI service error ${res.status}: ${errText}`);
      }
      const data = await res.json();
      allResults.push(...(data.results || []));
    } catch (err) {
      if (err.cause && err.cause.code === 'ECONNREFUSED') {
        throw new Error(`AI Service is offline at ${aiUrl}. In local dev, please run 'npm run dev' to start all services.`);
      }
      throw err;
    }
  }

  return allResults;
}


/**
 * Confidence >= threshold -> 'accepted'; otherwise 'review'.
 * (Hook: the LLM verification step for 'review' entities plugs in here.)
 */
function routeEntity(e, threshold) {
  return { ...e, status: e.confidence >= threshold ? 'accepted' : 'review', source: 'model' };
}

function computeStats(segments) {
  const ents = segments.flatMap((s) => s.entities);
  const n = ents.length;
  return {
    totalEntities: n,
    autoAccepted: ents.filter((e) => e.status === 'accepted').length,
    needsReview: ents.filter((e) => e.status === 'review').length,
    avgConfidence: n ? +(ents.reduce((a, e) => a + e.confidence, 0) / n).toFixed(4) : 0,
  };
}

module.exports = { runNER, routeEntity, computeStats };
