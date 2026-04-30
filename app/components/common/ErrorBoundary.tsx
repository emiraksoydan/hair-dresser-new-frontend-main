import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from './Text';
import { MESSAGES } from '../../constants/messages';
import { useTheme } from '../../hook/useTheme';
import { COLORS } from '../../constants/colors';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    retryKey: number;
}

const ErrorBoundaryFallback: React.FC<{
    onRetry: () => void;
}> = ({ onRetry }) => {
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
                        marginBottom: 20,
                    }}
                >
                    {MESSAGES.ERRORS.UNEXPECTED}
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
            </View>
        </View>
    );
};

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, retryKey: 0 };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
        // Error caught silently
    }

    handleReset = () => {
        // retryKey artışı children'ı tamamen yeniden mount eder — aynı hatanın
        // tekrar fırlatılması engellenir (sadece state sıfırlamak yetmez).
        this.setState((s) => ({ hasError: false, error: undefined, retryKey: s.retryKey + 1 }));
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <ErrorBoundaryFallback onRetry={this.handleReset} />
            );
        }

        return (
            <React.Fragment key={this.state.retryKey}>
                {this.props.children}
            </React.Fragment>
        );
    }
}

