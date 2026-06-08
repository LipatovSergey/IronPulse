import net from "node:net";
import type { MetricsMessage } from "../types.js";

const PORT = 4000;
const HOST = "127.0.0.1";

function displayNodes() {
  for (const [key, message] of messageByHostname) {
    const humanReadableMessage = {
      ...message,
      memoryUsagePercent: message.memoryUsagePercent.toFixed(2),
      cpuUsagePercent: message.cpuUsagePercent.toFixed(2),
    };
    console.log(key, humanReadableMessage);
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

const messageByHostname = new Map<string, MetricsMessage>();

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
          messageByHostname.set(parsedMessage.hostname, parsedMessage);
          displayNodes();
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

server.on("error", (error) => {
  console.log("Server error: ", error.message);
});

server.listen(PORT, HOST, () => {
  console.log(`IronPulse server listening on ${HOST}:${PORT}`);
});
