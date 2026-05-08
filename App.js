// App.js
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './constants/colors';

// Fix browser input outline on web
if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.textContent = `* { outline: none !important; box-shadow: none !important; }`;
  document.head.appendChild(style);
}

// ── Screens ──
import SplashScreen           from './screens/SplashScreen';
import LoginScreen            from './screens/LoginScreen';
import SignUpScreen           from './screens/SignUpScreen';
import HomeScreen             from './screens/HomeScreen';
import EventListScreen        from './screens/EventListScreen';
import CreateEventScreen      from './screens/CreateEventScreen';
import AddItemsScreen         from './screens/AddItemsScreen';
import ChecklistDetailScreen  from './screens/ChecklistDetailScreen';
import SmartSuggestionsScreen from './screens/SmartSuggestionsScreen';
import ProfileScreen          from './screens/ProfileScreen';   // ← NEW

// ── Still placeholder (Phase 3 final) ──
import { View, Text } from 'react-native';
const RemindersScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Reminders Screen</Text>
  </View>
);

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          borderTopWidth:  1,
          borderTopColor:  COLORS.border,
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
      <Tab.Screen name="Home"      component={HomeScreen} />
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

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash"           component={SplashScreen} />
        <Stack.Screen name="Login"            component={LoginScreen} />
        <Stack.Screen name="SignUp"           component={SignUpScreen} />
        <Stack.Screen name="Main"             component={MainTabs} />
        <Stack.Screen name="ChecklistDetail"  component={ChecklistDetailScreen} />
        <Stack.Screen name="CreateEvent"      component={CreateEventScreen} />
        <Stack.Screen name="AddItems"         component={AddItemsScreen} />
        <Stack.Screen name="SmartSuggestions" component={SmartSuggestionsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}