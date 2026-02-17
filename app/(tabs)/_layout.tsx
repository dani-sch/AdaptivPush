import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#2f7cff',
        tabBarInactiveTintColor: '#6f7485',
        tabBarStyle: {
          backgroundColor: '#12141b',
          borderTopColor: '#202433',
          borderTopWidth: 1,
          height: 84,
          paddingTop: 10,
          paddingBottom: 18,
        },
        sceneStyle: {
          backgroundColor: '#03040b',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons color={color} name={focused ? 'home' : 'home-outline'} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons color={color} name={focused ? 'book' : 'book-outline'} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons color={color} name={focused ? 'time' : 'time-outline'} size={28} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons color={color} name={focused ? 'person' : 'person-outline'} size={28} />
          ),
        }}
      />
    </Tabs>
  );
}
