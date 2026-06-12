import net from "node:net";
import type { MetricsMessage } from "../types.js";

const PORT = 4000;
const HOST = "127.0.0.1";

const OFFLINE_TIMEOUT_MS = 6000;
const DISPLAY_INTERVAL_MS = 2000;

type NodeState = {
  hostname: string;
  latestMetrics: MetricsMessage;
  lastSeenAt: number;
};

const nodesByHostname = new Map<string, NodeState>();

function displayNodes() {
  if (nodesByHostname.size > 0) {
    const rows = [];
    for (const node of nodesByHostname.values()) {
      const { latestMetrics } = node;
      const humanReadableMessage = {
        hostname: node.hostname,
        status:
          Date.now() - node.lastSeenAt <= OFFLINE_TIMEOUT_MS
            ? "online"
            : "offline",
        "last seen at": new Date(node.lastSeenAt).toISOString(),
        cpu: latestMetrics.cpuUsagePercent.toFixed(2) + "%",
        memory: latestMetrics.memoryUsagePercent.toFixed(2) + "%",
        uptime: latestMetrics.uptime.toFixed(0) + "s",
      };
      rows.push(humanReadableMessage);
    }
    console.table(rows);
  } else {
    console.log("There is no nodes to display");
  }
}

function isMetricsMessage(message: unknown): message is MetricsMessage {
  if (
    message === null ||
    typeof message !== "object" ||
    Array.isArray(message)
  ) {
    return false;
  }

  const object = message as Record<string, unknown>;

  if (object.type !== "metrics") return false;
  if (typeof object.hostname !== "string") return false;
  if (typeof object.timeStamp !== "string") return false;
  if (typeof object.uptime !== "number") return false;
  if (typeof object.memoryUsagePercent !== "number") return false;
  if (typeof object.cpuUsagePercent !== "number") return false;

  return true;
}

const server = net.createServer((socket) => {
  console.log("Agent connected");

  let buffer = "";
  socket.on("data", (chunk) => {
    const chunkString = chunk.toString("utf8");
    buffer += chunkString;
    while (buffer.indexOf("\n") !== -1) {
      const index = buffer.indexOf("\n");
      const message = buffer.slice(0, index);
      try {
        const parsedMessage = JSON.parse(message);
        if (isMetricsMessage(parsedMessage)) {
          nodesByHostname.set(parsedMessage.hostname, {
            hostname: parsedMessage.hostname,
            latestMetrics: parsedMessage,
            lastSeenAt: Date.now(),
          });
        } else {
          console.error("Unsupported message");
        }
      } catch {
        console.error("Invalid message");
      }
      buffer = buffer.slice(index + 1);
    }
  });

  socket.on("end", () => {
    console.log("Agent disconnected");
  });

  socket.on("error", (error) => {
    console.log("Socket error: ", error.message);
  });
});

setInterval(() => {
  displayNodes();
}, DISPLAY_INTERVAL_MS);

server.on("error", (error) => {
  console.log("Server error: ", error.message);
});

server.listen(PORT, HOST, () => {
  console.log(`IronPulse server listening on ${HOST}:${PORT}`);
});
