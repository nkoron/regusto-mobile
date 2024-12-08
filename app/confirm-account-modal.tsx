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

interface ConfirmAccountOverlayProps {
    isVisible: boolean
    onClose: () => void
    signupMethod: 'email' | 'phone'
    contactValue: string
    colors: any // Add proper type from your theme
}

export default function ConfirmAccountOverlay({
                                                  isVisible,
                                                  onClose,
                                                  signupMethod,
                                                  contactValue,
                                                  colors,
                                              }: ConfirmAccountOverlayProps) {
    const [token, setToken] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [animation] = useState(new Animated.Value(0))

    useEffect(() => {
        if (isVisible) {
            setToken('')
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

    const handleConfirm = async () => {
        if (!token.trim()) {
            Alert.alert('Error', 'Please enter the confirmation code')
            return
        }

        setIsLoading(true)
        try {
            const response = await fetch('https://regusto.azurewebsites.net/api/auth/confirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    [signupMethod]: contactValue,
                }),
            })


            if (response.ok) {
                Alert.alert('Success', 'Cuenta confirmada con éxito')
                onClose()
            } else {
                Alert.alert('Error', 'Error al confirmar la cuenta. Inténtalo de nuevo.')
            }
        } catch (error) {
            Alert.alert('Error', 'Error al confirmar la cuenta. Inténtalo de nuevo.')
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
                        <Text style={[styles.title, { color: colors.text }]}>Confirmar tu cuenta</Text>
                        <TouchableOpacity onPress={onClose} disabled={isLoading}>
                            <Feather name="x" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.description, { color: colors.text }]}>
                        Por favor introducir el codigo enviado a su {signupMethod} para confirmar la cuenta:
                        {'\n'}
                        {contactValue}
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
                        value={token}
                        onChangeText={setToken}
                        keyboardType="number-pad"
                        editable={!isLoading}
                    />

                    <TouchableOpacity
                        style={[
                            styles.confirmButton,
                            { backgroundColor: colors.primary },
                            isLoading && { opacity: 0.7 },
                        ]}
                        onPress={handleConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={colors.overText} />
                        ) : (
                            <Text style={[styles.confirmButtonText, { color: colors.overText }]}>
                                Confirmar cuenta
                            </Text>
                        )}
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
        backgroundColor: 'transparent',
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
    confirmButton: {
        width: '100%',
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
})

