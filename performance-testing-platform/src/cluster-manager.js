/**
 * ClusterManager — 可测试的 Cluster 管理器
 *
 * 将 Node.js Cluster 模式的核心逻辑（fork、exit 重启、SIGTERM 优雅关闭）
 * 封装为独立类，通过依赖注入支持单元测试 mock。
 *
 * 设计原则：
 * - 依赖注入：cluster、os、process、logger 均可替换
 * - 单一职责：只管理 Worker 生命周期，不包含业务逻辑
 * - 可观测性：所有状态变更均通过 logger 输出
 */

class ClusterManager {
  /**
   * @param {object} options
   * @param {object} options.cluster - Node.js cluster 模块（可 mock）
   * @param {number} [options.numWorkers] - Worker 数量，默认读 CLUSTER_WORKERS 环境变量或 CPU 核心数
   * @param {string} [options.serverModule] - Worker 加载的服务模块路径
   * @param {object} [options.logger] - 日志对象（需有 log 方法）
   * @param {object} [options.process] - process 对象（可 mock，用于 SIGTERM 注册）
   */
  constructor(options = {}) {
    this.cluster = options.cluster;
    this.numWorkers =
      options.numWorkers ??
      (parseInt(process.env.CLUSTER_WORKERS) || require('os').cpus().length);
    this.serverModule = options.serverModule || './server';
    this.logger = options.logger || console;
    this._process = options.process || process;
    this.isShuttingDown = false;
  }

  /**
   * 启动 Cluster：Primary 分支 fork Worker，Worker 分支加载 server
   */
  start() {
    if (this.cluster.isPrimary) {
      this._startPrimary();
    } else {
      this._startWorker();
    }
  }

  /**
   * Primary 进程：fork Worker + 注册 exit/SIGTERM 处理
   */
  _startPrimary() {
    this.logger.log(
      `Master ${this._process.pid} starting ${this.numWorkers} workers...`,
    );

    for (let i = 0; i < this.numWorkers; i++) {
      this.cluster.fork();
    }

    this.cluster.on('exit', (worker) => this._handleWorkerExit(worker));
    this._process.on('SIGTERM', () => this._handleShutdown());
  }

  /**
   * Worker 退出处理：非关闭中则自动重启
   */
  _handleWorkerExit(worker) {
    if (this.isShuttingDown) {
      this.logger.log(
        `Worker ${worker.process.pid} exited (shutting down)`,
      );
      return;
    }
    this.logger.log(
      `Worker ${worker.process.pid} died, restarting...`,
    );
    this.cluster.fork();
  }

  /**
   * SIGTERM 优雅关闭：标记关闭状态 + 向所有 Worker 发送 SIGTERM
   */
  _handleShutdown() {
    this.isShuttingDown = true;
    this.logger.log(
      `Master ${this._process.pid} received SIGTERM, shutting down...`,
    );
    for (const id in this.cluster.workers) {
      try {
        this.cluster.workers[id].process.kill('SIGTERM');
      } catch {
        // Worker 可能已退出
      }
    }
  }

  /**
   * Worker 进程：加载业务服务模块
   */
  _startWorker() {
    require(this.serverModule);
  }
}

module.exports = ClusterManager;
