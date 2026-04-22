function loadProfile(content) {
  if (!content) throw new Error('Profile content is required');
  let profile;
  try {
    profile = JSON.parse(content);
  } catch (e) {
    throw new Error(`Invalid profile JSON: ${e.message}`);
  }
  return validateProfile(profile);
}

function validateProfile(profile) {
  const hasStages = profile.stages && Array.isArray(profile.stages);
  const hasVus = profile.vus != null && profile.duration;

  if (!hasStages && !hasVus) {
    throw new Error('Profile must contain either "stages" array or "vus" + "duration"');
  }

  if (hasStages) {
    if (profile.stages.length === 0) {
      throw new Error('Profile "stages" array must not be empty');
    }
    profile.stages.forEach((s, i) => {
      if (!s.duration || s.target == null) {
        throw new Error(`Stage ${i} must have "duration" and "target"`);
      }
    });
  }

  if (!profile.thresholds || typeof profile.thresholds !== 'object') {
    throw new Error('Profile must contain a "thresholds" object');
  }

  validateObserver(profile.observer);

  return profile;
}

function validateObserver(observer) {
  if (observer == null) {
    return;
  }

  if (typeof observer !== 'object' || Array.isArray(observer)) {
    throw new Error('Profile "observer" must be an object');
  }

  if (observer.enabled != null && typeof observer.enabled !== 'boolean') {
    throw new Error('Profile "observer.enabled" must be boolean');
  }

  if (observer.exec != null && typeof observer.exec !== 'string') {
    throw new Error('Profile "observer.exec" must be string');
  }

  if (observer.vus != null && (!Number.isInteger(observer.vus) || observer.vus < 1)) {
    throw new Error('Profile "observer.vus" must be an integer >= 1');
  }
}

module.exports = { loadProfile, validateProfile, validateObserver };
