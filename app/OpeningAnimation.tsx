import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    withSequence,
    withDelay,
    runOnJS,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { useTheme } from '@/app/themeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from './AppNavigator';
import {
    fetchFavorites,
    fetchStores,
    fetchNearbyStores,
    fetchCurrentAddress,
    fetchSavedAddresses,
    fetchCartItemCount, fetchUserData, fetchExpiringProducts, fetchOrders, fetchBaskets
} from './api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import {awaitExpression} from "@babel/types";
import {isAxiosError} from "axios";

const { width, height } = Dimensions.get('window');

type OpeningAnimationNavigationProp = StackNavigationProp<RootStackParamList, 'OpeningAnimation'>;

interface OpeningAnimationProps {
    onAnimationComplete: () => void;
}

export const OpeningAnimation: React.FC<OpeningAnimationProps> = ({ onAnimationComplete }) => {
    const { colors } = useTheme();
    const navigation = useNavigation<OpeningAnimationNavigationProp>();
    const scale = useSharedValue(0);
    const opacity = useSharedValue(1);
    const progress = useSharedValue(0);
    const [status, setStatus] = useState('Initializing...');
    const [showRetryOptions, setShowRetryOptions] = useState(false);
    const queryClient = useQueryClient();
    let startTime = Date.now();

    // const queries = [
    //     useQuery({ queryKey: ['favorites'], queryFn: fetchFavorites }),
    //     useQuery({ queryKey: ['stores'], queryFn: fetchStores }),
    //     useQuery({ queryKey: ['nearbyStores'], queryFn: fetchNearbyStores }),
    //     useQuery({ queryKey: ['savedAddresses'], queryFn: fetchSavedAddresses }),
    //     useQuery({ queryKey: ['currentAddress'], queryFn: fetchCurrentAddress }),
    //     useQuery({ queryKey: ['cartItemCount'], queryFn: fetchCartItemCount }),
    //     useQuery({ queryKey: ['userData'], queryFn: fetchUserData}),
    //     useQuery({ queryKey: ['expiringProducts'], queryFn: fetchExpiringProducts}),
    //     useQuery({ queryKey: ['orders'], queryFn: fetchOrders}),
    //     useQuery({ queryKey: ['baskets'], queryFn: fetchBaskets}),
    // ];

    const queries = [
        { name: 'favorites', query: useQuery({ queryKey: ['favorites'], queryFn: fetchFavorites }) },
        { name: 'stores', query: useQuery({ queryKey: ['stores'], queryFn: fetchStores }) },
        { name: 'nearbyStores', query: useQuery({ queryKey: ['nearbyStores'], queryFn: fetchNearbyStores }) },
        { name: 'savedAddresses', query: useQuery({ queryKey: ['savedAddresses'], queryFn: fetchSavedAddresses }) },
        { name: 'currentAddress', query: useQuery({ queryKey: ['currentAddress'], queryFn: fetchCurrentAddress }) },
        { name: 'cartItemCount', query: useQuery({ queryKey: ['cartItemCount'], queryFn: fetchCartItemCount }) },
        { name: 'userData', query: useQuery({ queryKey: ['userData'], queryFn: fetchUserData }) },
        { name: 'expiringProducts', query: useQuery({ queryKey: ['expiringProducts'], queryFn: fetchExpiringProducts }) },
        { name: 'orders', query: useQuery({ queryKey: ['orders'], queryFn: fetchOrders }) },
        { name: 'baskets', query: useQuery({ queryKey: ['baskets'], queryFn: fetchBaskets }) },
    ];


    const isLoading = queries.some(({query}) => query.isLoading);
    const hasError = queries.some(({query}) => query.error);
    const error = queries.find(({query}) => query.error);
    const has401Error = queries.some(({query}) => {
        const { error } = query;
        if (!error) return false;

        // Check if it's an Axios error with a status of 401
        if (isAxiosError(error) && error.response?.status === 401) {
            return true;
        }

        // Fallback for other error types with a `status` property
        if ('status' in error && error.status === 401) {
            return true;
        }

        return false;
    });

    const animationSequence = () => {
        scale.value = withSequence(
            withTiming(1, { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
            withDelay(100, withTiming(1.2, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }))
        );

        const MIN_LOADING_TIME = 3000; // 3 seconds minimum loading time
        const MAX_LOADING_TIME = 10000; // 10 seconds maximum loading time

        const updateProgress = () => {
            const elapsedTime = Date.now() - startTime;
            const progressValue = Math.min(elapsedTime / MIN_LOADING_TIME, 0.99);
            if (progressValue >= progress.value) {
                progress.value = withTiming(progressValue, { duration: 100 });
                if (progressValue < 0.25) {
                    setStatus(`Cargando... ${Math.round(progressValue * 100)}%`);
                } else if (progressValue < 0.5) {
                    setStatus(`Cargando Tiendas... ${Math.round(progressValue * 100)}%`);
                } else if (progressValue < 0.75) {
                    setStatus(`Cargando Productos... ${Math.round(progressValue * 100)}%`);
                } else {
                    setStatus(`Finalizando detalles... ${Math.round(progressValue * 100)}%`);
                }
            }
            if (elapsedTime < MAX_LOADING_TIME && (isLoading || progressValue < 0.99)) {
                requestAnimationFrame(updateProgress);
            } else if (!isLoading) {
                completeAnimation();
            } else {
                setStatus('La carga esta tardando mas de lo esperado');
                setShowRetryOptions(true);
            }
        };

        const completeAnimation = () => {
            progress.value = withTiming(1, { duration: 500 });
            setStatus('Data cargada exitosamente!');

            setTimeout(() => {
                opacity.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }, (finished) => {
                    if (finished) {
                        runOnJS(onAnimationComplete)();
                        runOnJS(navigation.replace)('MainTabs', { screen: 'PaginaInicio' });
                    }
                });
            }, 500);
        };
        updateProgress();
    };

    useEffect(() => {
        startTime = Date.now();

        if (hasError) {
            console.log("ERROR " + error?.name)
            if (has401Error) {
                console.log("YES");
                progress.value = 0;
                startTime = Date.now();
                queryClient.refetchQueries();
                animationSequence();
            } else {
                setStatus('Error occurred. Please try again or go back to login.');
                setShowRetryOptions(true);
            }
        } else {
            animationSequence();
        }

        return () => {
            // Cleanup if needed
        };
    }, [isLoading, hasError]);

    const handleRetry = () => {
        setShowRetryOptions(false);
        setStatus('Retrying...');
        progress.value = 0;
        startTime = Date.now();
        queryClient.refetchQueries();
        animationSequence();
    };

    const handleGoToLogin = () => {
        navigation.navigate('Login');
    };

    const circleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const progressStyle = useAnimatedStyle(() => ({
        width: interpolate(progress.value, [0, 1], [0, width], Extrapolation.CLAMP),
    }));

    return (
        <View style={[styles.container, {backgroundColor: colors.secondaryBackground}]}>
            <Animated.View style={[styles.circle, circleStyle, { backgroundColor: colors.backgroundAnimation }]} />
            <View style={styles.contentContainer}>
                <LottieView
                    source={require('../assets/animations/laoding.json')}
                    autoPlay
                    loop
                    style={styles.lottieAnimation}
                />
                <Text style={[styles.status, { color: colors.textOpening }]}>{status}</Text>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <Animated.View style={[styles.progress, progressStyle, { backgroundColor: colors.accent }]} />
                </View>
                {showRetryOptions && (
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.button} onPress={handleRetry}>
                            <Text style={styles.buttonText}>Volver a intentar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.button} onPress={handleGoToLogin}>
                            <Text style={styles.buttonText}>Volver a inicio</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    circle: {
        width: Math.max(width, height) * 2,
        height: Math.max(width, height) * 2,
        borderRadius: Math.max(width, height),
        position: 'absolute',
    },
    contentContainer: {
        position: 'absolute',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 20,
    },
    lottieAnimation: {
        width: 200,
        height: 200,
    },
    status: {
        fontSize: 18,
        marginBottom: 10,
        textAlign: 'center',
    },
    progressBar: {
        width: '100%',
        height: 10,
        borderRadius: 5,
        overflow: 'hidden',
    },
    progress: {
        height: '100%',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: 20,
    },
    button: {
        backgroundColor: "#1B6B4A",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
        marginHorizontal: 10,
    },
    buttonText: {
        color: "white",
        fontSize: 16,
        fontWeight: 'bold',
    },
});

