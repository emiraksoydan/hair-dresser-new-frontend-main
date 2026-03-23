import { Stack } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { Text } from '../../components/common/Text'

const StoreAndFreeBarbersLayout = () => {
    return (
        <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#151618' },
        }}>
            <Stack.Screen name="index" />
        </Stack>
    )
}

export default StoreAndFreeBarbersLayout

