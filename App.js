// App.js
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, Platform } from 'react-native';

// Fix browser input outline on web
if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.textContent = `* { outline: none !important; box-shadow: none !important; }`;
  document.head.appendChild(style);
}

// Real screens
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';

// Still placeholders for now
const placeholder = (name) => () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>{name} Screen</Text>
  </View>
);

const HomeScreen = placeholder('Home');
const EventListScreen = placeholder('EventList');
const ChecklistDetailScreen = placeholder('ChecklistDetail');
const CreateEventScreen = placeholder('CreateEvent');
const AddItemsScreen = placeholder('AddItems');
const ManageEventsScreen = placeholder('ManageEvents');
const RemindersScreen = placeholder('Reminders');
const SmartSuggestionsScreen = placeholder('SmartSuggestions');
const ProfileScreen = placeholder('Profile');

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="MyEvents" component={EventListScreen} />
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