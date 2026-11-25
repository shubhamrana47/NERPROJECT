/**
 * Export Cleanup Service
 *
 * After an annotated/validated file is exported and downloaded, its document
 * in MongoDB Atlas is no longer needed and would otherwise grow Atlas logical
 * storage indefinitely. This service schedules automatic deletion after a
 * configurable grace period (default: 5 minutes) using TWO complementary
 * mechanisms:
 *
 *   1. MongoDB native TTL index on `Document.expireAt` (`expireAfterSeconds: 0`)
 *      — survives server restarts/sleeps on Railway/Render.
 *   2. An unref'd in-process timer — deletes promptly at the configured delay
 *      without waiting for MongoDB's 60s TTL sweep, while re-checking `expireAt`
 *      so any subsequent edit cancels deletion safely.
 *
 * Configuration:
 *   EXPORT_CLEANUP_DELAY_MINUTES (default: 5; set <= 0 to disable)
 *   EXPORT_CLEANUP_DELAY_MS      (optional millisecond override, useful in tests)
 */

const Document = require('../models/Document');

const DEFAULT_DELAY_MINUTES = 5;
const pendingTimers = new Map();

function getExportCleanupDelayMs() {
  if (process.env.EXPORT_CLEANUP_DELAY_MS !== undefined && process.env.EXPORT_CLEANUP_DELAY_MS !== '') {
    const ms = Number(process.env.EXPORT_CLEANUP_DELAY_MS);
    return Number.isFinite(ms) && ms > 0 ? ms : 0;
  }
  const minsRaw = process.env.EXPORT_CLEANUP_DELAY_MINUTES;
  const mins = minsRaw !== undefined && minsRaw !== '' ? Number(minsRaw) : DEFAULT_DELAY_MINUTES;
  if (!Number.isFinite(mins) || mins <= 0) return 0;
  return Math.round(mins * 60 * 1000);
}

/**
 * Cancel any in-process cleanup timer for a document (e.g. if the user keeps
 * editing after exporting). Callers should also clear `doc.expireAt = null`
 * and `doc.exportedAt = null` before saving.
 */
function cancelExportCleanup(docId) {
  if (!docId) return;
  const key = String(docId);
  const existing = pendingTimers.get(key);
  if (existing) {
    clearTimeout(existing);
    pendingTimers.delete(key);
  }
}

/**
 * Clear all in-process timers (used in tests/shutdown).
 */
function clearAllPendingCleanups() {
  for (const timer of pendingTimers.values()) {
    clearTimeout(timer);
  }
  pendingTimers.clear();
}

/**
 * Mark exported document(s) with `exportedAt` and `expireAt` in MongoDB and
 * arm an in-process cleanup timer.
 */
async function scheduleExportCleanup(docIds, { delayMs: explicitDelayMs } = {}) {
  const delayMs = explicitDelayMs !== undefined ? explicitDelayMs : getExportCleanupDelayMs();
  const ids = (Array.isArray(docIds) ? docIds : [docIds]).filter(Boolean);
  if (!delayMs || delayMs <= 0 || ids.length === 0) {
    return { scheduled: false, delayMs: 0, expireAt: null };
  }

  const now = new Date();
  const expireAt = new Date(now.getTime() + delayMs);

  try {
    await Document.updateMany(
      { _id: { $in: ids } },
      { $set: { exportedAt: now, expireAt } }
    );
  } catch (err) {
    console.error('Failed to mark exported documents for TTL cleanup:', err.message);
    return { scheduled: false, delayMs, expireAt: null, error: err };
  }

  for (const id of ids) {
    const key = String(id);
    cancelExportCleanup(key);
    const timer = setTimeout(async () => {
      pendingTimers.delete(key);
      try {
        // Only delete if `expireAt` is still set and has elapsed — if the user
        // edited the document in the meantime, `expireAt` will be null.
        const result = await Document.deleteOne({
          _id: id,
          expireAt: { $ne: null, $lte: new Date() },
        });
        if (result && result.deletedCount > 0) {
          console.log(`Auto-deleted exported document ${key} after grace period`);
        }
      } catch (err) {
        console.error(`Auto-delete failed for exported document ${key}:`, err.message);
      }
    }, delayMs);

    if (typeof timer.unref === 'function') {
      timer.unref();
    }
    pendingTimers.set(key, timer);
  }

  return { scheduled: true, delayMs, expireAt };
}

module.exports = {
  DEFAULT_DELAY_MINUTES,
  getExportCleanupDelayMs,
  scheduleExportCleanup,
  cancelExportCleanup,
  clearAllPendingCleanups,
};
