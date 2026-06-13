import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { LayoutDashboard, MessageSquare, Pill, UserCircle, Brain } from 'lucide-react-native';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ChatScreen from '../screens/ChatScreen';
import MedicineScreen from '../screens/MedicineScreen';
import AIPredictionScreen from '../screens/AIPredictionScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EmergencySOSScreen from '../screens/EmergencySOSScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => (
  <Tab.Navigator screenOptions={({ route }) => ({
    tabBarIcon: ({ color, size }) => {
      let Icon;
      if (route.name === 'Home') Icon = LayoutDashboard;
      else if (route.name === 'Predict') Icon = Brain;
      else if (route.name === 'Chat') Icon = MessageSquare;
      else if (route.name === 'Meds') Icon = Pill;
      else if (route.name === 'Profile') Icon = UserCircle;
      return <Icon size={size} color={color} />;
    },
    tabBarActiveTintColor: '#1d4ed8',
    tabBarInactiveTintColor: '#94a3b8',
    tabBarStyle: { height: 60, paddingBottom: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    headerShown: true,
    headerStyle: { elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitleStyle: { fontWeight: 'bold', fontSize: 18 }
  })}>
    <Tab.Screen name="Home" component={DashboardScreen} options={{ title: 'AuraHealth' }} />
    <Tab.Screen name="Predict" component={AIPredictionScreen} options={{ title: 'AI Predict' }} />
    <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'AI Assistant' }} />
    <Tab.Screen name="Meds" component={MedicineScreen} options={{ title: 'Medications' }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
  </Tab.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
    <Stack.Screen 
      name="EmergencySOS" 
      component={EmergencySOSScreen} 
      options={{ 
        title: 'Emergency SOS',
        headerBackTitle: 'Back',
        headerStyle: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', elevation: 0, shadowOpacity: 0 },
        headerTitleStyle: { fontWeight: 'bold', fontSize: 18 }
      }} 
    />
  </Stack.Navigator>
);

const RootNavigation = () => {
  const { user } = useSelector((state) => state.auth);

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default RootNavigation;
