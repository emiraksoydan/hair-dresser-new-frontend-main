import { StyleSheet, View } from 'react-native'
import { Text } from '../../components/common/Text'
import React from 'react'
import { Stack } from 'expo-router'

const FreeBarberLayout = () => {
    return (
        <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#f5f7fa' },
        }}>
            <Stack.Screen name="index" />
        </Stack>
    )
}

export default FreeBarberLayout

