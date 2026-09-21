import { spawn, ChildProcess } from 'child_process';
import { Server as SocketIOServer } from 'socket.io';

interface TunnelState {
  isActive: boolean;
  publicUrl: string | null;
  provider: 'cloudflare' | 'localtunnel' | 'none';
  startedAt: string | null;
  error: string | null;
}

let tunnelProcess: ChildProcess | null = null;
let currentTunnelState: TunnelState = {
  isActive: false,
  publicUrl: null,
  provider: 'none',
  startedAt: null,
  error: null,
};

let ioInstance: SocketIOServer | null = null;

export function setTunnelSocketIO(io: SocketIOServer) {
  ioInstance = io;
}

export function getTunnelState(): TunnelState {
  return currentTunnelState;
}

export async function startCloudflareTunnel(port: number = 3000): Promise<TunnelState> {
  if (currentTunnelState.isActive && currentTunnelState.publicUrl) {
    return currentTunnelState;
  }

  // Stop any prior process
  stopTunnel();

  return new Promise((resolve) => {
    try {
      console.log(`🌐 Launching Cloudflare 4G/5G Tunnel on port ${port}...`);

      // Spawn cloudflared quick tunnel via npx
      const proc = spawn('npx', ['-y', 'cloudflared', 'tunnel', '--url', `http://127.0.0.1:${port}`], {
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      tunnelProcess = proc;
      currentTunnelState = {
        isActive: true,
        publicUrl: null,
        provider: 'cloudflare',
        startedAt: new Date().toISOString(),
        error: null,
      };

      let resolved = false;

      const handleData = (chunk: Buffer) => {
        const text = chunk.toString();
        console.log('[Cloudflare Tunnel]', text);

        // Match trycloudflare.com URL
        const match = text.match(/https:\/\/[a-zA-Z0-9-.]+\.trycloudflare\.com/i);
        if (match) {
          const url = match[0].trim();
          currentTunnelState.publicUrl = url;
          currentTunnelState.isActive = true;
          console.log(`⚡ GLOBAL 4G/5G REMOTE ACCESS READY: ${url}`);
          if (ioInstance) {
            ioInstance.emit('tunnel:state', currentTunnelState);
          }
          if (!resolved) {
            resolved = true;
            resolve(currentTunnelState);
          }
        }
      };

      proc.stdout?.on('data', handleData);
      proc.stderr?.on('data', handleData);

      proc.on('error', (err) => {
        console.error('Failed to spawn Cloudflare tunnel:', err);
        currentTunnelState = {
          isActive: false,
          publicUrl: null,
          provider: 'none',
          startedAt: null,
          error: err.message,
        };
        if (!resolved) {
          resolved = true;
          resolve(currentTunnelState);
        }
      });

      proc.on('close', (code) => {
        console.log(`Cloudflare tunnel process exited with code ${code}`);
        currentTunnelState = {
          isActive: false,
          publicUrl: null,
          provider: 'none',
          startedAt: null,
          error: code !== 0 ? `Tunnel exited with code ${code}` : null,
        };
        if (ioInstance) {
          ioInstance.emit('tunnel:state', currentTunnelState);
        }
      });

      // Timeout fallback after 15s
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(currentTunnelState);
        }
      }, 15000);
    } catch (e: any) {
      currentTunnelState = {
        isActive: false,
        publicUrl: null,
        provider: 'none',
        startedAt: null,
        error: e?.message || 'Unknown error starting tunnel',
      };
      resolve(currentTunnelState);
    }
  });
}

export function stopTunnel(): TunnelState {
  if (tunnelProcess) {
    try {
      tunnelProcess.kill('SIGTERM');
    } catch (e) {}
    tunnelProcess = null;
  }
  currentTunnelState = {
    isActive: false,
    publicUrl: null,
    provider: 'none',
    startedAt: null,
    error: null,
  };
  if (ioInstance) {
    ioInstance.emit('tunnel:state', currentTunnelState);
  }
  return currentTunnelState;
}
