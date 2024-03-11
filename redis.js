// utils/redis.js
const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor() {
    // Initialize the Redis client and handle error events
    this.client = redis.createClient();
    this.client.on('error', (err) => console.error(`Redis Client Error: ${err}`));

    // Promisify the get, set, and del methods to use async/await
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.set).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
  }

  // Check if the Redis connection is alive
  isAlive() {
    return this.client.connected;
  }

  // Get the value for a given key from Redis
  async get(key) {
    return await this.getAsync(key);
  }

  // Set a value in Redis with an expiration time
  async set(key, value, duration) {
    await this.setAsync(key, value, 'EX', duration);
  }

  // Delete a key-value pair from Redis
  async del(key) {
    await this.delAsync(key);
  }
}

// Create and export an instance of RedisClient
const redisClient = new RedisClient();
module.exports = redisClient;

