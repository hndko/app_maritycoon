import { performance } from 'node:perf_hooks';
import { io } from 'socket.io-client';

const backendUrl = process.env.LOAD_BACKEND_URL ?? 'http://localhost:4000';
const clients = Number(process.env.LOAD_CLIENTS ?? 50);
const timeoutMs = Number(process.env.LOAD_TIMEOUT_MS ?? 10_000);

async function main(): Promise<void> {
  const startedAt = performance.now();
  const results = await Promise.allSettled(
    Array.from({ length: clients }, (_, index) => connectClient(index)),
  );
  const fulfilled = results.filter((result) => result.status === 'fulfilled');
  const rejected = results.filter((result) => result.status === 'rejected');
  const latencies = fulfilled
    .map((result) => (result as PromiseFulfilledResult<number>).value)
    .sort((left, right) => left - right);

  console.log(JSON.stringify({
    backendUrl,
    clients,
    connected: fulfilled.length,
    failed: rejected.length,
    p50_ms: percentile(latencies, 0.5),
    p95_ms: percentile(latencies, 0.95),
    total_ms: Math.round(performance.now() - startedAt),
  }, null, 2));

  if (rejected.length > 0) {
    process.exitCode = 1;
  }
}

function connectClient(index: number): Promise<number> {
  const startedAt = performance.now();
  const socket = io(backendUrl, {
    transports: ['websocket'],
    reconnection: false,
    timeout: timeoutMs,
    auth: { load_client: index },
  });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`client ${index} timed out`));
    }, timeoutMs);

    socket.once('connect', () => {
      const latency = Math.round(performance.now() - startedAt);
      clearTimeout(timer);
      socket.disconnect();
      resolve(latency);
    });

    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      socket.disconnect();
      reject(error);
    });
  });
}

function percentile(values: number[], rank: number): number | null {
  if (values.length === 0) {
    return null;
  }

  return values[Math.min(values.length - 1, Math.floor(values.length * rank))];
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
