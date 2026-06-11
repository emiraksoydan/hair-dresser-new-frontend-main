import React from "react";
import { View, ScrollView, TouchableOpacity, Linking, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "react-native-paper";
import { Text } from "../components/common/Text";
import { useTheme } from "../hook/useTheme";
import { useSafeNavigation } from "../hook/useSafeNavigation";

const SUPPORT_EMAIL = "gumusmakastr@gmail.com";

export default function HelpSupportScreen() {
  const { colors } = useTheme();
  const router = useSafeNavigation();

  const openMail = async () => {
    const subject = encodeURIComponent("Gümüş Makas - Destek / İletişim");
    const body = encodeURIComponent(
      `Merhaba Gümüş Makas ekibi,\n\n\n\n— — —\nUygulama: Gümüş Makas\nPlatform: ${Platform.OS}`,
    );
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "E-posta uygulaması bulunamadı",
          `Bize şu adresten ulaşabilirsiniz:\n${SUPPORT_EMAIL}`,
        );
      }
    } catch {
      Alert.alert(
        "E-posta açılamadı",
        `Bize şu adresten ulaşabilirsiniz:\n${SUPPORT_EMAIL}`,
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screenBg }} edges={["top", "left", "right"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderColor,
          backgroundColor: colors.cardBg,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.screenBg,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Icon source="arrow-left" size={22} color={colors.sectionHeaderText} />
        </TouchableOpacity>
        <Text
          style={{
            color: colors.sectionHeaderText,
            fontSize: 18,
            fontFamily: "CenturyGothic-Bold",
            flex: 1,
          }}
        >
          Yardım & Destek
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: colors.sectionHeaderText, fontSize: 15, lineHeight: 22, marginBottom: 16 }}>
          Bir sorun, öneri veya talebiniz mi var? Bize e-posta ile ulaşın; en kısa sürede dönüş yapalım.
        </Text>

        {/* Bize Ulaşın kartı */}
        <TouchableOpacity
          onPress={openMail}
          activeOpacity={0.8}
          style={{
            backgroundColor: colors.cardBg,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.borderColor,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: "rgba(212,175,55,0.15)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 14,
            }}
          >
            <Icon source="email-outline" size={24} color="#D4AF37" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.sectionHeaderText, fontSize: 16, fontFamily: "CenturyGothic-Bold" }}>
              Bize Ulaşın
            </Text>
            <Text style={{ color: colors.sectionHeaderText, opacity: 0.7, fontSize: 13, marginTop: 2 }}>
              {SUPPORT_EMAIL}
            </Text>
          </View>
          <Icon source="chevron-right" size={24} color="#6b7280" />
        </TouchableOpacity>

        <Text style={{ color: colors.sectionHeaderText, opacity: 0.55, fontSize: 12, marginTop: 14, lineHeight: 18 }}>
          E-posta uygulaması açılmazsa yukarıdaki adrese doğrudan yazabilirsiniz.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
