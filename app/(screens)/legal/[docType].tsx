import { Icon } from "react-native-paper";
import React from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { Text } from "../../components/common/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { useTheme } from "../../hook/useTheme";
import { useLanguage } from "../../hook/useLanguage";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { getLegalDocuments, LegalDocumentType } from "../../constants/legal";

const VALID_DOC_TYPES: LegalDocumentType[] = ["kvkk", "terms", "privacy", "consent"];

export default function LegalDocumentPage() {
    const router = useSafeNavigation();
    const { colors } = useTheme();
    const { currentLanguage } = useLanguage();
    const { docType } = useLocalSearchParams<{ docType: string }>();

    const resolvedType: LegalDocumentType = VALID_DOC_TYPES.includes(docType as LegalDocumentType)
        ? (docType as LegalDocumentType)
        : "kvkk";

    const documents = getLegalDocuments(currentLanguage);
    const doc = documents[resolvedType];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.screenBg }} edges={["top"]}>
            {/* Header */}
            <View
                className="flex-row items-center justify-between px-3 py-2.5"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}
            >
                <View className="flex-row items-center flex-1">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{
                            padding: 8,
                            borderRadius: 12,
                            backgroundColor: colors.cardBg3,
                            borderWidth: 1,
                            borderColor: colors.borderColor2,
                        }}
                    >
                        <Icon source="chevron-left" size={24} color={colors.sectionHeaderText} />
                    </TouchableOpacity>
                    <View className="ml-2.5 flex-1">
                        <Text
                            className="text-base font-semibold"
                            style={{ color: colors.sectionHeaderText }}
                            numberOfLines={2}
                        >
                            {doc.title}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Content */}
            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                showsVerticalScrollIndicator={true}
            >
                <Text
                    style={{ color: colors.sectionHeaderText }}
                    className="text-sm leading-6 font-century-gothic-sans-regular"
                >
                    {doc.content}
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}
