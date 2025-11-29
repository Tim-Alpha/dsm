/**
 * HTTP Signaling Server - Creates an HTTP server on each device for WebRTC signaling
 * Uses react-native-tcp-socket to create a simple HTTP server for local network
 */

import TcpSocket from 'react-native-tcp-socket';

type Server = any;
type Socket = any;

type SignalingMessage = {
  type: 'offer' | 'answer' | 'ice-candidate' | 'reject' | 'call-request';
  sdp?: string;
  candidate?: any;
  fromDevice?: string;
  timestamp?: number;
};

type SignalingCallbacks = {
  onMessage?: (message: SignalingMessage, clientInfo: { address: string; port: number }) => void;
  onConnectionRequest?: (fromDevice: string, clientInfo: { address: string; port: number }) => void;
  onError?: (error: Error) => void;
};

class HTTPSignalingServer {
  private server: Server | null = null;
  private port: number = 8888;
  private isRunning: boolean = false;
  private callbacks: SignalingCallbacks = {};

  /**
   * Start the HTTP signaling server
   */
  async start(port: number = 8888): Promise<void> {
    if (this.isRunning) {
      console.log('[SignalingServer] Server already running');
      return;
    }

    this.port = port;

    return new Promise((resolve, reject) => {
      try {
        this.server = TcpSocket.createServer((socket: Socket) => {
          this.handleConnection(socket);
        });

        this.server.on('error', (err: Error) => {
          console.error('[SignalingServer] Server error:', err);
          this.callbacks.onError?.(err);
          if (!this.isRunning) {
            reject(err);
          }
        });

        this.server.on('listening', () => {
          this.isRunning = true;
          console.log(`[SignalingServer] Server started on port ${this.port}`);
          resolve();
        });

        this.server.listen({ port: this.port, host: '0.0.0.0' });
      } catch (error) {
        console.error('[SignalingServer] Failed to start server:', error);
        reject(error);
      }
    });
  }

  /**
   * Stop the signaling server
   */
  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      this.isRunning = false;
      console.log('[SignalingServer] Server stopped');
    }
  }

  /**
   * Set callbacks for signaling events
   */
  setCallbacks(callbacks: SignalingCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Handle new client connection
   */
  private handleConnection(socket: Socket): void {
    let requestData = '';
    const socketInfo = socket.address();
    const clientInfo = {
      address: socketInfo?.address || 'unknown',
      port: socketInfo?.port || 0,
    };

    console.log(`[SignalingServer] New connection from ${clientInfo.address}:${clientInfo.port}`);

    socket.on('data', (data: any) => {
      const dataStr = typeof data === 'string' ? data : data.toString();
      requestData += dataStr;

      // Check if we have a complete HTTP request
      if (requestData.includes('\r\n\r\n')) {
        this.handleHTTPRequest(socket, requestData, clientInfo);
        requestData = ''; // Reset for next request
      }
    });

    socket.on('error', (error: Error) => {
      console.error('[SignalingServer] Socket error:', error);
    });

    socket.on('close', () => {
      console.log(`[SignalingServer] Connection closed from ${clientInfo.address}:${clientInfo.port}`);
    });
  }

  /**
   * Handle HTTP request
   */
  private handleHTTPRequest(
    socket: Socket,
    requestData: string,
    clientInfo: { address: string; port: number }
  ): void {
    const lines = requestData.split('\r\n');
    const requestLine = lines[0];
    const parts = requestLine.split(' ');
    const method = parts[0];
    const path = parts[1];

    console.log(`[SignalingServer] ${method} ${path} from ${clientInfo.address}`);

    if (method === 'POST' && path === '/signaling') {
      // Extract JSON body
      const bodyStart = requestData.indexOf('\r\n\r\n') + 4;
      const body = requestData.substring(bodyStart).trim();

      try {
        const message: SignalingMessage = JSON.parse(body);
        this.handleSignalingMessage(socket, message, clientInfo);
      } catch (error) {
        console.error('[SignalingServer] Failed to parse message:', error);
        this.sendHTTPResponse(socket, 400, 'Bad Request', JSON.stringify({ error: 'Invalid JSON' }));
      }
    } else if (method === 'GET' && path === '/signaling') {
      // Health check endpoint
      this.sendHTTPResponse(socket, 200, 'OK', JSON.stringify({ status: 'ok', port: this.port }));
    } else if (method === 'POST' && path === '/call-request') {
      // Handle incoming call request
      const bodyStart = requestData.indexOf('\r\n\r\n') + 4;
      const body = requestData.substring(bodyStart).trim();
      try {
        const data = JSON.parse(body);
        this.callbacks.onConnectionRequest?.(data.fromDevice || 'Unknown', clientInfo);
        this.sendHTTPResponse(socket, 200, 'OK', JSON.stringify({ status: 'received' }));
      } catch {
        this.sendHTTPResponse(socket, 400, 'Bad Request', JSON.stringify({ error: 'Invalid JSON' }));
      }
    } else {
      this.sendHTTPResponse(socket, 404, 'Not Found', JSON.stringify({ error: 'Endpoint not found' }));
    }
  }

  /**
   * Handle signaling message
   */
  private handleSignalingMessage(
    socket: Socket,
    message: SignalingMessage,
    clientInfo: { address: string; port: number }
  ): void {
    console.log(`[SignalingServer] Received ${message.type} from ${clientInfo.address}`);

    // Notify callbacks immediately
    this.callbacks.onMessage?.(message, clientInfo);

    // Send acknowledgment
    this.sendHTTPResponse(socket, 200, 'OK', JSON.stringify({ status: 'received', type: message.type }));
  }

  /**
   * Send HTTP response
   */
  private sendHTTPResponse(
    socket: Socket,
    statusCode: number,
    statusText: string,
    body: string
  ): void {
    // Calculate content length (approximate for UTF-8, good enough for JSON)
    // For JSON, string length is usually close to byte length
    const contentLength = body.length;
    
    const response = [
      `HTTP/1.1 ${statusCode} ${statusText}`,
      'Content-Type: application/json',
      'Access-Control-Allow-Origin: *',
      `Content-Length: ${contentLength}`,
      '',
      body,
    ].join('\r\n');

    socket.write(response, () => {
      socket.end();
    });
  }

  /**
   * Get server port
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }
}

export const httpSignalingServer = new HTTPSignalingServer();

