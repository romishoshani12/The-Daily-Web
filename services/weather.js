let cached = null;
let pending = null;
let retryAt = 0;
const MAX_AGE = 15 * 60000;
function fresh(value, cacheAge = MAX_AGE) {
  if (!value) return false;
  const age = Date.now() - new Date(value.observedAt).getTime();
  return age >= 0 && age <= MAX_AGE && Date.now() - value.fetchedAt < cacheAge;
}
function unavailable() {
  const error = new Error('מזג האוויר אינו זמין כרגע.'); error.status = 503; return error;
}
async function weather() {
  if (fresh(cached, 10 * 60000)) return cached;
  if (Date.now() < retryAt) {
    if (fresh(cached)) return cached;
    throw unavailable();
  }
  if (pending) return pending;
  pending = (async () => {
    try {
      const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=32.0853&longitude=34.7818&current=temperature_2m,weather_code&timezone=UTC', { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('Weather provider unavailable');
      const { current } = await response.json();
      if (!Number.isFinite(current?.temperature_2m) || !Number.isFinite(current?.weather_code) || typeof current?.time !== 'string') throw new Error('Invalid weather response');
      const observedAt = /Z$|[+-]\d{2}:\d{2}$/.test(current.time) ? current.time : current.time + 'Z';
      const value = { temperature: current.temperature_2m, code: current.weather_code, observedAt, fetchedAt: Date.now(), city: 'תל אביב' };
      if (!fresh(value)) throw new Error('Stale or future weather observation');
      cached = value; retryAt = 0; return cached;
    } catch (error) {
      retryAt = Date.now() + 30000;
      console.error(JSON.stringify({ event: 'weather.error', message: error.message }));
      if (fresh(cached)) return cached;
      throw unavailable();
    }
  })();
  try { return await pending; } finally { pending = null; }
}
module.exports = { weather };
