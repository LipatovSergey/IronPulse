export type MetricsMessage = {
  type: "metrics";
  hostname: string;
  timeStamp: string;
  uptime: number;
  memoryUsagePercent: number;
  cpuUsagePercent: number;
};
