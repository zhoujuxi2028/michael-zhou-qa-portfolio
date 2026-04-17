import { BASE_URL } from './helpers/utils.js';
import { executeFunnel } from './helpers/funnel.js';
import { loadProfile } from './helpers/profile.js';

export const options = loadProfile('stress');

export default function () {
  executeFunnel(BASE_URL);
}
