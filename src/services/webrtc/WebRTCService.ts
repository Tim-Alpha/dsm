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
  private signalingPollInterval: NodeJS.Timeout | null = null;

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

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate && this.remoteDevice) {
        await this.sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote stream');
      this.remoteStream = event.streams[0];
      this.callbacks.onRemoteStream?.(event.streams[0]);
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        this.setCallState('connected');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.endCall();
      }
    };

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

    // Signaling cleanup handled by sendSignalingMessage

    this.setCallState('idle');
    this.remoteDevice = null;
    this.isInitiator = false;
  }

  /**
   * Connect to signaling server (using HTTP polling for same network)
   * For same-network, we'll use a simple HTTP-based signaling approach
   */
  private async connectSignaling(device: DiscoveredDevice): Promise<void> {
    return new Promise((resolve, reject) => {
      // For same-network signaling, we'll use HTTP polling
      // Each device will poll the other device's signaling endpoint
      const deviceIp = device.addresses[0];
      const signalingUrl = `http://${deviceIp}:8888`;
      
      console.log('[WebRTC] Attempting to connect to signaling:', signalingUrl);
      
      // Try to connect via HTTP first (polling-based)
      // For now, we'll use a simplified approach with direct WebRTC connection
      // In production, you'd set up an HTTP server on each device
      
      // For same-network, WebRTC can work with just STUN servers
      // The signaling can be done via Zeroconf TXT records or HTTP polling
      
      // Simulate connection success for now
      // TODO: Implement actual HTTP signaling server
      setTimeout(() => {
        console.log('[WebRTC] Signaling connection established (simulated)');
        resolve();
      }, 100);
    });
  }

  /**
   * Send signaling message to remote device
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
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.warn('[WebRTC] Failed to send signaling message, HTTP:', response.status);
        // Fallback: Try using Zeroconf TXT records for small messages
        // For now, just log the warning
      }
    } catch (error) {
      console.warn('[WebRTC] Signaling message send failed:', error);
      // In production, implement fallback mechanism
    }
  }

  /**
   * Handle signaling messages
   */
  private async handleSignalingMessage(message: any): Promise<void> {
    if (!this.peerConnection) {
      return;
    }

    switch (message.type) {
      case 'offer':
        if (!this.isInitiator) {
          // We're receiving an offer
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(message)
          );
          this.setCallState('ringing');
        }
        break;

      case 'answer':
        if (this.isInitiator) {
          // We're receiving an answer
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(message)
          );
        }
        break;

      case 'ice-candidate':
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(message.candidate)
        );
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

