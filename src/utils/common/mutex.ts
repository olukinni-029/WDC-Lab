// mutex.service.ts
import { Mutex } from 'async-mutex';

const mutexes = new Map<string, Mutex>();

export const getMutex = (key: string): Mutex => {
  if (!mutexes.has(key)) {
    mutexes.set(key, new Mutex());
  }
  return mutexes.get(key)!;
};