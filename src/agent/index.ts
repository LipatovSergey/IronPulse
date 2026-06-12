import net from "node:net";
import os from "node:os";

import type { MetricsMessage } from "../types.js";

const PORT = 4000;
const HOST = "127.0.0.1";

type CpuSnapshot = {
  idleSum: number;
  totalSum: number;
};

function calculateCpuUsage(previous: CpuSnapshot, current: CpuSnapshot) {
  const idleDelta = current.idleSum - previous.idleSum;
  const totalDelta = current.totalSum - previous.totalSum;
  if (totalDelta === 0) {
    return 0;
  }

  return (1 - idleDelta / totalDelta) * 100;
}

function takeCpuSnapshot() {
  const info = os.cpus();
  const times = info.map((core) => core.times);
  return times.reduce(
    (acc, core) => {
      acc.idleSum += core.idle;
      acc.totalSum += core.user + core.nice + core.sys + core.idle + core.irq;
      return acc;
    },
    { idleSum: 0, totalSum: 0 }
  );
}

const socket = net.createConnection({ host: HOST, port: PORT }, () => {
  console.log("Connected to server");
  let previousCpuSnapshot = takeCpuSnapshot();

  setInterval(() => {
    const currentCpuSnapshot = takeCpuSnapshot();
    const data: MetricsMessage = {
      type: "metrics",
      hostname: os.hostname(),
      timeStamp: new Date().toISOString(),
      uptime: os.uptime(),
      memoryUsagePercent:
        ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
      cpuUsagePercent: calculateCpuUsage(
        previousCpuSnapshot,
        currentCpuSnapshot
      ),
    };
    previousCpuSnapshot = currentCpuSnapshot;
    const jsonMessage = JSON.stringify(data);
    const readyMessage = jsonMessage + "\n";
    socket.write(readyMessage);
  }, 2000);
});

socket.on("error", (error) => {
  console.error("Agent socket error: ", error.message);
});

socket.on("close", () => {
  console.log("Connection closed");
});
