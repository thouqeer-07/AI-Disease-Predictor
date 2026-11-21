import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { LayoutDashboard, MessageSquare, Pill, UserCircle, Brain, Stethoscope, Shield, Users, Calendar, Mail, Clock } from 'lucide-react-native';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ChatScreen from '../screens/ChatScreen';
import ConsultationChatScreen from '../screens/ConsultationChatScreen';
import MedicineScreen from '../screens/MedicineScreen';
import AIPredictionScreen from '../screens/AIPredictionScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EmergencySOSScreen from '../screens/EmergencySOSScreen';
import DoctorOnboardingScreen from '../screens/DoctorOnboardingScreen';
import PatientOnboardingScreen from '../screens/PatientOnboardingScreen';
import DoctorConnectScreen from '../screens/DoctorConnectScreen';
import AdminScreen from '../screens/AdminScreen';
import ProcessedRequestsScreen from '../screens/ProcessedRequestsScreen';
import DoctorPatientsScreen from '../screens/DoctorPatientsScreen';
import DoctorAppointmentsScreen from '../screens/DoctorAppointmentsScreen';
import DoctorInquiriesScreen from '../screens/DoctorInquiriesScreen';
import TermsPrivacyScreen from '../screens/TermsPrivacyScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { user } = useSelector((state) => state.auth);
  const role = user?.user_metadata?.role || 'patient';

  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        let Icon;
        if (route.name === 'Home') Icon = LayoutDashboard;
        else if (route.name === 'Connect') Icon = Stethoscope;
        else if (route.name === 'Predict') Icon = Brain;
        else if (route.name === 'Chat') Icon = MessageSquare;
        else if (route.name === 'Meds') Icon = Pill;
        else if (route.name === 'Profile') Icon = UserCircle;
        else if (route.name === 'Admin') Icon = Shield;
        else if (route.name === 'Registry') Icon = Clock;
        else if (route.name === 'Patients') Icon = Users;
        else if (route.name === 'Appts') Icon = Calendar;
        else if (route.name === 'Inquiries') Icon = Mail;
        return <Icon size={size} color={color} />;
      },
      tabBarActiveTintColor: '#1d4ed8',
      tabBarInactiveTintColor: '#94a3b8',
      tabBarStyle: { height: 60, paddingBottom: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
      headerShown: true,
      headerStyle: { elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
      headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
      tabBarItemStyle: { paddingVertical: 4 }
    })}>
      {role === 'admin' ? (
        <>
          <Tab.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin Panel' }} />
          <Tab.Screen name="Registry" component={ProcessedRequestsScreen} options={{ title: 'Registry' }} />
          <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
        </>
      ) : role === 'doctor' ? (
        <>
          <Tab.Screen name="Patients" component={DoctorPatientsScreen} options={{ title: 'My Patients' }} />
          <Tab.Screen name="Appts" component={DoctorAppointmentsScreen} options={{ title: 'Appointments' }} />
          <Tab.Screen name="Inquiries" component={DoctorInquiriesScreen} options={{ title: 'Inquiries' }} />
          <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
        </>
      ) : (
        <>
          <Tab.Screen name="Home" component={DashboardScreen} options={{ title: 'AuraHealth' }} />
          <Tab.Screen name="Connect" component={DoctorConnectScreen} options={{ title: 'Find Doctor' }} />
          <Tab.Screen name="Predict" component={AIPredictionScreen} options={{ title: 'AI Predict' }} />
          <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'AI Assistant' }} />
          <Tab.Screen name="Meds" component={MedicineScreen} options={{ title: 'Medications' }} />
          <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
        </>
      )}
    </Tab.Navigator>
  );
};

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    <Stack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
  </Stack.Navigator>
);

const AppStack = () => {
  const { user } = useSelector((state) => state.auth);
  const role = user?.user_metadata?.role || 'patient';

  const isDoctorOnboarded = user?.user_metadata?.onboarded === true || user?.user_metadata?.onboarded === 'true' || Boolean(user?.user_metadata?.education);
  const isPatientOnboarded = user?.user_metadata?.health_onboarded === true || user?.user_metadata?.health_onboarded === 'true' || (user?.user_metadata?.age && user?.user_metadata?.weight_kg);

  const isDoctorPending = role === 'doctor' && !isDoctorOnboarded;
  const isPatientPending = role === 'patient' && !isPatientOnboarded;

  return (
    <Stack.Navigator>
      {isPatientPending ? (
        <Stack.Screen 
          name="PatientOnboarding" 
          component={PatientOnboardingScreen} 
          options={{ headerShown: false, gestureEnabled: false }} 
        />
      ) : isDoctorPending ? (
        <Stack.Screen 
          name="DoctorOnboarding" 
          component={DoctorOnboardingScreen} 
          options={{ headerShown: false, gestureEnabled: false }} 
        />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
          <Stack.Screen 
            name="ConsultationChat" 
            component={ConsultationChatScreen} 
            options={{ headerShown: false }} 
          />
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
        </>
      )}
      <Stack.Screen 
        name="TermsPrivacy" 
        component={TermsPrivacyScreen} 
        options={{ headerShown: false }} 
      />
    </Stack.Navigator>
  );
};

const RootNavigation = () => {
  const { user } = useSelector((state) => state.auth);

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default RootNavigation;
