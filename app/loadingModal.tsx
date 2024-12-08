import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    Easing,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface LoadingModalProps {
    progress: number;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ progress }) => {
    const insets = useSafeAreaInsets();
    const scale = useSharedValue(1);
    const animatedProgress = useSharedValue(0);

    useEffect(() => {
        scale.value = withRepeat(
            withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
    }, []);

    useEffect(() => {
        animatedProgress.value = withTiming(progress, { duration: 500, easing: Easing.inOut(Easing.ease) });
    }, [progress]);


    const circleStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    scale: scale.value,
                },
            ],
        };
    });

    const barStyle = useAnimatedStyle(() => {
        return {
            width: interpolate(animatedProgress.value, [0, 100], [0, width - 40], Extrapolation.CLAMP),
        };
    });

    const renderLoadingDots = () => {
        return ['', '', ''].map((_, index) => (
            <Animated.View
                key={index}
                style={[
                    styles.dot,
                    useAnimatedStyle(() => ({
                        opacity: withRepeat(
                            withDelay(
                                index * 200,
                                withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) })
                            ),
                            -1,
                            true
                        ),
                    })),
                ]}
            />
        ));
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <Animated.View style={[styles.circle, circleStyle]}>
                <Text style={styles.logoText}>R</Text>
            </Animated.View>
            <Text style={styles.title}>ReGusto</Text>
            <Text style={styles.subtitle}>Reduciendo el desperdicio alimentario</Text>
            <View style={styles.loadingContainer}>
                <Animated.View style={[styles.loadingBar, barStyle]} />
            </View>
            <View style={styles.loadingTextContainer}>
                <Text style={styles.loadingText}>Cargando</Text>
                {renderLoadingDots()}
            </View>
            <Animated.Text style={styles.progressText}>
                {Math.round(progress)}%
            </Animated.Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F7F7F7',
    },
    circle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#269577',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    logoText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#F4D548',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#269577',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#269577',
        marginBottom: 40,
        textAlign: 'center',
    },
    loadingContainer: {
        width: width - 40,
        height: 6,
        backgroundColor: 'rgba(38, 149, 119, 0.2)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 20,
    },
    loadingBar: {
        height: '100%',
        backgroundColor: '#269577',
        borderRadius: 3,
    },
    loadingTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 18,
        color: '#269577',
        marginRight: 5,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#269577',
        marginHorizontal: 2,
    },
    progressText: {
        fontSize: 16,
        color: '#269577',
        marginTop: 10,
    },
});

export default LoadingModal;