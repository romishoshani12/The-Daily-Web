const { randomBytes, scrypt, timingSafeEqual, createHash, createHmac } = require('node:crypto');
const { promisify } = require('node:util');
const derive = promisify(scrypt);
const hash = value => createHash('sha256').update(value).digest('hex');
const sign = value => createHmac('sha256', process.env.SESSION_SECRET).update(value).digest('hex');
async function passwordHash(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + (await derive(password, salt, 64)).toString('hex');
}
async function passwordMatches(password, stored) {
  const [salt, digest] = stored.split(':');
  const actual = await derive(password, salt, 64);
  const expected = Buffer.from(digest, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
module.exports = { hash, sign, passwordHash, passwordMatches };