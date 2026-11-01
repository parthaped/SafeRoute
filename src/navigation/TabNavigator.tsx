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
  const activeColor = colors.white;
  const inactiveColor = colors.tabInactive;

  let icon: React.ReactNode = null;
  switch (name) {
    case 'route':
      icon = <RouteArrowIcon color={focused ? activeColor : inactiveColor} />;
      break;
    case 'safety':
      icon = (
        <SafeRouteLogo
          width={44}
          height={44}
          showText={false}
          color={focused ? colors.primaryRed : 'rgba(255,255,255,0.25)'}
        />
      );
      break;
    case 'profile':
      icon = <PersonIcon color={focused ? activeColor : inactiveColor} />;
      break;
  }

  return (
    <View style={iconStyles.wrapper}>
      {icon}
      {focused && <View style={iconStyles.dot} />}
    </View>
  );
}

const iconStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.white,
    marginTop: 6,
  },
});

export function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Safety"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          backgroundColor: 'transparent',
          elevation: 0,
          height: 84,
          paddingBottom: 28,
          paddingTop: 12,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={90}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.97)' }]} />
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
