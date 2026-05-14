// App.js
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import * as Notifications from 'expo-notifications';

import { auth } from './firebase';
import { ThemeProvider, useTheme } from './context/ThemeContext';

import LoginScreen            from './screens/LoginScreen';
import SignUpScreen            from './screens/SignUpScreen';
import SplashScreen           from './screens/SplashScreen';
import HomeScreen             from './screens/HomeScreen';
import EventListScreen        from './screens/EventListScreen';
import CreateEventScreen      from './screens/CreateEventScreen';
import AddItemsScreen         from './screens/AddItemsScreen';
import ChecklistDetailScreen  from './screens/ChecklistDetailScreen';
import SmartSuggestionsScreen from './screens/SmartSuggestionsScreen';
import ProfileScreen          from './screens/ProfileScreen';
import RemindersScreen        from './screens/RemindersScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          borderTopWidth:  1,
          borderTopColor:  colors.border,
          backgroundColor: colors.white,
          paddingBottom:   5,
          paddingTop:      5,
          height:          60,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home:      focused ? 'home'          : 'home-outline',
            MyEvents:  focused ? 'calendar'      : 'calendar-outline',
            Reminders: focused ? 'notifications' : 'notifications-outline',
            Profile:   focused ? 'person'        : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />

      {/* KEY FIX: The tabPress listener explicitly resets category to null.
          Without this, tapping "My Events" tab after selecting a category
          from HomeScreen leaves the old category param in route.params —
          React Navigation never clears params automatically on tab press.
          This listener fires BEFORE useFocusEffect, so EventListScreen
          always receives the correct category (null = show all) on tab tap. */}
      <Tab.Screen
        name="MyEvents"
        component={EventListScreen}
        options={{ title: 'My Events' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('MyEvents', { category: null });
          },
        })}
      />

      <Tab.Screen name="Reminders" component={RemindersScreen} />
      <Tab.Screen name="Profile"   component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { colors } = useTheme();
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for Firebase auth state changes
    // When user logs in/out, update state to trigger navigation stack switch
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // User logged in — initialize their Firestore document asynchronously
        // We use .then() instead of await so navigation updates immediately
        // The document creation happens in the background
        try {
          const { createUserDocument } = await import('./services/userService');
          createUserDocument(u).catch(err => 
            console.error('Failed to create user document:', err)
          );
        } catch (err) {
          console.error('Failed to import userService:', err);
        }
      }
      // Always update user state immediately (don't wait for Firestore)
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.background },
        }}
      >
        {loading ? (
          // Show splash screen while checking auth state
          <Stack.Screen name="Splash" component={SplashScreen} />
        ) : user ? (
          // User is logged in — show authenticated stack with tabs
          <>
            <Stack.Screen name="Main"            component={MainTabs} />
            <Stack.Screen name="ChecklistDetail" component={ChecklistDetailScreen} />
            <Stack.Screen name="CreateEvent"     component={CreateEventScreen} />
            <Stack.Screen name="AddItems"        component={AddItemsScreen} />
            <Stack.Screen name="SmartSuggestions" component={SmartSuggestionsScreen} />
          </>
        ) : (
          // User is NOT logged in — show auth stack
          <>
            <Stack.Screen name="Login"   component={LoginScreen} />
            <Stack.Screen name="SignUp"  component={SignUpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}