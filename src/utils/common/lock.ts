import { getMutex } from "./mutex";


type MutexRunner = <T>(fn: () => Promise<T>) => Promise<T>;
export async function runWithLocks<T>(keys: string[], fn: () => Promise<T>): Promise<T> {
  const uniqueSortedKeys = Array.from(new Set(keys)).sort();
  const runners: MutexRunner[] = uniqueSortedKeys.map((k) => getMutex(k).runExclusive);

  // Compose nested runExclusive calls
  const run = runners.reduceRight<MutexRunner>(
    (next, runExclusive) => async (inner) => runExclusive(() => next(inner)),
    async (inner) => inner()
  );

  return run(fn);
};