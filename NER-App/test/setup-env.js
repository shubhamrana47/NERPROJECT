// Preloaded for every test file (see the "test" script in package.json).
// The suites stub the model service through global.fetch, so they need the
// AI to count as enabled; without AI_SERVICE_URL the backend runs manual-only.
process.env.AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service.test';
