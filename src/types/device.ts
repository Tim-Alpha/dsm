/**
 * Type definitions for device discovery
 */

export interface DiscoveredDevice {
  host: string;
  addresses: string[];
  name: string;
  fullName: string;
  port: number;
  txt?: Record<string, string>;
}

export interface DeviceDiscoveryState {
  isScanning: boolean;
  devices: Map<string, DiscoveredDevice>;
  error: string | null;
}

