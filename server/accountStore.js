function normalizeProviderName(name = '') {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function buildUserRecord({ name, email, passwordHash }) {
  const normalizedName = normalizeProviderName(name);
  return {
    name: normalizedName,
    providerName: normalizedName,
    email: String(email || '').trim().toLowerCase(),
    passwordHash,
  };
}

function updateProfileFields(user, updates = {}) {
  const nextName = normalizeProviderName(updates.name || user.name || user.providerName || '');
  const nextEmail = String(updates.email || user.email || '').trim().toLowerCase();
  const nextPasswordHash = updates.passwordHash || user.passwordHash;

  return {
    ...user,
    name: nextName,
    providerName: nextName,
    email: nextEmail,
    passwordHash: nextPasswordHash,
  };
}

module.exports = {
  normalizeProviderName,
  buildUserRecord,
  updateProfileFields,
};
