const cluster = require('cluster');
const ClusterManager = require('./cluster-manager');

const manager = new ClusterManager({ cluster });
manager.start();
