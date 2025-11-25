/**
 * In-memory store for discovered devices
 */

import { DiscoveredDevice } from '../types/device';

class DeviceStore {
  private devices: Map<string, DiscoveredDevice> = new Map();

  /**
   * Add or update a device in the store
   */
  addDevice(device: DiscoveredDevice): void {
    this.devices.set(device.fullName, device);
  }

  /**
   * Remove a device from the store
   */
  removeDevice(fullName: string): void {
    this.devices.delete(fullName);
  }

  /**
   * Get all devices as an array
   */
  getAllDevices(): DiscoveredDevice[] {
    return Array.from(this.devices.values());
  }

  /**
   * Get a device by its full name
   */
  getDevice(fullName: string): DiscoveredDevice | undefined {
    return this.devices.get(fullName);
  }

  /**
   * Clear all devices
   */
  clear(): void {
    this.devices.clear();
  }

  /**
   * Get the count of devices
   */
  getDeviceCount(): number {
    return this.devices.size;
  }
}

// Export singleton instance
export const deviceStore = new DeviceStore();

