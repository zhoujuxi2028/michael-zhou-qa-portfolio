const simulateDelay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { simulateDelay };
