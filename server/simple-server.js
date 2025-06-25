import { WebSocketServer } from 'ws';
import { NodeWSServerAdapter } from '@automerge/automerge-repo-network-websocket';
import { Repo } from '@automerge/automerge-repo';

const PORT = 3032;

console.log('Starting simple server...');

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  console.log('WebSocket connected');
  ws.on('close', () => console.log('WebSocket disconnected'));
});

const repo = new Repo({
  network: [new NodeWSServerAdapter(wss)],
  peerId: 'server'
});

console.log(`Server running on ws://localhost:${PORT}`);