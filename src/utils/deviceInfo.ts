/**
 * Utility functions for device information
 */

import { Platform } from 'react-native';
import { DiscoveredDevice } from '../types/device';

/**
 * Generate a self device entry for the current device
 */
export const createSelfDevice = (): DiscoveredDevice => {
  const deviceName = Platform.OS === 'ios' ? 'iOS Device' : 'Android Device';
  const host = `${deviceName.toLowerCase().replace(' ', '')}.local.`;
  const fullName = `${deviceName.replace(' ', '')}.local._http._tcp.`;
  
  // Common localhost addresses
  const addresses = ['127.0.0.1', '::1'];
  
  return {
    host,
    addresses,
    name: `${deviceName}`,
    fullName,
    port: 8080,
    txt: {
      platform: Platform.OS,
      self: 'true',
    },
  };
};

