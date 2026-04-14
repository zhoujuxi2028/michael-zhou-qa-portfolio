import { BASE_URL } from './helpers/utils.js';
import { executeFunnel } from './helpers/funnel.js';
import { loadProfile } from './helpers/profile.js';

export const options = loadProfile('load');

export default function () {
  // Load test: 100% browse → 100% detail → 100% order (扁平模型，保持原始行为)
  // 通过设置 detailProb=1.0, orderProb=1.0 覆盖默认的嵌套概率
  executeFunnel(BASE_URL, {
    detailProb: 1.0, // 100% of iterations view detail
    orderProb: 1.0, // 100% of detail viewers place order
  });
}
