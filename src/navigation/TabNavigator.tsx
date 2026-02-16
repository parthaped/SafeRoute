import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { HomeScreen, MapScreen, ProfileScreen } from '../screens';
import {
  RouteArrowIcon,
  PersonIcon,
} from '../components/icons/Icons';
import { SafeRouteLogo } from '../components';
import { colors } from '../theme/colors';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

function TabBarIcon({
  name,
  focused,
}: {
  name: 'route' | 'safety' | 'profile';
  focused: boolean;
}) {
  const activeColor = colors.tabActive;
  const inactiveColor = colors.tabInactive;

  switch (name) {
    case 'route':
      return <RouteArrowIcon color={focused ? activeColor : inactiveColor} />;
    case 'safety':
      return (
        <SafeRouteLogo
          width={48}
          height={48}
          showText={false}
          color={focused ? activeColor : '#808080'}
        />
      );
    case 'profile':
      return <PersonIcon color={focused ? activeColor : inactiveColor} />;
    default:
      return null;
  }
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Safety"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
          height: 84,
          paddingBottom: 28,
          paddingTop: 12,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.95)' }]} />
          ),
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Route"
        component={MapScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="route" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Safety"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="safety" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon name="profile" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
