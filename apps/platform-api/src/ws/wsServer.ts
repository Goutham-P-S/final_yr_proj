import { WebSocketServer } from "ws";

let wss: WebSocketServer;

export function initWebSocket(server: any) {
  wss = new WebSocketServer({ server });

  wss.on("connection", ws => {
    console.log("🔌 WebSocket connected");
  });
}

export function broadcast(data: any) {
  if (!wss) return;

  const message = JSON.stringify(data);

  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}
