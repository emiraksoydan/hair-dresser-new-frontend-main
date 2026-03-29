import { Stack } from "expo-router";
import { useTheme } from "../../hook/useTheme";

const BarberStoreLayout = () => {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.screenBg },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
};

export default BarberStoreLayout;
