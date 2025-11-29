/**
 * WebRTC Service - Handles video calls between devices on local network
 */

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { DiscoveredDevice } from '../../types/device';
import { httpSignalingServer } from '../signaling/HTTPSignalingServer';

type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

type CallCallbacks = {
  onCallStateChange?: (state: CallState) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onLocalStream?: (stream: MediaStream) => void;
  onError?: (error: Error) => void;
};

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callState: CallState = 'idle';
  private callbacks: CallCallbacks = {};
  private isInitiator: boolean = false;
  private remoteDevice: DiscoveredDevice | null = null;
  private signalingPollInterval: ReturnType<typeof setInterval> | null = null;
  private signalingServerStarted: boolean = false;

  /**
   * Initialize signaling server
   */
  async initializeSignalingServer(): Promise<void> {
    if (this.signalingServerStarted) {
      return;
    }

    try {
      // Set up signaling server callbacks
      httpSignalingServer.setCallbacks({
        onMessage: (message, clientInfo) => {
          this.handleIncomingSignalingMessage(message, clientInfo);
        },
        onConnectionRequest: (_fromDevice, _clientInfo) => {
          console.log('[WebRTC] Incoming connection request from:', _fromDevice);
          // This will be handled by the UI layer if needed
        },
        onError: (error) => {
          console.error('[WebRTC] Signaling server error:', error);
        },
      });

      // Start the signaling server
      await httpSignalingServer.start(8888);
      this.signalingServerStarted = true;
      console.log('[WebRTC] Signaling server initialized on port 8888');
    } catch (error) {
      console.error('[WebRTC] Failed to initialize signaling server:', error);
      throw error;
    }
  }

  /**
   * Set callbacks for call events
   */
  setCallbacks(callbacks: CallCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Initialize WebRTC with STUN server (for same network, STUN helps with NAT)
   */
  private createPeerConnection(): RTCPeerConnection {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(configuration);

    // Handle ICE candidates - react-native-webrtc uses EventTarget
    // @ts-ignore - EventTarget methods are available at runtime
    pc.addEventListener('icecandidate', async (event: any) => {
      if (event.candidate && this.remoteDevice) {
        await this.sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      }
    });

    // Handle remote stream
    // @ts-ignore - EventTarget methods are available at runtime
    pc.addEventListener('track', (event: any) => {
      console.log('[WebRTC] Received remote stream');
      this.remoteStream = event.streams[0];
      this.callbacks.onRemoteStream?.(event.streams[0]);
    });

    // Handle connection state changes
    // @ts-ignore - EventTarget methods are available at runtime
    pc.addEventListener('connectionstatechange', () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        this.setCallState('connected');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.endCall();
      }
    });

    return pc;
  }

  /**
   * Get local media stream (camera + microphone)
   */
  private async getLocalStream(): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }

    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 },
          facingMode: 'user',
        },
      });

      this.localStream = stream;
      this.callbacks.onLocalStream?.(stream);
      return stream;
    } catch (error) {
      console.error('[WebRTC] Failed to get local stream:', error);
      throw new Error('Failed to access camera/microphone');
    }
  }

  /**
   * Start a video call to a device
   */
  async startCall(device: DiscoveredDevice): Promise<void> {
    if (this.callState !== 'idle') {
      throw new Error('Call already in progress');
    }

    this.remoteDevice = device;
    this.isInitiator = true;
    this.setCallState('calling');

    try {
      // Get local stream
      const stream = await this.getLocalStream();

      // Create peer connection
      this.peerConnection = this.createPeerConnection();
      stream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, stream);
      });

      // Connect to signaling server (using device's IP and port)
      await this.connectSignaling(device);

      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send offer through signaling (HTTP POST)
      await this.sendSignalingMessage({
        type: 'offer',
        sdp: offer.sdp,
      });
    } catch (error) {
      console.error('[WebRTC] Failed to start call:', error);
      this.setCallState('idle');
      this.callbacks.onError?.(error instanceof Error ? error : new Error('Failed to start call'));
    }
  }

  /**
   * Accept an incoming call
   */
  async acceptCall(): Promise<void> {
    if (this.callState !== 'ringing') {
      throw new Error('No incoming call to accept');
    }

    try {
      // Get local stream
      const stream = await this.getLocalStream();

      // Add tracks to peer connection if not already added
      if (this.peerConnection) {
        stream.getTracks().forEach((track) => {
          this.peerConnection?.addTrack(track, stream);
        });
      }

      // Create answer
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      // Send answer through signaling (HTTP POST)
      await this.sendSignalingMessage({
        type: 'answer',
        sdp: answer.sdp,
      });

      this.setCallState('connected');
    } catch (error) {
      console.error('[WebRTC] Failed to accept call:', error);
      this.callbacks.onError?.(error instanceof Error ? error : new Error('Failed to accept call'));
    }
  }

  /**
   * Reject an incoming call
   */
  async rejectCall(): Promise<void> {
    await this.sendSignalingMessage({ type: 'reject' });
    this.endCall();
  }

  /**
   * End the current call
   */
  endCall(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.signalingPollInterval) {
      clearInterval(this.signalingPollInterval);
      this.signalingPollInterval = null;
    }

    this.setCallState('idle');
    this.remoteDevice = null;
    this.isInitiator = false;
  }

  /**
   * Cleanup signaling server (call when app closes)
   */
  cleanup(): void {
    this.endCall();
    if (this.signalingServerStarted) {
      httpSignalingServer.stop();
      this.signalingServerStarted = false;
    }
  }

  /**
   * Connect to signaling server (using HTTP POST to remote device)
   */
  private async connectSignaling(device: DiscoveredDevice): Promise<void> {
    const deviceIp = device.addresses[0];
    const signalingUrl = `http://${deviceIp}:8888`;
    
    console.log('[WebRTC] Attempting to connect to signaling:', signalingUrl);
    
    // Test connection by sending a simple GET request
    try {
      const response = await fetch(`${signalingUrl}/signaling`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        console.log('[WebRTC] Signaling connection established');
        return;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn('[WebRTC] Signaling connection test failed:', error);
      // Continue anyway - the connection might still work for sending messages
    }
  }

  /**
   * Send signaling message to remote device via HTTP POST
   */
  private async sendSignalingMessage(message: { type: string; sdp?: string; candidate?: any }): Promise<void> {
    if (!this.remoteDevice) {
      console.warn('[WebRTC] No remote device to send message to');
      return;
    }

    const deviceIp = this.remoteDevice.addresses[0];
    const signalingUrl = `http://${deviceIp}:8888/signaling`;

    try {
      const response = await fetch(signalingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...message,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        console.warn('[WebRTC] Failed to send signaling message, HTTP:', response.status);
        throw new Error(`HTTP ${response.status}`);
      }
      
      console.log(`[WebRTC] Successfully sent ${message.type} to ${deviceIp}`);
    } catch (error) {
      console.error('[WebRTC] Signaling message send failed:', error);
      // Don't throw - allow the call to continue, might recover
    }
  }

  /**
   * Handle incoming signaling messages from the server
   */
  private async handleIncomingSignalingMessage(
    message: any,
    clientInfo?: { address: string; port: number }
  ): Promise<void> {
    console.log('[WebRTC] Received signaling message:', message.type);
    
    if (!this.peerConnection) {
      // If we don't have a peer connection yet, this might be an incoming call
      if (message.type === 'offer') {
        // Create a device object from the client info for incoming calls
        if (clientInfo && !this.remoteDevice) {
          this.remoteDevice = {
            host: `${clientInfo.address}.local.`,
            addresses: [clientInfo.address],
            name: `Device-${clientInfo.address}`,
            fullName: `Device-${clientInfo.address}.local._http._tcp.`,
            port: 8888,
            txt: {},
          };
        }
        
        // Create peer connection for incoming call
        this.peerConnection = this.createPeerConnection();
        
        // Get local stream for incoming call (will be added when user accepts)
        this.getLocalStream().catch((error) => {
          console.error('[WebRTC] Failed to get local stream for incoming call:', error);
        });
        
        this.setCallState('ringing');
      } else {
        console.warn('[WebRTC] Received message but no peer connection:', message.type);
        return;
      }
    }

    await this.processSignalingMessage(message);
  }

  /**
   * Process signaling message (internal)
   */
  private async processSignalingMessage(message: any): Promise<void> {
    if (!this.peerConnection) {
      return;
    }

    switch (message.type) {
      case 'offer':
        if (!this.isInitiator) {
          // We're receiving an offer (incoming call)
          try {
            await this.peerConnection.setRemoteDescription(
              new RTCSessionDescription({ type: 'offer', sdp: message.sdp })
            );
            this.setCallState('ringing');
            console.log('[WebRTC] Received offer, call is ringing');
          } catch (error) {
            console.error('[WebRTC] Failed to set remote description:', error);
            this.callbacks.onError?.(error instanceof Error ? error : new Error('Failed to process offer'));
          }
        }
        break;

      case 'answer':
        if (this.isInitiator) {
          // We're receiving an answer
          try {
            await this.peerConnection.setRemoteDescription(
              new RTCSessionDescription({ type: 'answer', sdp: message.sdp })
            );
            console.log('[WebRTC] Received answer, call should connect');
          } catch (error) {
            console.error('[WebRTC] Failed to set remote description:', error);
            this.callbacks.onError?.(error instanceof Error ? error : new Error('Failed to process answer'));
          }
        }
        break;

      case 'ice-candidate':
        try {
          if (message.candidate) {
            await this.peerConnection.addIceCandidate(
              new RTCIceCandidate(message.candidate)
            );
            console.log('[WebRTC] Added ICE candidate');
          }
        } catch (error) {
          console.warn('[WebRTC] Failed to add ICE candidate:', error);
          // Don't fail the call for ICE candidate errors
        }
        break;

      case 'reject':
        this.endCall();
        this.callbacks.onError?.(new Error('Call was rejected'));
        break;
    }
  }

  /**
   * Set call state and notify callbacks
   */
  private setCallState(state: CallState): void {
    this.callState = state;
    this.callbacks.onCallStateChange?.(state);
  }

  /**
   * Get current call state
   */
  getCallState(): CallState {
    return this.callState;
  }

  /**
   * Get remote device
   */
  getRemoteDevice(): DiscoveredDevice | null {
    return this.remoteDevice;
  }
}

export const webrtcService = new WebRTCService();

