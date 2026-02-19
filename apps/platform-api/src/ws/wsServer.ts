import { WebSocketServer, WebSocket } from "ws";

let wss: WebSocketServer;

export function initWebSocket(server: any) {
  wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg.toString());

        // Client can subscribe to a job
        if (data.type === "subscribe") {
          (ws as any).jobId = data.jobId;
        }
      } catch {}
    });
  });
}

export function broadcast(data: any) {
  if (!wss) return;

  const message = JSON.stringify(data);

  wss.clients.forEach((client: any) => {
    if (client.readyState !== WebSocket.OPEN) return;

    // Only send if job matches
    if (!client.jobId || client.jobId === data.jobId) {
      client.send(message);
    }
  });
}
