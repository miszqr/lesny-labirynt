// Stable test-only RNG. Production still uses Math.random (shared game seeds are T09).
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
}

function testSeeds(count) {
  if (process.env.TEST_SEED === undefined) return Array.from({ length: count }, (_, i) => i + 1);
  const seed = Number(process.env.TEST_SEED);
  if (!/^\d+$/.test(process.env.TEST_SEED) || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new Error('TEST_SEED must be an integer between 0 and 4294967295.');
  }
  return [seed];
}

function withSeed(size, seed, scenario, check) {
  try { check(); }
  catch (cause) { throw new Error(`${scenario}: size=${size}, seed=${seed}: ${cause.message}`, { cause }); }
}

module.exports = { seededRandom, testSeeds, withSeed };
