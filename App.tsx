import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MainScreen from './src/components/MainScreen/MainScreen';
import { webrtcService } from './src/services/webrtc';

function App(): React.JSX.Element {
  useEffect(() => {
    // Initialize signaling server when app starts
    webrtcService.initializeSignalingServer().catch((error) => {
      console.error('[App] Failed to initialize signaling server:', error);
    });

    // Cleanup on unmount
    return () => {
      webrtcService.cleanup();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <MainScreen />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default App;
