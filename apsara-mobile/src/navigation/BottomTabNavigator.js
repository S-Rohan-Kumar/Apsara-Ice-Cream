import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  const tabBarStyle = useMemo(
    () => ({
      backgroundColor: colors.white,
      borderTopColor: '#F1F5F9',
      borderTopWidth: 1.2,
      height: 62 + bottomInset,
      paddingBottom: bottomInset,
      paddingTop: 6,
      elevation: 12,
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
    }),
    [bottomInset]
  );

  const screenOptions = useMemo(
    () =>
      ({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => {
          let iconName;
          let labelText;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
            labelText = 'Home';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
            labelText = 'Search';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'receipt' : 'receipt-outline';
            labelText = 'Orders';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
            labelText = 'Account';
          }

          return (
            <View style={styles.tabItem}>
              <View style={[styles.iconPill, focused && styles.iconPillActive]}>
                <Ionicons
                  name={iconName}
                  size={21}
                  color={focused ? colors.primary : '#94A3B8'}
                />
              </View>
              <Text style={[styles.tabLabel, focused ? styles.tabLabelActive : styles.tabLabelInactive]}>
                {labelText}
              </Text>
            </View>
          );
        },
      }),
    [tabBarStyle]
  );

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    paddingTop: 2,
  },
  iconPill: {
    paddingHorizontal: 15,
    paddingVertical: 3.5,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconPillActive: {
    backgroundColor: '#E6F4EA',
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    fontWeight: '800',
    color: colors.primary,
  },
  tabLabelInactive: {
    fontWeight: '600',
    color: '#64748B',
  },
});
