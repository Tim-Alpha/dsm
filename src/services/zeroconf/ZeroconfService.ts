/**
 * Zeroconf Service - Manages device discovery using react-native-zeroconf
 */

import Zeroconf from 'react-native-zeroconf';
import { DiscoveredDevice } from '../../types/device';
import { deviceStore } from '../../stores/deviceStore';

export type ZeroconfEventType = 'start' | 'stop' | 'found' | 'resolved' | 'remove' | 'update' | 'error';

export interface ZeroconfServiceCallbacks {
  onStart?: () => void;
  onStop?: () => void;
  onFound?: (name: string) => void;
  onResolved?: (device: DiscoveredDevice) => void;
  onRemove?: (name: string) => void;
  onUpdate?: (name: string) => void;
  onError?: (error: Error) => void;
}

class ZeroconfService {
  private zeroconf: Zeroconf | null = null;
  private isScanning: boolean = false;
  private callbacks: ZeroconfServiceCallbacks = {};

  constructor() {
    try {
      this.zeroconf = new Zeroconf();
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize Zeroconf:', error);
      this.zeroconf = null;
    }
  }

  /**
   * Check if zeroconf is initialized
   */
  private isInitialized(): boolean {
    return this.zeroconf !== null;
  }

  /**
   * Setup event listeners for zeroconf events
   */
  private setupEventListeners(): void {
    if (!this.isInitialized()) {
      console.warn('Zeroconf not initialized, cannot setup event listeners');
      return;
    }

    this.zeroconf!.on('start', () => {
      this.isScanning = true;
      this.callbacks.onStart?.();
    });

    this.zeroconf!.on('stop', () => {
      this.isScanning = false;
      this.callbacks.onStop?.();
    });

    this.zeroconf!.on('found', (name: string) => {
      this.callbacks.onFound?.(name);
    });

    this.zeroconf!.on('resolved', (service: DiscoveredDevice) => {
      deviceStore.addDevice(service);
      this.callbacks.onResolved?.(service);
    });

    this.zeroconf!.on('remove', (name: string) => {
      const device = deviceStore.getAllDevices().find(d => d.name === name || d.fullName === name);
      if (device) {
        deviceStore.removeDevice(device.fullName);
      }
      this.callbacks.onRemove?.(name);
    });

    this.zeroconf!.on('update', (name: string) => {
      this.callbacks.onUpdate?.(name);
    });

    this.zeroconf!.on('error', (error: Error) => {
      this.callbacks.onError?.(error);
    });
  }

  /**
   * Set callbacks for zeroconf events
   */
  setCallbacks(callbacks: ZeroconfServiceCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Start scanning for devices
   */
  startScan(type: string = 'http', protocol: string = 'tcp', domain: string = 'local.'): void {
    if (!this.isInitialized()) {
      const error = new Error('Zeroconf is not initialized. Please check if the native module is properly linked.');
      this.callbacks.onError?.(error);
      throw error;
    }

    if (!this.isScanning) {
      this.zeroconf!.scan(type, protocol, domain);
    }
  }

  /**
   * Stop scanning for devices
   */
  stopScan(): void {
    if (!this.isInitialized()) {
      return;
    }

    if (this.isScanning) {
      this.zeroconf!.stop();
    }
  }

  /**
   * Get current scanning state
   */
  getScanningState(): boolean {
    return this.isScanning;
  }

  /**
   * Get all resolved services
   */
  getServices(): string[] {
    if (!this.isInitialized()) {
      return [];
    }
    return this.zeroconf!.getServices();
  }

  /**
   * Publish a service
   */
  publishService(
    type: string,
    protocol: string,
    domain: string,
    name: string,
    port: number,
    txt: Record<string, string> = {}
  ): void {
    if (!this.isInitialized()) {
      throw new Error('Zeroconf is not initialized');
    }
    this.zeroconf!.publishService(type, protocol, domain, name, port, txt);
  }

  /**
   * Unpublish a service
   */
  unpublishService(name: string): void {
    if (!this.isInitialized()) {
      return;
    }
    this.zeroconf!.unpublishService(name);
  }

  /**
   * Clean up listeners to prevent memory leaks
   */
  cleanup(): void {
    if (!this.isInitialized()) {
      return;
    }
    this.zeroconf!.removeDeviceListeners();
    this.callbacks = {};
  }

  /**
   * Re-add listeners if they were removed
   */
  reAddListeners(): void {
    if (!this.isInitialized()) {
      return;
    }
    this.zeroconf!.addDeviceListeners();
  }
}

// Export singleton instance
export const zeroconfService = new ZeroconfService();

