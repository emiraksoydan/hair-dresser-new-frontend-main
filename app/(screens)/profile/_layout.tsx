import { Stack } from "expo-router";
import { useTheme } from "../../hook/useTheme";

export default function ProfileScreensLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.screenBg },
      }}
    />
  );
}
