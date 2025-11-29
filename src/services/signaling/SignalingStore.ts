/**
 * Signaling Store - Simple in-memory store for signaling messages
 * This is a temporary solution for same-network signaling
 * In production, you'd use a proper HTTP server or WebSocket server
 */

type SignalingMessage = {
  type: 'offer' | 'answer' | 'ice-candidate' | 'reject';
  sdp?: string;
  candidate?: any;
  timestamp: number;
  fromDevice?: string;
  toDevice?: string;
};

class SignalingStore {
  private messages: Map<string, SignalingMessage[]> = new Map();
  private listeners: Map<string, ((message: SignalingMessage) => void)[]> = new Map();

  /**
   * Store a signaling message for a device
   */
  storeMessage(deviceId: string, message: SignalingMessage): void {
    if (!this.messages.has(deviceId)) {
      this.messages.set(deviceId, []);
    }
    this.messages.get(deviceId)!.push(message);
    
    // Notify listeners
    const deviceListeners = this.listeners.get(deviceId);
    if (deviceListeners) {
      deviceListeners.forEach(listener => listener(message));
    }
  }

  /**
   * Get messages for a device
   */
  getMessages(deviceId: string): SignalingMessage[] {
    return this.messages.get(deviceId) || [];
  }

  /**
   * Clear messages for a device
   */
  clearMessages(deviceId: string): void {
    this.messages.delete(deviceId);
  }

  /**
   * Add a listener for messages to a device
   */
  addListener(deviceId: string, listener: (message: SignalingMessage) => void): void {
    if (!this.listeners.has(deviceId)) {
      this.listeners.set(deviceId, []);
    }
    this.listeners.get(deviceId)!.push(listener);
  }

  /**
   * Remove a listener
   */
  removeListener(deviceId: string, listener: (message: SignalingMessage) => void): void {
    this.listeners.forEach((listeners, deviceId) => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    });
  }
}

export const signalingStore = new SignalingStore();

