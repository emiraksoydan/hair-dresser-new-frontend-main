import { Stack } from 'expo-router'

const ProfileLayout = () => {
    return (
        <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0d0d12' },
        }}>
            <Stack.Screen name="index" />
        </Stack>
    )
}

export default ProfileLayout

