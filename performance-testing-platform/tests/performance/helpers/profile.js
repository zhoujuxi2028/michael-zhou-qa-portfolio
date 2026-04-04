// k6 profile parser — uses open() + JSON.parse (NOT Node.js)
// Path: k6 open() resolves relative to MAIN SCRIPT (tests/performance/) → ../../profiles/<name>.json

export function loadProfile(name) {
  let content;
  try {
    content = open('../../profiles/' + name + '.json');
  } catch (e) {
    throw new Error(`Profile not found: profiles/${name}.json`);
  }

  const profile = JSON.parse(content);

  const hasStages = profile.stages && Array.isArray(profile.stages);
  const hasVus = profile.vus != null && profile.duration;

  if (!hasStages && !hasVus) {
    throw new Error(`Profile "${name}" must contain either "stages" or "vus" + "duration"`);
  }

  if (hasStages && profile.stages.length === 0) {
    throw new Error(`Profile "${name}" stages array must not be empty`);
  }

  if (!profile.thresholds || typeof profile.thresholds !== 'object') {
    throw new Error(`Profile "${name}" must contain a "thresholds" object`);
  }

  return profile;
}
