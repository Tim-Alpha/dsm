/**
 * Type declarations for react-native-zeroconf
 */

declare module 'react-native-zeroconf' {
  interface DiscoveredDevice {
    host: string;
    addresses: string[];
    name: string;
    fullName: string;
    port: number;
    txt?: Record<string, string>;
  }

  type ZeroconfEventMap = {
    start: () => void;
    stop: () => void;
    found: (name: string) => void;
    resolved: (service: DiscoveredDevice) => void;
    remove: (name: string) => void;
    update: (name: string) => void;
    error: (error: Error) => void;
  };

  export default class Zeroconf {
    constructor();
    scan(type?: string, protocol?: string, domain?: string): void;
    stop(): void;
    getServices(): string[];
    removeDeviceListeners(): void;
    addDeviceListeners(): void;
    publishService(
      type: string,
      protocol: string,
      domain: string,
      name: string,
      port: number,
      txt?: Record<string, string>
    ): void;
    unpublishService(name: string): void;
    on<K extends keyof ZeroconfEventMap>(event: K, callback: ZeroconfEventMap[K]): void;
  }
}

