/**
 * Utility functions for device information
 */

import { Platform } from 'react-native';
import { DiscoveredDevice } from '../types/device';

/**
 * Generate a self device entry for the current device
 */
export const createSelfDevice = (): DiscoveredDevice => {
  const deviceName = getReadableDeviceName();
  const host = `${normalizeForHost(deviceName)}.local.`;
  const fullName = `${normalizeForFullName(deviceName)}.local._http._tcp.`;
  
  // Common localhost addresses
  const addresses = ['127.0.0.1', '::1'];
  
  return {
    host,
    addresses,
    name: deviceName,
    fullName,
    port: 8080,
    txt: {
      platform: Platform.OS,
      self: 'true',
    },
  };
};

type PlatformConstantsSubset = {
  Model?: string;
  Brand?: string;
  Manufacturer?: string;
  deviceName?: string;
};

const getReadableDeviceName = (): string => {
  const constants = Platform.constants as PlatformConstantsSubset | undefined;

  if (Platform.OS === 'android' && constants) {
    const manufacturer = constants.Manufacturer || constants.Brand;
    const model = constants.Model;

    if (manufacturer && model) {
      return `${formatBrand(manufacturer)} ${model}`.trim();
    }
    if (model) {
      return model;
    }
    if (manufacturer) {
      return formatBrand(manufacturer);
    }
  }

  if (Platform.OS === 'ios') {
    const iosName = constants?.deviceName || constants?.Model;
    if (iosName) {
      return iosName;
    }
  }

  return Platform.OS === 'ios' ? 'iOS Device' : 'Android Device';
};

const formatBrand = (value: string): string => {
  if (!value) {
    return '';
  }
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const normalizeForHost = (value: string): string => {
  return value.toLowerCase().replace(/\s+/g, '');
};

const normalizeForFullName = (value: string): string => {
  return value.replace(/\s+/g, '');
};

