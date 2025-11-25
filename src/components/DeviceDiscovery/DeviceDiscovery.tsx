/**
 * DeviceDiscovery Component - Main component for device discovery functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { zeroconfService } from '../../services/zeroconf/ZeroconfService';
import { deviceStore } from '../../stores/deviceStore';
import { DiscoveredDevice } from '../../types/device';
import { createSelfDevice } from '../../utils/deviceInfo';
import DeviceList from '../DeviceList';

const DeviceDiscovery: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Update devices list from store
   */
  const updateDevices = useCallback(() => {
    setDevices(deviceStore.getAllDevices());
  }, []);

  /**
   * Setup zeroconf service callbacks
   */
  useEffect(() => {
    zeroconfService.setCallbacks({
      onStart: () => {
        setIsScanning(true);
        setError(null);
      },
      onStop: () => {
        setIsScanning(false);
      },
      onResolved: (_device: DiscoveredDevice) => {
        updateDevices();
      },
      onRemove: () => {
        updateDevices();
      },
      onError: (err: Error) => {
        setError(err.message);
        setIsScanning(false);
        Alert.alert('Discovery Error', err.message);
      },
    });

    // Add self device to the list
    const selfDevice = createSelfDevice();
    deviceStore.addDevice(selfDevice);
    
    // Try to publish self as a service so others can discover it
    try {
      zeroconfService.publishService(
        'http',
        'tcp',
        'local.',
        selfDevice.name.replace(/\s+/g, ''),
        selfDevice.port,
        selfDevice.txt || {}
      );
    } catch {
      // If publishing fails, that's okay - we still show self in the list
      console.warn('Failed to publish self service');
    }

    // Initial devices load
    updateDevices();

    // Cleanup on unmount
    return () => {
      zeroconfService.stopScan();
      // Unpublish self service
      try {
        zeroconfService.unpublishService(selfDevice.name.replace(/\s+/g, ''));
      } catch {
        // Ignore errors during cleanup
      }
      zeroconfService.cleanup();
    };
  }, [updateDevices]);

  /**
   * Handle start/stop scan
   */
  const handleToggleScan = () => {
    if (isScanning) {
      zeroconfService.stopScan();
    } else {
      try {
        deviceStore.clear();
        // Add self device back after clearing
        const selfDevice = createSelfDevice();
        deviceStore.addDevice(selfDevice);
        updateDevices();
        zeroconfService.startScan();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start scanning';
        setError(errorMessage);
        Alert.alert('Scan Error', errorMessage);
      }
    }
  };

  /**
   * Handle device press
   */
  const handleDevicePress = (device: DiscoveredDevice) => {
    Alert.alert(
      'Device Details',
      `Name: ${device.name}\nHost: ${device.host}\nPort: ${device.port}\nAddresses: ${device.addresses.join(', ')}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Device Discovery</Text>
        <Text style={styles.subtitle}>
          {devices.length} device{devices.length !== 1 ? 's' : ''} discovered
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, isScanning && styles.buttonStop]}
          onPress={handleToggleScan}
          disabled={false}
        >
          {isScanning ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color="#fff" style={styles.spinner} />
              <Text style={styles.buttonText}>Stop Scanning</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Start Scanning</Text>
          )}
        </TouchableOpacity>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
          </View>
        )}
      </View>

      <View style={styles.deviceListContainer}>
        <DeviceList devices={devices} onDevicePress={handleDevicePress} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  controls: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonStop: {
    backgroundColor: '#FF3B30',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
  },
  deviceListContainer: {
    flex: 1,
  },
});

export default DeviceDiscovery;

