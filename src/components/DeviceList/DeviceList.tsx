/**
 * DeviceList Component - Displays list of discovered devices
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { DiscoveredDevice } from '../../types/device';

interface DeviceListProps {
  devices: DiscoveredDevice[];
  onDevicePress?: (device: DiscoveredDevice) => void;
  onVideoCall?: (device: DiscoveredDevice) => void;
}

const DeviceList: React.FC<DeviceListProps> = ({ devices, onDevicePress, onVideoCall }) => {
  const isSelfDevice = (device: DiscoveredDevice): boolean => {
    return device.isSelf === true || device.txt?.self === 'true';
  };

  const renderDeviceItem = ({ item }: { item: DiscoveredDevice }) => {
    const isSelf = isSelfDevice(item);
    return (
      <TouchableOpacity
        style={[styles.deviceItem, isSelf && styles.deviceItemSelf]}
        onPress={() => onDevicePress?.(item)}
        activeOpacity={0.8}
      >
        <View style={styles.deviceContent}>
          <View style={styles.deviceHeader}>
            <View style={styles.deviceNameContainer}>
              <View style={styles.deviceIconContainer}>
                <View style={[styles.deviceIcon, isSelf && styles.deviceIconSelf]}>
                  <Text style={styles.deviceIconText}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.deviceInfoContainer}>
                <View style={styles.deviceTitleRow}>
                  <Text style={[styles.deviceName, isSelf && styles.deviceNameSelf]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {isSelf && (
                    <View style={styles.selfBadge}>
                      <Text style={styles.selfBadgeText}>YOU</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.deviceHost} numberOfLines={1}>
                  {item.host}
                </Text>
              </View>
            </View>
            <View style={styles.portBadge}>
              <Text style={styles.portText}>{item.port}</Text>
            </View>
          </View>

          {!isSelf && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.videoCallButton}
                onPress={() => onVideoCall?.(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.videoCallIcon}>📹</Text>
                <Text style={styles.videoCallText}>Video Call</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.metaRow}>
            <View style={[styles.metaColumn, styles.addressContainer]}>
              <Text style={styles.addressLabel}>Network Address</Text>
              <View style={styles.addressChips}>
                {item.addresses.map((address, index) => (
                  <View key={index} style={styles.addressChip}>
                    <Text style={styles.addressChipText}>{address}</Text>
                  </View>
                ))}
              </View>
            </View>

            {item.txt && Object.keys(item.txt).length > 0 && (
              <View style={[styles.metaColumn, styles.txtContainer]}>
                <Text style={styles.txtLabel}>Additional Info</Text>
                <View style={styles.txtItems}>
                  {Object.entries(item.txt)
                    .filter(([key]) => key !== 'self')
                    .map(([key, value]) => (
                      <View key={key} style={styles.txtItemRow}>
                        <Text style={styles.txtKey}>{key}:</Text>
                        <Text style={styles.txtValue}>{value}</Text>
                      </View>
                    ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (devices.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>📡</Text>
        </View>
        <Text style={styles.emptyText}>No devices discovered yet</Text>
        <Text style={styles.emptySubtext}>
          Tap "Start Scanning" to discover devices on your network
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={devices}
      renderItem={renderDeviceItem}
      keyExtractor={(item) => item.fullName}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={true}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  deviceItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
  },
  deviceItemSelf: {
    backgroundColor: '#F0F7FF',
    borderColor: '#2196F3',
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#2196F3',
        shadowOpacity: 0.15,
      },
    }),
  },
  deviceContent: {
    padding: 20,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  deviceNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  deviceIconContainer: {
    marginRight: 12,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  deviceIconSelf: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  deviceIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
  },
  deviceInfoContainer: {
    flex: 1,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginRight: 8,
    flexShrink: 1,
  },
  deviceNameSelf: {
    color: '#1565C0',
  },
  selfBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#2196F3',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  selfBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  deviceHost: {
    fontSize: 13,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  portBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  portText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  metaColumn: {
    flex: 1,
  },
  addressContainer: {
    marginBottom: 12,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  addressChip: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginRight: 8,
    marginBottom: 8,
  },
  addressChipText: {
    fontSize: 12,
    color: '#495057',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '500',
  },
  txtContainer: {
    marginBottom: 12,
    paddingTop: 0,
    borderTopWidth: 0,
  },
  txtLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  txtItems: {
    // Container for txt items
  },
  txtItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 4,
  },
  txtKey: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
    minWidth: 80,
  },
  txtValue: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIconText: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
  },
  actionRow: {
    marginTop: 12,
    marginBottom: 8,
  },
  videoCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  videoCallIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  videoCallText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DeviceList;

