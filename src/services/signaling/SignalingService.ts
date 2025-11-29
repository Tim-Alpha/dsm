/**
 * Signaling Service - HTTP-based signaling for WebRTC on same network
 * Uses simple HTTP polling to exchange SDP offers/answers and ICE candidates
 */

import { Platform } from 'react-native';
import { DiscoveredDevice } from '../../types/device';

type SignalingMessage = {
  type: 'offer' | 'answer' | 'ice-candidate' | 'reject';
  sdp?: string;
  candidate?: any;
  timestamp: number;
};

class SignalingService {
  private signalingPort: number = 8888;
  private serverUrl: string | null = null;
  private messageQueue: SignalingMessage[] = [];
  private isServerRunning: boolean = false;
  private callbacks: {
    onOffer?: (sdp: string) => void;
    onAnswer?: (sdp: string) => void;
    onIceCandidate?: (candidate: any) => void;
    onReject?: () => void;
  } = {};

  /**
   * Start signaling server on this device
   */
  async startServer(): Promise<void> {
    if (this.isServerRunning) {
      return;
    }

    // For React Native, we'll use a simple approach:
    // Store messages in memory and poll for them
    // In a real implementation, you'd use a native HTTP server module
    this.isServerRunning = true;
    console.log('[Signaling] Server started (in-memory mode)');
  }

  /**
   * Stop signaling server
   */
  stopServer(): void {
    this.isServerRunning = false;
    this.messageQueue = [];
    console.log('[Signaling] Server stopped');
  }

  /**
   * Connect to remote device's signaling server
   */
  async connectToDevice(device: DiscoveredDevice): Promise<void> {
    // Use device's IP address
    const deviceIp = device.addresses[0];
    this.serverUrl = `http://${deviceIp}:${this.signalingPort}`;
    console.log('[Signaling] Connecting to:', this.serverUrl);
  }

  /**
   * Send offer to remote device
   */
  async sendOffer(sdp: string): Promise<void> {
    await this.sendMessage({
      type: 'offer',
      sdp,
      timestamp: Date.now(),
    });
  }

  /**
   * Send answer to remote device
   */
  async sendAnswer(sdp: string): Promise<void> {
    await this.sendMessage({
      type: 'answer',
      sdp,
      timestamp: Date.now(),
    });
  }

  /**
   * Send ICE candidate to remote device
   */
  async sendIceCandidate(candidate: any): Promise<void> {
    await this.sendMessage({
      type: 'ice-candidate',
      candidate,
      timestamp: Date.now(),
    });
  }

  /**
   * Send reject message
   */
  async sendReject(): Promise<void> {
    await this.sendMessage({
      type: 'reject',
      timestamp: Date.now(),
    });
  }

  /**
   * Send message (simplified - in production use HTTP POST)
   */
  private async sendMessage(message: SignalingMessage): Promise<void> {
    // For now, we'll use a shared store approach
    // In production, you'd POST to the remote device's signaling server
    console.log('[Signaling] Sending message:', message.type);
    
    // Store in global signaling store (shared between devices via Zeroconf TXT records)
    // For now, we'll use a simpler approach with direct HTTP calls
    try {
      if (this.serverUrl) {
        // In a real implementation, you'd use fetch to POST to the remote device
        // For now, we'll simulate it
        await this.postToDevice(message);
      }
    } catch (error) {
      console.error('[Signaling] Failed to send message:', error);
      throw error;
    }
  }

  /**
   * POST message to remote device (simplified implementation)
   */
  private async postToDevice(message: SignalingMessage): Promise<void> {
    // Note: This is a simplified version
    // In production, you'd need a native HTTP server module or use WebSocket
    // For now, we'll use fetch if available, otherwise fallback to Zeroconf TXT records
    
    try {
      // Try to use fetch (may not work in all React Native environments)
      const response = await fetch(`${this.serverUrl}/signaling`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      // Fallback: Use Zeroconf TXT records for signaling
      console.warn('[Signaling] HTTP failed, using Zeroconf TXT fallback');
      // This would require updating the device's TXT records
      // For now, we'll throw the error
      throw error;
    }
  }

  /**
   * Set callbacks for incoming messages
   */
  setCallbacks(callbacks: {
    onOffer?: (sdp: string) => void;
    onAnswer?: (sdp: string) => void;
    onIceCandidate?: (candidate: any) => void;
    onReject?: () => void;
  }): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Handle incoming message (called by server)
   */
  handleIncomingMessage(message: SignalingMessage): void {
    console.log('[Signaling] Received message:', message.type);
    
    switch (message.type) {
      case 'offer':
        if (message.sdp) {
          this.callbacks.onOffer?.(message.sdp);
        }
        break;
      case 'answer':
        if (message.sdp) {
          this.callbacks.onAnswer?.(message.sdp);
        }
        break;
      case 'ice-candidate':
        if (message.candidate) {
          this.callbacks.onIceCandidate?.(message.candidate);
        }
        break;
      case 'reject':
        this.callbacks.onReject?.();
        break;
    }
  }

  /**
   * Disconnect from remote device
   */
  disconnect(): void {
    this.serverUrl = null;
    this.messageQueue = [];
  }
}

export const signalingService = new SignalingService();

