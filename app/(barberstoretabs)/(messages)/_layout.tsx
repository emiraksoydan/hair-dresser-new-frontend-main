import { Stack } from 'expo-router'
import { useTheme } from '../../hook/useTheme'

const MessagesLayout = () => {
    const { colors } = useTheme()
    return (
        <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.screenBg },
        }}>
            <Stack.Screen name="index" />
            <Stack.Screen
                name="details"
                options={{
                    presentation: 'modal',
                    headerShown: false,
                }}
            />
        </Stack>
    )
}

export default MessagesLayout

