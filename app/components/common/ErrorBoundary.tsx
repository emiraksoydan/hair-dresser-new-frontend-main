import React, { Component, ErrorInfo, ReactNode, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from './Text';
import { MESSAGES } from '../../constants/messages';
import { LegalModal } from './LegalModal';
import { LegalDocumentType } from '../../constants/legal';
import { useLanguage } from '../../hook/useLanguage';

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
                        <Text style={{ color: '#60a5fa', fontSize: 11, textDecorationLine: 'underline' }}>
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
                <View className="flex-1 bg-[#151618] items-center justify-center p-4">
                    <View className="bg-[#1a1b25] rounded-2xl p-6 items-center w-full max-w-sm border border-[#2a2c30]">
                        <Text className="text-white text-xl font-bold mb-4">
                            {MESSAGES.ALERTS.ERROR}
                        </Text>
                        <Text className="text-gray-400 text-center mb-4">
                            {this.state.error?.message || MESSAGES.ERRORS.UNEXPECTED}
                        </Text>
                        <TouchableOpacity
                            onPress={this.handleReset}
                            className="bg-[#c2a523] px-6 py-3 rounded-lg"
                        >
                            <Text className="text-white font-semibold">{MESSAGES.ACTIONS.RETRY}</Text>
                        </TouchableOpacity>
                        <ErrorLegalLinks />
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

