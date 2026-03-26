import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: '#03040b',
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="personal-information" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="privacy-data" />
      <Stack.Screen name="help-support" />
    </Stack>
  );
}
