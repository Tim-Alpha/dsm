import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import DeviceDiscovery from '../DeviceDiscovery';
import GlobalConnect from '../GlobalConnect';

type TabKey = 'local' | 'global';

const MainScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('local');

  const renderTab = () => {
    if (activeTab === 'local') {
      return <DeviceDiscovery />;
    }
    return <GlobalConnect />;
  };

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'local' && styles.navItemActive]}
          onPress={() => setActiveTab('local')}
        >
          <Text style={[styles.navText, activeTab === 'local' && styles.navTextActive]}>
            Local
          </Text>
          <Text style={[styles.navSubText, activeTab === 'local' && styles.navSubTextActive]}>
            Same network devices
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'global' && styles.navItemActive]}
          onPress={() => setActiveTab('global')}
        >
          <Text style={[styles.navText, activeTab === 'global' && styles.navTextActive]}>
            Global
          </Text>
          <Text style={[styles.navSubText, activeTab === 'global' && styles.navSubTextActive]}>
            Connect by ID
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>{renderTab()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navbar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F7F8FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E5ED',
  },
  navItem: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  navItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  navText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  navTextActive: {
    color: '#111827',
  },
  navSubText: {
    marginTop: 2,
    fontSize: 11,
    color: '#9CA3AF',
  },
  navSubTextActive: {
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
});

export default MainScreen;


