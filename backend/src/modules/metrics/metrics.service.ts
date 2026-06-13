import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private readonly startedAt = Date.now();

  getSnapshot(): string {
    const memory = process.memoryUsage();
    const uptimeSeconds = Math.floor((Date.now() - this.startedAt) / 1000);

    return [
      '# HELP maritycoon_process_uptime_seconds Process uptime in seconds.',
      '# TYPE maritycoon_process_uptime_seconds gauge',
      `maritycoon_process_uptime_seconds ${uptimeSeconds}`,
      '# HELP maritycoon_process_memory_heap_used_bytes Process heap used bytes.',
      '# TYPE maritycoon_process_memory_heap_used_bytes gauge',
      `maritycoon_process_memory_heap_used_bytes ${memory.heapUsed}`,
      '# HELP maritycoon_process_memory_rss_bytes Process resident set size bytes.',
      '# TYPE maritycoon_process_memory_rss_bytes gauge',
      `maritycoon_process_memory_rss_bytes ${memory.rss}`,
    ].join('\n');
  }
}
