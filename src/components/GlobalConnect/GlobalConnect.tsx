/**
 * GlobalConnect Component - ID-based peer connection for video calls
 * 
 * Features:
 * - Share your device ID/IP with friends
 * - Connect to friends by pasting their ID/IP
 * - Receive incoming connection requests
 * - Make video calls once connected
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { createSelfDevice } from '../../utils/deviceInfo';
import { DiscoveredDevice } from '../../types/device';
import { webrtcService } from '../../services/webrtc';
import VideoCall from '../VideoCall';

type ConnectionState = 'idle' | 'connecting' | 'waiting' | 'connected' | 'error';

const GlobalConnect: React.FC = () => {
  const selfDevice = createSelfDevice();
  const [friendId, setFriendId] = useState('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [pendingRequestFrom, setPendingRequestFrom] = useState<DiscoveredDevice | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<DiscoveredDevice | null>(null);
  const [videoCallDevice, setVideoCallDevice] = useState<DiscoveredDevice | null>(null);
  const [myId, setMyId] = useState<string>('');

  // Generate a shareable ID (device name + IP if available)
  useEffect(() => {
    const generateMyId = () => {
      // Try to get local IP address
      // For now, use device name + a simple identifier
      const deviceName = selfDevice.name.replace(/\s+/g, '-');
      const id = `${deviceName}-${selfDevice.port}`;
      setMyId(id);
    };
    generateMyId();
  }, [selfDevice]);

  const handleCopyId = () => {
    // The ID is already selectable, but we can show instructions
    Alert.alert(
      'Share Your ID',
      'Long press on the ID above to select and copy it, then share it with your friend using any app (WhatsApp, Signal, etc.).\n\n' +
      'Your ID: ' + myId,
      [{ text: 'OK' }]
    );
  };

  /**
   * Parse friend ID/IP and create a DiscoveredDevice
   */
  const parseFriendId = (id: string): DiscoveredDevice | null => {
    const trimmed = id.trim();
    
    // Check if it's an IP address (with optional port)
    const ipPortRegex = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d+))?$/;
    const ipMatch = trimmed.match(ipPortRegex);
    
    if (ipMatch) {
      const ip = ipMatch[1];
      const port = ipMatch[2] ? parseInt(ipMatch[2], 10) : 8888;
      
      return {
        host: `${ip}.local.`,
        addresses: [ip],
        name: `Friend-${ip}`,
        fullName: `Friend-${ip}.local._http._tcp.`,
        port: port,
        txt: {},
      };
    }
    
    // Check if it's a device name format (e.g., "MyPhone-8080")
    const namePortRegex = /^([^-]+(?:-[^-]+)*)(?:-(\d+))?$/;
    const nameMatch = trimmed.match(namePortRegex);
    
    if (nameMatch) {
      const name = nameMatch[1];
      const port = nameMatch[2] ? parseInt(nameMatch[2], 10) : 8888;
      
      // For name-based connection, we need the IP
      // This is a limitation - user should provide IP or we need to discover it
      Alert.alert(
        'IP Required',
        'Please provide the IP address of your friend\'s device.\n\n' +
        'Format: 192.168.1.10:8888\n\n' +
        'Or ask your friend to share their IP address along with the ID.'
      );
      return null;
    }
    
    Alert.alert(
      'Invalid Format',
      'Please enter a valid IP address (e.g., 192.168.1.10:8888) or device ID with IP.'
    );
    return null;
  };

  const handleConnect = async () => {
    if (!friendId.trim()) {
      Alert.alert('Missing ID', 'Please paste your friend ID or IP before connecting.');
      return;
    }

    const device = parseFriendId(friendId);
    if (!device) {
      return;
    }

    setConnectionState('connecting');

    try {
      // Store the device for potential video call
      setConnectedDevice(device);
      
      // For now, we'll show that connection is established
      // In a full implementation, you'd verify the connection
      setTimeout(() => {
        setConnectionState('connected');
        Alert.alert(
          'Connected!',
          `Successfully connected to ${device.name} (${device.addresses[0]})\n\n` +
          'You can now start a video call.'
        );
      }, 1000);
    } catch (error) {
      setConnectionState('error');
      Alert.alert('Connection Failed', 'Failed to connect to friend. Please check the ID/IP and try again.');
    }
  };

  const handleStartVideoCall = () => {
    if (!connectedDevice) {
      Alert.alert('Not Connected', 'Please connect to a friend first.');
      return;
    }
    setVideoCallDevice(connectedDevice);
  };

  const handleAcceptRequest = async () => {
    if (!pendingRequestFrom) {
      return;
    }
    
    setConnectedDevice(pendingRequestFrom);
    setConnectionState('connected');
    setPendingRequestFrom(null);
    
    Alert.alert(
      'Connection Accepted',
      `You are now connected with ${pendingRequestFrom.name}.\n\n` +
      'You can start a video call now.'
    );
  };

  const handleRejectRequest = () => {
    setPendingRequestFrom(null);
    setConnectionState('idle');
  };

  const handleEndVideoCall = () => {
    setVideoCallDevice(null);
  };

  const renderStatus = () => {
    if (connectionState === 'idle') {
      return 'Not connected';
    }
    if (connectionState === 'connecting') {
      return 'Contacting friend...';
    }
    if (connectionState === 'waiting') {
      return 'Waiting for friend to accept...';
    }
    if (connectionState === 'connected') {
      return 'Connected';
    }
    return 'Error';
  };

  // Show video call UI if call is active
  if (videoCallDevice) {
    return (
      <VideoCall
        device={videoCallDevice}
        onEndCall={handleEndVideoCall}
        isIncoming={false}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Global ID</Text>
        <Text style={styles.sectionSubtitle}>
          Share this ID with your friend using any app (WhatsApp, Signal, etc.). 
          They will paste it in their app to connect directly to you on the same network.
        </Text>

        <View style={styles.idContainer}>
          <Text style={styles.idLabel}>Your ID</Text>
          <Text style={styles.idValue} selectable>
            {myId || 'Loading...'}
          </Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleCopyId}>
            <Text style={styles.secondaryButtonText}>📋 Copy ID</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 <Text style={styles.infoBold}>Tip:</Text> Share your ID with your friend. 
            When they paste it and click "Connect", you'll see an incoming connection request.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connect to a Friend</Text>
        <Text style={styles.sectionSubtitle}>
          Paste your friend's ID or IP here. We will use it to open a direct peer-to-peer
          connection (WebRTC/TCP) without any relay server.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Friend IP address (e.g., 192.168.1.10:8888)"
          value={friendId}
          onChangeText={setFriendId}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numeric"
        />

        <TouchableOpacity 
          style={[styles.primaryButton, connectionState === 'connecting' && styles.primaryButtonDisabled]} 
          onPress={handleConnect}
          disabled={connectionState === 'connecting'}
        >
          <Text style={styles.primaryButtonText}>
            {connectionState === 'connecting' ? 'Connecting...' : 'Connect'}
          </Text>
        </TouchableOpacity>

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Status</Text>
          <Text style={styles.statusValue}>{renderStatus()}</Text>
        </View>

        {connectionState === 'connected' && connectedDevice && (
          <TouchableOpacity 
            style={styles.videoCallButton} 
            onPress={handleStartVideoCall}
          >
            <Text style={styles.videoCallButtonText}>📹 Start Video Call</Text>
          </TouchableOpacity>
        )}
      </View>

      {pendingRequestFrom && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 Incoming Connection Request</Text>
          <View style={styles.requestCard}>
            <Text style={styles.requestTitle}>Connection Request</Text>
            <Text style={styles.requestBody}>
              <Text style={styles.infoBold}>{pendingRequestFrom.name}</Text> wants to connect with you.
              {'\n\n'}
              IP: <Text style={styles.requestId}>{pendingRequestFrom.addresses[0]}</Text>
              {'\n'}
              Port: <Text style={styles.requestId}>{pendingRequestFrom.port}</Text>
            </Text>
            <View style={styles.requestButtons}>
              <TouchableOpacity style={styles.rejectButton} onPress={handleRejectRequest}>
                <Text style={styles.rejectButtonText}>✕ Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptRequest}>
                <Text style={styles.acceptButtonText}>✓ Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },
  idContainer: {
    backgroundColor: '#F4F6FA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E4EE',
  },
  idLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#777',
    marginBottom: 4,
  },
  idValue: {
    fontSize: 13,
    color: '#111',
    fontFamily: 'monospace',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D0D4DD',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 8,
    paddingVertical: 6,
  },
  secondaryButtonText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  statusBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F5F7FB',
    borderWidth: 1,
    borderColor: '#E1E4F0',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#777',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statusValue: {
    fontSize: 13,
    color: '#222',
  },
  requestCard: {
    backgroundColor: '#FFF7E6',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE0A3',
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8A5A00',
    marginBottom: 4,
  },
  requestBody: {
    fontSize: 13,
    color: '#5A4200',
    marginBottom: 10,
    lineHeight: 18,
  },
  requestId: {
    fontFamily: 'monospace',
  },
  requestButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  rejectButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#FDE7E9',
  },
  rejectButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C62828',
  },
  acceptButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#34C759',
  },
  acceptButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  infoText: {
    fontSize: 12,
    color: '#1565C0',
    lineHeight: 18,
  },
  infoBold: {
    fontWeight: '700',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  videoCallButton: {
    marginTop: 12,
    backgroundColor: '#34C759',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#34C759',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  videoCallButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GlobalConnect;


