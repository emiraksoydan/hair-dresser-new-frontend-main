import { Stack } from 'expo-router'
import { useTheme } from '../../hook/useTheme'

const Layout = () => {
    const { colors } = useTheme()
    return (
        <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.screenBg },
        }}>
            <Stack.Screen name="index" />
            <Stack.Screen
                name="[id]"
                options={{
                    presentation: 'modal',
                    headerShown: false,
                }}
            />
        </Stack>
    )
}

export default Layout

