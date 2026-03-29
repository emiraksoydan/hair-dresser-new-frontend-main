import React, { Component, ErrorInfo, ReactNode, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from './Text';
import { MESSAGES } from '../../constants/messages';
import { LegalModal } from './LegalModal';
import { LegalDocumentType } from '../../constants/legal';
import { useLanguage } from '../../hook/useLanguage';
import { useTheme } from '../../hook/useTheme';
import { COLORS } from '../../constants/colors';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

/** Legal links shown in error fallback so users can always access KVKK/legal docs */
const ErrorLegalLinks: React.FC = () => {
    const { t } = useLanguage();
    const { colors } = useTheme();
    const [modalDoc, setModalDoc] = useState<LegalDocumentType | null>(null);

    const links: { type: LegalDocumentType; labelKey: string }[] = [
        { type: 'kvkk', labelKey: 'legal.kvkk' },
        { type: 'terms', labelKey: 'legal.terms' },
        { type: 'privacy', labelKey: 'legal.privacy' },
        { type: 'consent', labelKey: 'legal.consent' },
    ];

    return (
        <View className="mt-6 items-center">
            <View className="flex-row flex-wrap justify-center gap-3">
                {links.map((link) => (
                    <TouchableOpacity
                        key={link.type}
                        onPress={() => setModalDoc(link.type)}
                        activeOpacity={0.6}
                    >
                        <Text style={{ color: colors.tagline, fontSize: 11, textDecorationLine: 'underline' }}>
                            {t(link.labelKey)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <LegalModal
                visible={modalDoc !== null}
                onClose={() => setModalDoc(null)}
                documentType={modalDoc || 'kvkk'}
            />
        </View>
    );
};

const ErrorBoundaryFallback: React.FC<{
    error?: Error;
    onRetry: () => void;
}> = ({ error, onRetry }) => {
    const { colors } = useTheme();
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: colors.screenBg,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
            }}
        >
            <View
                style={{
                    backgroundColor: colors.cardBg,
                    borderRadius: 16,
                    padding: 24,
                    alignItems: 'center',
                    width: '100%',
                    maxWidth: 384,
                    borderWidth: 1,
                    borderColor: colors.borderColor,
                }}
            >
                <Text
                    style={{
                        color: colors.headerText,
                        fontSize: 20,
                        fontWeight: '700',
                        marginBottom: 16,
                        textAlign: 'center',
                    }}
                >
                    {MESSAGES.ALERTS.ERROR}
                </Text>
                <Text
                    style={{
                        color: colors.textSecondary,
                        textAlign: 'center',
                        marginBottom: 16,
                    }}
                >
                    {error?.message || MESSAGES.ERRORS.UNEXPECTED}
                </Text>
                <TouchableOpacity
                    onPress={onRetry}
                    style={{
                        backgroundColor: COLORS.UI.ACCENT_GOLD,
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 8,
                    }}
                >
                    <Text style={{ color: COLORS.UI.TEXT_ON_GOLD, fontWeight: '600' }}>
                        {MESSAGES.ACTIONS.RETRY}
                    </Text>
                </TouchableOpacity>
                <ErrorLegalLinks />
            </View>
        </View>
    );
};

/**
 * Error Boundary component for global error handling
 * Catches JavaScript errors anywhere in the child component tree
 * Includes legal document links so users can always access KVKK docs
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Error caught silently
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <ErrorBoundaryFallback
                    error={this.state.error}
                    onRetry={this.handleReset}
                />
            );
        }

        return this.props.children;
    }
}

