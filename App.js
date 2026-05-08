// App.js
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './constants/colors';

// Fix browser input outline on web
if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.textContent = `* { outline: none !important; box-shadow: none !important; }`;
  document.head.appendChild(style);
}

// Screens
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import EventListScreen from './screens/EventListScreen';
import CreateEventScreen from './screens/CreateEventScreen';
import AddItemsScreen from './screens/AddItemsScreen';
import ChecklistDetailScreen from './screens/ChecklistDetailScreen'; // ← NEW

// Still placeholders
const placeholder = (name) => () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>{name} Screen</Text>
  </View>
);

const ManageEventsScreen = placeholder('ManageEvents');
const RemindersScreen = placeholder('Reminders');
const SmartSuggestionsScreen = placeholder('SmartSuggestions');
const ProfileScreen = placeholder('Profile');

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MyEvents') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Reminders') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
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
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="ChecklistDetail" component={ChecklistDetailScreen} />
        <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
        <Stack.Screen name="AddItems" component={AddItemsScreen} />
        <Stack.Screen name="ManageEvents" component={ManageEventsScreen} />
        <Stack.Screen name="SmartSuggestions" component={SmartSuggestionsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}