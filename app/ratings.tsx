import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { QueryClient, useMutation, useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from './AppNavigator';
import {useTheme} from "@/app/themeContext";

type RatingPageRouteProp = RouteProp<RootStackParamList, 'Rating'>;

const API_BASE_URL = 'https://regusto.azurewebsites.net/api';

const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return { token };
};

const queryClient = new QueryClient();

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
};

interface RatingInfo {
    description: string;
    stars: number;
}

const fetchRatingStatus = async (orderId: string): Promise<{ status: string }> => {
    const { token } = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/rating/${orderId}/ratingStatus`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });
    const data = await handleResponse(response);
    console.log('Rating status:', data);
    return data;
};

export const fetchRatingInfo = async (orderId: string): Promise<RatingInfo[]> => {
    const { token } = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/rating/${orderId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });
    return handleResponse(response);
};

const submitRating = async ({ order_id, stars, description }: { order_id: string; stars: number; description: string }) => {
    const { token } = await getAuthHeaders();
    console.log('Submitting rating:', JSON.stringify({ stars, description }));
    const response = await fetch(`${API_BASE_URL}/rating/${order_id}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stars, description }),
    });
    return handleResponse(response);
};

const stopRating = async (orderId: string) => {
    const { token } = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/rating/${orderId}/stopRating`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });
    return handleResponse(response);
};

export default function RatingPage({ navigation }: { navigation: NavigationProp<any> }) {
    const { colors } = useTheme();
    const route = useRoute<RatingPageRouteProp>();
    const { order } = route.params;
    const [rating, setRating] = useState(0);
    const [description, setDescription] = useState('');
    const [isRated, setIsRated] = useState(false);

    const { data: ratingStatus, isLoading, isError } = useQuery({
        queryKey: ['ratingStatus', order.order_id],
        queryFn: () => fetchRatingStatus(order.order_id),
    });

    const { data: ratingInfo, isLoading: isLoadingInfo, isError: isErrorInfo } = useQuery({
        queryKey: ['ratingInfo', order.order_id],
        queryFn: () => fetchRatingInfo(order.order_id),
    });

    useEffect(() => {
        if(order.rating === 'rated') {
            setIsRated(true);
        }
        if(isRated){
            queryClient.invalidateQueries({ queryKey: ['ratingInfo', order.order_id] });
        }
        if (ratingInfo) {
            setRating(ratingInfo[0].stars);
            if (ratingInfo[0].description) {
                setDescription(ratingInfo[0].description);
            }
        }
    }, [ratingStatus]);

    const submitMutation = useMutation({
        mutationFn: submitRating,
        onSuccess: () => {
            Alert.alert('Success', 'Calificación enviada con éxito.');
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['ratingStatus', order.order_id] });
            queryClient.invalidateQueries({ queryKey: ['ratingInfo', order.order_id] });
            order.rating = 'rated';
            setIsRated(true);
            navigation.navigate('OrderDetails', { order: order });
        },
        onError: (error: Error) => {
            Alert.alert('Error', `Error al enviar la calificación: ${error.message}`);
        },
    });

    const stopRatingMutation = useMutation({
        mutationFn: stopRating,
        onSuccess: () => {
            Alert.alert('Rating Skipped', 'You have chosen not to rate this order.');
            navigation.goBack();
        },
        onError: (error: Error) => {
            Alert.alert('Error', `Failed to skip rating: ${error.message}`);
        },
    });

    const handleSubmit = useCallback(() => {
        if (rating === 0) {
            Alert.alert('Error', 'Por favor selecciona una calificación.');
            return;
        }
        let order_id = order.order_id;
        submitMutation.mutate({ order_id, stars: rating, description });
    }, [order.order_id, rating, description, submitMutation]);

    const handleSkip = useCallback(() => {
        stopRatingMutation.mutate(order.order_id);
    }, [order, stopRatingMutation]);

    if (isLoading || isLoadingInfo) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (isError || (isErrorInfo && ratingStatus?.status === 'rated')) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>Error cargando los datos. Por favor intente de nuevo.</Text>
            </View>
        );
    }

    console.log(isRated);

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={[styles.title, { color: colors.text }]}>{isRated ? 'Tu calificación' : 'Calificar la orden'}</Text>
                <Text style={[styles.subtitle, { color: colors.text }]}>Orden #{order.order_id}</Text>
                <View style={styles.ratingContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                            key={star}
                            onPress={() => !isRated && setRating(star)}
                            disabled={isRated}
                        >
                            <Feather
                                name="star"
                                size={40}
                                color={star <= rating ? '#FFC107' : colors.text}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.secondaryBackground, color: colors.text }]}
                    placeholder={description.length > 0 ? "Agregar un comentario (Opcional)" : "No hay Descripcion"}
                    value={description}
                    onChangeText={(text) => !isRated && setDescription(text)}
                    multiline
                    editable={!isRated}
                    placeholderTextColor={colors.placeholder}
                />
                {!isRated && (
                    <>
                        <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
                            <Text style={[styles.submitButtonText, { color: colors.overText }]}>Enviar Calificación</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.skipButton, { borderColor: colors.primary }]} onPress={handleSkip}>
                            <Text style={[styles.skipButtonText, { color: colors.primary }]}>No calificar</Text>
                        </TouchableOpacity>
                    </>
                )}
                {isRated && (
                    <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.primary }]}
                                      onPress={() => navigation.goBack()
                    }>
                        <Text style={[styles.backButtonText, { color: colors.overText }]}>Volver a los detalles de la orden</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        marginBottom: 24,
        textAlign: 'center',
    },
    ratingContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 24,
    },
    input: {
        borderRadius: 8,
        padding: 12,
        marginBottom: 24,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    submitButton: {
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    skipButton: {
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
    },
    skipButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    backButton: {
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        textAlign: 'center',
        fontSize: 16,
    },
});