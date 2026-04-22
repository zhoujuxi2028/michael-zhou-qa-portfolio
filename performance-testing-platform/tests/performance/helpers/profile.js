import {
  buildObserverDurationFromStages,
  buildObserverScenario,
} from './metricsObserver.js';

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

export function buildScenarioProfile(
  name,
  {
    loadExec = 'default',
    loadStages = null,
    observerDuration = null,
    observerExec = null,
    observerVus = null,
  } = {}
) {
  const profile = loadProfile(name);
  const stages = Array.isArray(loadStages) && loadStages.length > 0 ? loadStages : profile.stages;

  if (!Array.isArray(stages) || stages.length === 0) {
    throw new Error(`Profile "${name}" must provide stages for scenario execution`);
  }

  const observer = profile.observer || {};
  const options = {
    thresholds: profile.thresholds,
    scenarios: {
      load: {
        executor: 'ramping-vus',
        exec: loadExec,
        startVUs: 0,
        stages,
        gracefulRampDown: profile.gracefulRampDown || '0s',
      },
    },
  };

  if (profile.setupTimeout) {
    options.setupTimeout = profile.setupTimeout;
  }

  // 默认启用 observer；只有显式配置 enabled=false 时才关闭。
  const observerEnabled = observer.enabled !== false;

  if (observerEnabled) {
    options.scenarios.observer = buildObserverScenario({
      duration: observerDuration || buildObserverDurationFromStages(stages),
      exec: observerExec || observer.exec || 'observeMetrics',
      vus: observerVus || observer.vus,
    });
  }

  return options;
}
