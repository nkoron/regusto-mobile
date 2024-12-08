import React, { useState, useEffect } from 'react'
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Animated,
    Easing,
    KeyboardAvoidingView,
    Platform,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PhoneVerificationOverlayProps {
    isVisible: boolean
    onClose: () => void
    phone: string
    onVerificationSuccess: () => void
    colors: any
}

export default function PhoneVerificationOverlay({
                                                     isVisible,
                                                     onClose,
                                                     phone,
                                                     onVerificationSuccess,
                                                     colors,
                                                 }: PhoneVerificationOverlayProps) {
    const [otp, setOtp] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [animation] = useState(new Animated.Value(0))

    useEffect(() => {
        if (isVisible) {
            setOtp('')
            Animated.timing(animation, {
                toValue: 1,
                duration: 300,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }).start()
        } else {
            Animated.timing(animation, {
                toValue: 0,
                duration: 300,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
            }).start()
        }
    }, [isVisible])

    const handleVerifyOtp = async () => {
        if (!otp.trim()) {
            Alert.alert('Error', 'Please enter the verification code')
            return
        }

        setIsLoading(true)
        try {
            const response = await fetch('https://regusto.azurewebsites.net/api/auth/confirm-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone,
                    otp,
                }),
            })

            const data = await response.json()

            if (response.ok) {
                await AsyncStorage.setItem('token', data.jwt);
                await AsyncStorage.setItem("userid", data.user.id);
                onVerificationSuccess()
            } else {
                Alert.alert('Error', data.message || 'Codigo de verificacion incorrecto')
            }
        } catch (error) {
            Alert.alert('Error', 'Ocurrion un error. Por favor intentelo de nuevo.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleResendCode = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('https://regusto.azurewebsites.net/api/auth/resend-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone,
                }),
            })

            const data = await response.json()

            if (response.ok) {
                Alert.alert('Success', 'Codigo de verificacion reenviado')
            } else {
                Alert.alert('Error', data.message || 'Error al reenviar el codigo de verificacion')
            }
        } catch (error) {
            Alert.alert('Error', 'Ocurrio un error. Por favor intentelo de nuevo.')
        } finally {
            setIsLoading(false)
        }
    }

    const overlayStyle = {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.background,
        opacity: animation,
        transform: [
            {
                translateY: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                }),
            },
        ],
    }

    if (!isVisible) return null

    return (
        <Animated.View style={overlayStyle}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Verify Your Phone</Text>
                        <TouchableOpacity onPress={onClose} disabled={isLoading}>
                            <Feather name="x" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.description, { color: colors.text }]}>
                        Por favor introudcir el codigo de verificacion enviado a su telefono:
                        {'\n'}
                        {phone}
                    </Text>

                    <TextInput
                        style={[
                            styles.input,
                            {
                                borderColor: colors.primary,
                                backgroundColor: colors.secondaryBackground,
                                color: colors.text,
                            },
                        ]}
                        placeholder="codigo de verificacion"
                        placeholderTextColor={colors.placeholder}
                        value={otp}
                        onChangeText={setOtp}
                        keyboardType="number-pad"
                        editable={!isLoading}
                    />

                    <TouchableOpacity
                        style={[
                            styles.verifyButton,
                            { backgroundColor: colors.primary },
                            isLoading && { opacity: 0.7 },
                        ]}
                        onPress={handleVerifyOtp}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={colors.overText} />
                        ) : (
                            <Text style={[styles.verifyButtonText, { color: colors.overText }]}>
                                Verificar telefono
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.resendButton, isLoading && { opacity: 0.7 }]}
                        onPress={handleResendCode}
                        disabled={isLoading}
                    >
                        <Text style={[styles.resendButtonText, { color: colors.primary }]}>
                           Reenviar codigo
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        width: '100%',
        maxWidth: 400,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    description: {
        marginBottom: 20,
        lineHeight: 20,
        fontSize: 16,
    },
    input: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderRadius: 25,
        paddingHorizontal: 20,
        marginBottom: 20,
        fontSize: 16,
    },
    verifyButton: {
        width: '100%',
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    verifyButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    resendButton: {
        width: '100%',
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resendButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
})

