/**
 * DeviceDiscovery Component - Main component for device discovery functionality
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { zeroconfService } from '../../services/zeroconf/ZeroconfService';
import { deviceStore } from '../../stores/deviceStore';
import { DiscoveredDevice } from '../../types/device';
import { createSelfDevice } from '../../utils/deviceInfo';
import DeviceList from '../DeviceList';

const DeviceDiscovery: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const publishedServiceNameRef = useRef<string | null>(null);

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

    // Initial devices load
    updateDevices();

    // Cleanup on unmount
    return () => {
      zeroconfService.stopScan();
      // Unpublish if published
      if (publishedServiceNameRef.current) {
        zeroconfService.unpublishService(publishedServiceNameRef.current);
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
      deviceStore.clear();
      updateDevices();
      
      const success = zeroconfService.startScan();
      if (!success) {
        // Error message is already set by the service via callbacks
        // Just show a user-friendly alert
        Alert.alert(
          'Scan Error',
          'Failed to start scanning. The native module may not be properly linked.\n\n' +
          'Please rebuild the app:\n' +
          '1. Stop Metro bundler\n' +
          '2. Run: ./rebuild-android.sh\n' +
          'Or manually: cd android && ./gradlew clean && cd .. && npm run android'
        );
      }
    }
  };

  /**
   * Handle publish/unpublish toggle
   */
  const handleTogglePublish = () => {
    if (isPublished) {
      // Unpublish
      if (publishedServiceNameRef.current) {
        const success = zeroconfService.unpublishService(publishedServiceNameRef.current);
        if (success) {
          setIsPublished(false);
          publishedServiceNameRef.current = null;
        } else {
          Alert.alert('Error', 'Failed to unpublish service');
        }
      }
    } else {
      // Publish
      if (!zeroconfService.isReady()) {
        Alert.alert(
          'Not Available',
          'Zeroconf is not initialized. Please rebuild the app to enable publishing.'
        );
        return;
      }

      const selfDevice = createSelfDevice();
      const serviceName = selfDevice.name.replace(/\s+/g, '');
      
      const success = zeroconfService.publishService(
        'http',
        'tcp',
        'local.',
        serviceName,
        selfDevice.port,
        selfDevice.txt || {}
      );

      if (success) {
        setIsPublished(true);
        publishedServiceNameRef.current = serviceName;
        Alert.alert(
          'Published!',
          'Your device is now discoverable on the network. Other devices scanning will be able to see you.'
        );
      } else {
        Alert.alert(
          'Publish Failed',
          'Failed to publish service. The native module may not be properly linked.'
        );
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
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.buttonHalf, isScanning && styles.buttonStop]}
            onPress={handleToggleScan}
            disabled={false}
          >
            {isScanning ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color="#fff" style={styles.spinner} />
                <Text style={styles.buttonText}>Stop Scan</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Start Scan</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonHalf,
              isPublished ? styles.buttonPublished : styles.buttonUnpublished,
            ]}
            onPress={handleTogglePublish}
            disabled={false}
          >
            <Text style={styles.buttonText}>
              {isPublished ? 'Unpublish' : 'Publish'}
            </Text>
          </TouchableOpacity>
        </View>

        {isPublished && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              ✓ Your device is discoverable on the network
            </Text>
          </View>
        )}

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
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    flex: 1,
  },
  buttonHalf: {
    flex: 1,
  },
  buttonSecond: {
    marginLeft: 12,
  },
  buttonStop: {
    backgroundColor: '#FF3B30',
  },
  buttonPublished: {
    backgroundColor: '#34C759',
  },
  buttonUnpublished: {
    backgroundColor: '#8E8E93',
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
  statusContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  statusText: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  deviceListContainer: {
    flex: 1,
  },
});

export default DeviceDiscovery;

