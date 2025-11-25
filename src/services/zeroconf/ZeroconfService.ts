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
  private initializationAttempted: boolean = false;

  constructor() {
    // Don't initialize immediately - wait until first use
    // This allows the native module to be fully loaded
  }

  /**
   * Initialize zeroconf if not already initialized
   */
  private initialize(): boolean {
    if (this.zeroconf !== null) {
      return true;
    }

    if (this.initializationAttempted) {
      return false;
    }

    this.initializationAttempted = true;

    try {
      // Check if Zeroconf is available
      if (typeof Zeroconf === 'undefined' || Zeroconf === null) {
        console.warn('Zeroconf module is not available. Make sure react-native-zeroconf is installed and linked.');
        return false;
      }

      this.zeroconf = new Zeroconf();
      
      // Test if native module is actually working by checking if methods exist
      if (typeof this.zeroconf.scan !== 'function') {
        console.warn('Zeroconf native module methods are not available. The app may need to be rebuilt.');
        this.zeroconf = null;
        return false;
      }

      this.setupEventListeners();
      return true;
    } catch (error) {
      console.error('Failed to initialize Zeroconf:', error);
      this.zeroconf = null;
      return false;
    }
  }

  /**
   * Check if zeroconf is initialized
   */
  private isInitialized(): boolean {
    if (this.zeroconf === null) {
      // Try to initialize if not attempted yet
      return this.initialize();
    }
    return true;
  }

  /**
   * Public method to check if zeroconf is initialized and ready
   */
  isReady(): boolean {
    return this.isInitialized();
  }

  /**
   * Force re-initialization (useful if native module becomes available later)
   */
  reinitialize(): boolean {
    this.zeroconf = null;
    this.initializationAttempted = false;
    return this.initialize();
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
   * Returns true if successful, false otherwise
   */
  startScan(type: string = 'http', protocol: string = 'tcp', domain: string = 'local.'): boolean {
    // Try to initialize if not already done
    if (!this.isInitialized()) {
      const error = new Error(
        'Zeroconf native module is not available. Please rebuild the app:\n' +
        '1. Stop Metro bundler\n' +
        '2. Run: cd android && ./gradlew clean && cd ..\n' +
        '3. Run: npm run android (or rebuild in Android Studio)'
      );
      this.callbacks.onError?.(error);
      return false;
    }

    if (!this.isScanning) {
      const zeroconf = this.zeroconf;
      if (zeroconf === null) {
        const error = new Error('Zeroconf instance is null');
        this.callbacks.onError?.(error);
        return false;
      }

      try {
        // Verify the native module is actually working
        if (typeof zeroconf.scan !== 'function') {
          throw new Error('Native module methods are not available');
        }
        
        zeroconf.scan(type, protocol, domain);
        return true;
      } catch {
        // Native module may not be ready - try to reinitialize once
        if (!this.initializationAttempted) {
          this.zeroconf = null;
          this.initializationAttempted = false;
          if (this.initialize()) {
            const retryZeroconf = this.zeroconf;
            if (retryZeroconf !== null) {
              const scanMethod = (retryZeroconf as Zeroconf).scan;
              if (typeof scanMethod === 'function') {
                try {
                  scanMethod.call(retryZeroconf, type, protocol, domain);
                  return true;
                } catch {
                  // Still failing after reinit
                }
              }
            }
          }
        }
        
        const err = new Error(
          'Failed to start scan. The native module may not be properly linked.\n' +
          'Please rebuild the app after installing react-native-zeroconf.'
        );
        this.callbacks.onError?.(err);
        return false;
      }
    }
    return true;
  }

  /**
   * Stop scanning for devices
   * Returns true if successful, false otherwise
   */
  stopScan(): boolean {
    if (!this.isInitialized()) {
      return false;
    }

    if (this.isScanning) {
      try {
        this.zeroconf!.stop();
        return true;
      } catch {
        // Native module may not be ready
        return false;
      }
    }
    return true;
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
   * Returns true if successful, false otherwise
   */
  publishService(
    type: string,
    protocol: string,
    domain: string,
    name: string,
    port: number,
    txt: Record<string, string> = {}
  ): boolean {
    if (!this.isInitialized()) {
      return false;
    }
    try {
      this.zeroconf!.publishService(type, protocol, domain, name, port, txt);
      return true;
    } catch {
      // Native module may not be ready - return false instead of throwing
      return false;
    }
  }

  /**
   * Unpublish a service
   * Returns true if successful, false otherwise
   */
  unpublishService(name: string): boolean {
    if (!this.isInitialized()) {
      return false;
    }
    try {
      this.zeroconf!.unpublishService(name);
      return true;
    } catch {
      // Native module may not be ready
      return false;
    }
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

