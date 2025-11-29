/**
 * VideoCall Component - Displays video call UI
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { RTCView, MediaStream } from 'react-native-webrtc';
import { webrtcService } from '../../services/webrtc';
import { DiscoveredDevice } from '../../types/device';

interface VideoCallProps {
  device: DiscoveredDevice | null;
  onEndCall: () => void;
  isIncoming?: boolean;
}

const VideoCall: React.FC<VideoCallProps> = ({
  device,
  onEndCall,
  isIncoming = false,
}) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callState, setCallState] = useState<'calling' | 'ringing' | 'connected' | 'ended'>(
    isIncoming ? 'ringing' : 'calling'
  );

  useEffect(() => {
    // Set up callbacks
    webrtcService.setCallbacks({
      onCallStateChange: (state) => {
        setCallState(state as any);
        if (state === 'ended') {
          onEndCall();
        }
      },
      onLocalStream: (stream) => {
        setLocalStream(stream);
      },
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
      },
      onError: (error) => {
        Alert.alert('Call Error', error.message);
        onEndCall();
      },
    });

    // Start call if not incoming
    if (!isIncoming && device) {
      webrtcService.startCall(device).catch((error) => {
        Alert.alert('Call Failed', error.message);
        onEndCall();
      });
    }

    // Cleanup
    return () => {
      webrtcService.endCall();
    };
  }, [device, isIncoming, onEndCall]);

  const handleAccept = () => {
    webrtcService.acceptCall().catch((error) => {
      Alert.alert('Failed to accept call', error.message);
    });
  };

  const handleReject = () => {
    webrtcService.rejectCall();
    onEndCall();
  };

  const handleEndCall = () => {
    webrtcService.endCall();
    onEndCall();
  };

  return (
    <View style={styles.container}>
      {/* Remote video (full screen) */}
      {remoteStream ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
          mirror={false}
        />
      ) : (
        <View style={styles.remoteVideoPlaceholder}>
          <Text style={styles.placeholderText}>
            {callState === 'calling' && 'Calling...'}
            {callState === 'ringing' && 'Incoming call...'}
            {callState === 'connected' && 'Connecting...'}
          </Text>
          {callState !== 'connected' && <ActivityIndicator size="large" color="#007AFF" />}
        </View>
      )}

      {/* Local video (picture-in-picture) */}
      {localStream && (
        <View style={styles.localVideoContainer}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror={true}
          />
        </View>
      )}

      {/* Call controls */}
      <View style={styles.controls}>
        {callState === 'ringing' && isIncoming && (
          <>
            <TouchableOpacity
              style={[styles.controlButton, styles.acceptButton]}
              onPress={handleAccept}
            >
              <Text style={styles.controlButtonText}>✓ Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, styles.rejectButton]}
              onPress={handleReject}
            >
              <Text style={styles.controlButtonText}>✕ Reject</Text>
            </TouchableOpacity>
          </>
        )}

        {callState === 'connected' && (
          <TouchableOpacity
            style={[styles.controlButton, styles.endButton]}
            onPress={handleEndCall}
          >
            <Text style={styles.controlButtonText}>End Call</Text>
          </TouchableOpacity>
        )}

        {(callState === 'calling' || callState === 'ringing') && !isIncoming && (
          <TouchableOpacity
            style={[styles.controlButton, styles.cancelButton]}
            onPress={handleEndCall}
          >
            <Text style={styles.controlButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Device info */}
      {device && (
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <Text style={styles.callStatus}>
            {callState === 'calling' && 'Calling...'}
            {callState === 'ringing' && 'Incoming call'}
            {callState === 'connected' && 'Connected'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideoPlaceholder: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  controlButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  endButton: {
    backgroundColor: '#FF3B30',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deviceInfo: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  deviceName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  callStatus: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
});

export default VideoCall;

