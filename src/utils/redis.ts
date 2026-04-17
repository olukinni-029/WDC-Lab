import type { RedisClientType } from 'redis';
import { createClient } from 'redis';

const redisUrl = process.env.REDIS_CONNECT;

export const redisClient: RedisClientType = createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 50000, // Set the timeout in milliseconds
  },
});

redisClient.on('connect', () => console.log('Redis Client Connected'));

redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
  await redisClient.connect();
})();

// Function to get a value from Redis
export async function getValue(key: string): Promise<string | null> {
  try {
    const value = await redisClient.get(key);
    return typeof value === 'string' ? value : null;
  } catch (error) {
    console.error('Error getting value from Redis:', error);
    return null;
  }
}


// Function to set a value in Redis with an optional expiration time
export async function setValue(key: string, value: string, expireInSeconds?: number): Promise<void> {
  try {
    if (expireInSeconds) {
      await redisClient.set(key, value, { EX: expireInSeconds });
    } else {
      await redisClient.set(key, value);
    }
  } catch (error) {
    console.error('Error setting value in Redis:', error);
  }
}

// Function to delete a value from Redis
export async function deleteValue(key: string): Promise<void> {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('Error deleting value from Redis:', error);
  }
}

// Function to set an expiration time on a key in Redis
export async function expireKey(key: string, expireInSeconds: number): Promise<void> {
  try {
    await redisClient.expire(key, expireInSeconds);
  } catch (error) {
    console.error('Error setting expiration on key in Redis:', error);
  }
}


// Function to publish a message to a Redis channel
export async function publishMessage(channel: string, message: string): Promise<void> {
  try {
    await redisClient.publish(channel, message);
  } catch (error) {
    console.error('Error publishing message to Redis channel:', error);
  }
}

// Function to subscribe to a Redis channel
export async function subscribeToChannel(channel: string, messageHandler: (message: string) => void): Promise<void> {
  try {
    const subscriber = redisClient.duplicate();
    await subscriber.connect();
    await subscriber.subscribe(channel, (message) => {
      messageHandler(message);
    });
  } catch (error) {
    console.error('Error subscribing to Redis channel:', error);
  }
}


export async function getJson<T>(key: string): Promise<T | null> {
  try {
    const value = await getValue(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch (error) {
    console.error("Error parsing JSON from Redis:", error);
    return null;
  }
}
