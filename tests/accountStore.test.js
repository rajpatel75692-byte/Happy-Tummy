const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeProviderName, buildUserRecord, updateProfileFields } = require('../server/accountStore.js');

test('normalizeProviderName trims and collapses whitespace', () => {
  assert.equal(normalizeProviderName('  Ravi   Kitchen  '), 'Ravi Kitchen');
});

test('buildUserRecord keeps the provider name aligned with the created account name', () => {
  const user = buildUserRecord({
    name: '  Green Bowl  Kitchen ',
    email: 'chef@greenbowl.com',
    passwordHash: 'hashed-password'
  });

  assert.equal(user.name, 'Green Bowl Kitchen');
  assert.equal(user.providerName, 'Green Bowl Kitchen');
  assert.equal(user.email, 'chef@greenbowl.com');
});

test('updateProfileFields updates provider details while preserving email and password hash', () => {
  const user = buildUserRecord({
    name: 'Original Kitchen',
    email: 'chef@original.com',
    passwordHash: 'old-hash'
  });

  const updated = updateProfileFields(user, {
    name: '  New  Sunrise  Kitchen  ',
    email: ' chef@newsunrise.com ',
    passwordHash: 'new-hash'
  });

  assert.equal(updated.name, 'New Sunrise Kitchen');
  assert.equal(updated.providerName, 'New Sunrise Kitchen');
  assert.equal(updated.email, 'chef@newsunrise.com');
  assert.equal(updated.passwordHash, 'new-hash');
});
