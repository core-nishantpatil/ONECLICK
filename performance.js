// OneClick v3 — Performance Cache & Worker Interface

// 1. Memoization Cache Manager
window.PerformanceCache = {
  version: 0,
  cache: new Map(),
  
  get: function(key) {
    const compositeKey = `${this.version}_${key}`;
    return this.cache.get(compositeKey);
  },
  
  set: function(key, val) {
    const compositeKey = `${this.version}_${key}`;
    this.cache.set(compositeKey, val);
  },
  
  invalidate: function() {
    this.version++;
    this.cache.clear();
  }
};

// 2. Web Worker Pool/Broker
var calculationWorker = null;
var workerCallbacks = new Map();
var messageIdCounter = 0;

function getWorker() {
  if (!calculationWorker) {
    calculationWorker = new Worker('worker.js');
    calculationWorker.onmessage = function(e) {
      const { id, success, result, error } = e.data;
      const callback = workerCallbacks.get(id);
      if (callback) {
        workerCallbacks.delete(id);
        if (success) {
          callback.resolve(result);
        } else {
          callback.reject(new Error(error));
        }
      }
    };
  }
  return calculationWorker;
}

window.runBackgroundCalculation = function(action, params) {
  return new Promise((resolve, reject) => {
    const worker = getWorker();
    const msgId = ++messageIdCounter;
    workerCallbacks.set(msgId, { resolve, reject });
    worker.postMessage({
      id: msgId,
      action,
      ...params
    });
  });
};
