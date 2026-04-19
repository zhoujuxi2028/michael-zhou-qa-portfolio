const cluster = require('cluster');
const os = require('os');

if (cluster.isPrimary) {
  let isShuttingDown = false;
  const numWorkers = parseInt(process.env.CLUSTER_WORKERS) || os.cpus().length;
  console.log(`Master ${process.pid} starting ${numWorkers} workers...`);
  for (let i = 0; i < numWorkers; i++) cluster.fork();

  cluster.on('exit', (worker) => {
    if (isShuttingDown) {
      // 关闭中不重启 worker，避免 kill-respawn 循环
      console.log(`Worker ${worker.process.pid} exited (shutting down)`);
      return;
    }
    console.log(`Worker ${worker.process.pid} died, restarting...`);
    cluster.fork();
  });

  process.on('SIGTERM', () => {
    isShuttingDown = true;
    console.log(`Master ${process.pid} received SIGTERM, shutting down...`);
    for (const id in cluster.workers) {
      try {
        cluster.workers[id].process.kill('SIGTERM');
      } catch {
        // Worker 可能已退出
      }
    }
  });
} else {
  require('./server');
}
