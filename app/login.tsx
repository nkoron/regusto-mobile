import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    ScrollView,
    ActivityIndicator,
    FlatList, StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Feather, MaterialCommunityIcons} from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from './AppNavigator';
import Animated, {
    Easing,
    Extrapolation,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useTheme } from './themeContext';
import ConfirmAccountModal from "@/app/confirm-account-modal";
import PhoneVerificationOverlay from "@/app/phone-verification-overlay";

const { width, height } = Dimensions.get('window');


type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const countryCodes = [
    { label: "United States", value: "+1" },
    { label: "France", value: "+33" },
    { label: "Spain", value: "+34" },
    { label: "Italy", value: "+39" },
    { label: "Germany", value: "+49" },
    { label: "Brazil", value: "+55" },
    { label: "Mexico", value: "+52" },
    { label: "Argentina", value: "+54" },
    { label: "Australia", value: "+61" },
    { label: "United Kingdom", value: "+44" },
];

export default function LoginScreen() {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'Login'>>();
    const { colors, theme } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [activeSection, setActiveSection] = useState<'login' | 'signup'>('login');
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showCountryCodePicker, setShowCountryCodePicker] = useState(false);
    const underlinePosition = useSharedValue(0);
    const animationProgress = useSharedValue(0);
    const expansionProgress = useSharedValue(0);
    const logoScale = useSharedValue(1);
    const titleTranslateY = useSharedValue(0);
    const loadingProgress = useSharedValue(0);
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
    const [signupPhone, setSignupPhone] = useState('');
    const [signupName, setSignupName] = useState('');
    const [signupSurname, setSignupSurname] = useState('');
    const [countryCode, setCountryCode] = useState('+54');
    const [signupMethod, setSignupMethod] = useState<'email' | 'phone'>('email');
    const [loginPhone, setLoginPhone] = useState('');
    const phoneInputRef = useRef<TextInput>(null);
    const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [signupContactValue, setSignupContactValue] = useState('')
    const [showPhoneVerification, setShowPhoneVerification] = useState(false)
    const [errors, setErrors] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        name: '',
        surname: '',
    });
    const [loginError, setLoginError] = useState('');

    useEffect(() => {
        loadSavedCredentials();
    }, []);

    const loadSavedCredentials = async () => {
        try {
            const savedEmail = await AsyncStorage.getItem('savedEmail');
            const savedPassword = await AsyncStorage.getItem('savedPassword');
            if (savedEmail && savedPassword) {
                setEmail(savedEmail);
                setPassword(savedPassword);
                setRememberMe(true);
            }
        } catch (error) {
            console.error('Error loading saved credentials:', error);
        }
    };

    const saveCredentials = async (accessToken: string) => {
        try {
            await AsyncStorage.setItem('token', accessToken);
            if (rememberMe) {
                await AsyncStorage.setItem('savedEmail', email);
                await AsyncStorage.setItem('savedPassword', password);
            } else {
                await AsyncStorage.removeItem('savedEmail');
                await AsyncStorage.removeItem('savedPassword');
            }
        } catch (error) {
            console.error('Error saving credentials:', error);
        }
    };

    const validateEmail = (email: string) => {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    };

    const validatePassword = (password: string) => {
        return password.length >= 8;
    };

    const validatePhone = (phone: string) => {
        const validPhonePattern = /^\+[0-9]{1,4}[0-9]{6,14}$/;
        return validPhonePattern.test(phone);
    };

    const handleLogin = async () => {
        setIsLoading(true);
        setLoginError(''); // Clear previous error

        try {
            const response = await fetch('https://regusto.azurewebsites.net/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginMethod === 'phone' ? { phone: loginPhone } : { email, password }),
            });

            if (response.ok && loginMethod !== 'phone') {
                const data = await response.json();
                await saveCredentials(data.jwt);
                await AsyncStorage.setItem("refreshToken", data.refreshToken);
                await AsyncStorage.setItem("userid", data.user.id);
                await AsyncStorage.setItem("activeCategory", "All");
                navigation.navigate('OpeningAnimation');
                }
            else if(loginMethod === 'phone' && response.ok) {
                setShowPhoneVerification(true);
            }
            else {
                setLoginError('Email/telefono o contraseña invalido');
            }
        } catch (error: any) {
            console.log(error.message());
            setLoginError('Email o contraseña invalido');
        } finally {
            setIsLoading(false);
        }
    };
    const handleSignup = async () => {
        setIsLoading(true);

        const newErrors = {
            email: signupMethod === 'email' && !validateEmail(signupEmail) ? 'Formato de email inválido' : '',
            password: signupMethod === 'email' && !validatePassword(signupPassword) ? 'La contraseña debe tener al menos 8 caracteres' : '',
            confirmPassword: signupMethod === 'email' && signupPassword !== signupConfirmPassword ? 'Las contraseñas no coinciden' : '',
            phone: signupMethod === 'phone' && !validatePhone(signupPhone) ? 'Número de teléfono inválido' : '',
            name: signupName.trim() ? '' : 'El nombre es obligatorio',
            surname: signupSurname.trim() ? '' : 'El apellido es obligatorio',
        };

        setErrors(newErrors);

        if (Object.values(newErrors).some(error => error !== '')) {
            setIsLoading(false);
            return;
        }

        try {
            const signupData = {
                [signupMethod]: signupMethod === 'email' ? signupEmail : signupPhone,
                password: signupMethod === 'email' ? signupPassword : undefined,
                name: signupName,
                surname: signupSurname,
                roles: "client",
                signinValue: signupMethod === 'email' ? 'Email' : 'Phone'
            }

            const response = await fetch('https://regusto.azurewebsites.net/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(signupData),
            })

            const data = await response.json()

            if (response.ok) {
                setSignupContactValue(signupMethod === 'email' ? signupEmail : signupPhone)
                setShowConfirmModal(true)
            } else {
                Alert.alert('Error', data.message || 'Error creando cuenta')
            }
        } catch (error) {
            Alert.alert('Error', 'Ocurrio un error.' + error)
        } finally {
            setIsLoading(false)
        }
    };

    const toggleSection = useCallback((section: 'login' | 'signup') => {
        if (activeSection !== section) {
            setActiveSection(section);
            underlinePosition.value = withTiming(section === 'login' ? 0 : 1, {
                duration: 300,
                easing: Easing.inOut(Easing.ease),
            });
            animationProgress.value = withTiming(section === 'login' ? 0 : 1, { duration: 300 });
        }
    }, [activeSection]);

    const handleExpand = () => {
        setIsExpanded(true);
        expansionProgress.value = withTiming(1, { duration: 500 });
        logoScale.value = withTiming(0.8, { duration: 300 });
        titleTranslateY.value = withTiming(-20, { duration: 300 });
    };

    const handleCollapse = () => {
        expansionProgress.value = withTiming(0, { duration: 500 });
        logoScale.value = withTiming(1, { duration: 300 });
        titleTranslateY.value = withTiming(0, { duration: 300 });
        setIsExpanded(false);
    };

    const dismissKeyboard = () => {
        Keyboard.dismiss();
    };

    const handlePhoneChange = (text: string) => {
        if (!text.startsWith(countryCode)) {
            text = countryCode + text.replace(countryCode, '');
        }
        setSignupPhone(text);
        setErrors(prev => ({ ...prev, phone: '' }));
    };

    const handleCountryCodeChange = (itemValue: string) => {
        setCountryCode(itemValue);
        setSignupPhone(prevPhone => {
            const phoneWithoutCode = prevPhone.replace(/^\+\d+/, '');
            return itemValue + phoneWithoutCode;
        });
        setShowCountryCodePicker(false);
        if (phoneInputRef.current) {
            phoneInputRef.current.focus();
        }
    };

    // Animated styles
    const underlineStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: underlinePosition.value * (width / 2 - 40) }],
    }));

    const logoAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: logoScale.value }],
    }));

    const titleAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: titleTranslateY.value }],
    }));

    const formContainerAnimatedStyle = useAnimatedStyle(() => ({
        height: interpolate(
            expansionProgress.value,
            [0, 1],
            [110, height * 0.5],
            Extrapolation.CLAMP,
        ),
        opacity: 1,
    }));

    const loginFormAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{
            translateX: interpolate(
                animationProgress.value,
                [0, 1],
                [0, -width],
                Extrapolation.CLAMP,
            )
        }],
        opacity: interpolate(
            animationProgress.value,
            [0, 0.5, 1],
            [1, 0.5, 0],
            Extrapolation.CLAMP,
        ),
    }));

    const signupFormAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{
            translateX: interpolate(
                animationProgress.value,
                [0, 1],
                [width, 0],
                Extrapolation.CLAMP,
            )
        }],
        opacity: interpolate(
            animationProgress.value,
            [0, 0.5, 1],
            [0, 0.5, 1],
            Extrapolation.CLAMP,
        ),
    }));

    const loadingButtonStyle = useAnimatedStyle(() => ({
        width: interpolate(loadingProgress.value, [0, 1], [100, 50], Extrapolation.CLAMP),
        borderRadius: interpolate(loadingProgress.value, [0, 1], [25, 50], Extrapolation.CLAMP),
        justifyContent: 'center',
        alignItems: 'center',
    }));

    const opacityStyle = {
        opacity: isLoading ? 0.6 : 1,
    };

    const primaryColorWithOpacity = (opacity: number) => {
        const hex = colors.primary.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.loginBackground,
        },
        safeArea: {
            flex: 1,
        },
        content: {
            flex: 1,
            padding: 20,
            justifyContent: 'center',
            alignItems: 'center',
        },
        logoContainer: {
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
            elevation: 10,
            shadowColor: colors.opposite,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 5,
        },
        logo: {
            width: 150,
            height: 150,
        },
        loginMethodContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 15,
        },
        loginMethodButton: {
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 10,
            borderWidth: 1,
            borderColor: colors.primary,
            borderRadius: 25,
            marginHorizontal: 5,
        },
        activeLoginMethod: {
            backgroundColor: colors.primary,
        },
        loginMethodText: {
            color: colors.text,
            fontWeight: 'bold',
            marginLeft: 5,
        },
        title: {
            fontSize: 40,
            fontWeight: 'bold',
            color: '#f4d548',
            marginBottom: 5,
            textShadowColor: 'rgba(0, 0, 0, 0.3)',
            textShadowOffset: { width: 2, height: 2 },
            textShadowRadius: 5,
        },
        subtitle: {
            fontSize: 18,
            color: colors.opposite,
            marginBottom: 30,
            textShadowColor: 'rgba(0, 0, 0, 0.3)',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 3,
        },
        bottomContainer: {
            backgroundColor: colors.background,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            paddingTop: 20,
            paddingBottom: 20,
            paddingHorizontal: 20,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 20,
            shadowColor: colors.opposite,
            shadowOffset: { width: 0, height: -5 },
            shadowOpacity: 0.3,
            shadowRadius: 5,
        },
        bottomContainerCollapsed: {
            backgroundColor: 'transparent',
            elevation: 0,
            shadowOpacity: 0,
        },
        beginButton: {
            backgroundColor: colors.accent,
            paddingVertical: 18,
            paddingHorizontal: 70,
            borderRadius: 25,
            elevation: 8,
            shadowColor: colors.opposite,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 5,
        },
        beginButtonText: {
            color: colors.primary,
            fontSize: 18,
            fontWeight: 'bold',
            textAlign: 'center',
        },
        tabContainer: {
            flexDirection: 'row',
            marginBottom: 20,
            width: '100%',
        },
        tabButton: {
            flex: 1,
            paddingVertical: 10,
            alignItems: 'center',
            borderBottomWidth: 2,
            borderBottomColor: 'transparent',
        },
        tabButtonText: {
            fontSize: 16,
            color: colors.text,
        },
        underline: {
            position: 'absolute',
            bottom: 0,
            left: 25,
            right: 0,
            width: '40%',
            height: 2,
            backgroundColor: colors.primary,
        },
        activeTabButtonText: {
            fontWeight: 'bold',
            color: colors.primary,
        },
        formWrapper: {
            position: 'relative',
            height: 300,
            width: '100%',
            overflow: 'hidden',
        },
        formContainer: {
            position: 'absolute',
            width: '100%',
            height: '100%',
        },
        input: {
            width: '100%',
            height: 50,
            borderWidth: 1,
            borderColor: colors.primary,
            borderRadius: 25,
            paddingHorizontal: 20,
            marginBottom: 15,
            color: colors.text,
            backgroundColor: colors.secondaryBackground,
        },
        passwordContainer: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 15,
        },
        passwordInput: {
            flex: 1,
            height: 50,
            borderWidth: 1,
            borderColor: colors.primary,
            borderRadius: 25,
            paddingHorizontal: 20,
            color: colors.text,
            backgroundColor: colors.secondaryBackground,
        },
        visibilityIcon: {
            position: 'absolute',
            right: 15,
        },
        rememberMeContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 15,
        },
        rememberMeText: {
            color: colors.text,
            marginLeft: 10,
        },
        actionButton: {
            width: '100%',
            height: 40,
            backgroundColor: colors.primary,
            borderRadius: 25,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 5,
            ...Platform.select({
                ios: {
                    height: 50,
                },
            }),
        },
        loadingButton: {
            backgroundColor: primaryColorWithOpacity(0.7),
        },
        actionButtonText: {
            color: colors.overText,
            fontSize: 16,
            fontWeight: 'bold',

        },
        phoneContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 15,
        },
        countryCodeButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: 100,
            height: 50,
            borderWidth: 1,
            borderColor: colors.primary,
            borderRadius: 25,
            paddingHorizontal: 15,
            backgroundColor: colors.secondaryBackground,
            marginRight: 10,
        },
        countryCodeButtonText: {
            color: colors.text,
            fontSize: 16,
        },
        phoneInput: {
            flex: 1,
            height: 50,
            borderWidth: 1,
            borderColor: colors.primary,
            borderRadius: 25,
            paddingHorizontal: 20,
            color: colors.text,
            backgroundColor: colors.secondaryBackground,
        },
        errorText: {
            color: 'red',
            fontSize: 12,
            marginBottom: 5,
        },
        modalContainer: {
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
        pickerContainer: {
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: 20,
        },
        pickerHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 15,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        pickerTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.text,
        },
        pickerItem: {
            padding: 15,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        pickerItemText: {
            fontSize: 16,
            color: colors.text,
        },
        signupMethodContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 15,
        },
        signupMethodButton: {
            flex: 1,
            padding: 10,
            borderWidth: 1,
            borderColor: colors.primary,
            borderRadius: 25,
            alignItems: 'center',
            marginHorizontal: 5,
        },
        activeSignupMethod: {
            backgroundColor: colors.primary,
        },
        signupMethodText: {
            color: colors.text,
            fontWeight: 'bold',
        },
    });

    const renderForms = () => (
        <View style={styles.formWrapper}>
            {activeSection === 'login' && renderLoginForm()}
            {activeSection === 'signup' && renderSignupForm()}
        </View>
    );


    const renderLoginForm = () => (
        <Animated.View style={[styles.formContainer, loginFormAnimatedStyle, opacityStyle]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar
                    barStyle={colors.statusBarStyle as 'dark-content'} // Ensure correct type
                    backgroundColor={'#1E1E1E'} // Set the background color of the status bar
                />
            </View>
            <View style={styles.loginMethodContainer}>
                <TouchableOpacity
                    style={[styles.loginMethodButton, loginMethod === 'email' && styles.activeLoginMethod]}
                    onPress={() => setLoginMethod('email')}
                >
                    <MaterialCommunityIcons name="email" size={24} color={loginMethod === 'email' ? colors.overText : colors.primary} />
                    <Text style={styles.loginMethodText}>Email</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.loginMethodButton, loginMethod === 'phone' && styles.activeLoginMethod]}
                    onPress={() => setLoginMethod('phone')}
                >
                    <MaterialCommunityIcons name="phone" size={24} color={loginMethod === 'phone' ? colors.overText : colors.primary} />
                    <Text style={styles.loginMethodText}>Telefono</Text>
                </TouchableOpacity>
            </View>
            {loginMethod === 'email' ? (
                <>
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor={colors.placeholder}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!isLoading}
                        testID="loginEmailInput"
                    />
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={styles.passwordInput}
                            placeholder="Contraseña"
                            placeholderTextColor={colors.placeholder}
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={setPassword}
                            editable={!isLoading}
                            testID="loginPasswordInput"
                        />
                        <TouchableOpacity
                            style={styles.visibilityIcon}
                            onPress={() => setShowPassword(!showPassword)}
                            disabled={isLoading}
                        >
                            <Feather
                                name={showPassword ? 'eye' : 'eye-off'}
                                size={24}
                                color={colors.primary}
                            />
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                <View style={styles.phoneContainer}>
                    <TouchableOpacity
                        style={styles.countryCodeButton}
                        onPress={() => setShowCountryCodePicker(true)}
                        disabled={isLoading}
                    >
                        <Text style={styles.countryCodeButtonText}>+54</Text>
                        <Feather name="chevron-down" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.phoneInput}
                        placeholder="Phone"
                        placeholderTextColor={colors.placeholder}
                        keyboardType="phone-pad"
                        value={loginPhone.replace('+54', '')}
                        onChangeText={(text) => setLoginPhone('+54' + text)}
                        editable={!isLoading}
                        testID="loginPhoneInput"
                    />
                </View>
            )}
            {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}
            <View style={styles.rememberMeContainer}>
                <Switch
                    value={rememberMe}
                    onValueChange={setRememberMe}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={rememberMe ? colors.accent : colors.secondaryBackground}
                    disabled={isLoading}
                />
                <Text style={styles.rememberMeText}>Recordarme</Text>
            </View>
            <TouchableOpacity
                style={[styles.actionButton, isLoading && styles.loadingButton]}
                onPress={handleLogin}
                disabled={isLoading}
            >
                <Animated.View style={loadingButtonStyle}>
                    {isLoading ? (
                        <ActivityIndicator color={colors.overText} />
                    ) : (
                        <Text testID="loginButton" style={styles.actionButtonText}>Iniciar Sesión</Text>
                    )}
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
    const renderSignupForm = () => (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <StatusBar
                    barStyle={colors.statusBarStyle as 'dark-content'} // Ensure correct type
                    backgroundColor={'#1E1E1E'} // Set the background color of the status bar
                />
                <View style={styles.signupMethodContainer}>
                    <TouchableOpacity
                        style={[styles.loginMethodButton, signupMethod === 'email' && styles.activeSignupMethod]}
                        onPress={() => setSignupMethod('email')}
                    >
                        <MaterialCommunityIcons name="email" size={24} color={signupMethod === 'email' ? colors.overText : colors.primary} />
                        <Text style={styles.signupMethodText}>Email</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.loginMethodButton, signupMethod === 'phone' && styles.activeSignupMethod]}
                        onPress={() => setSignupMethod('phone')}
                    >
                        <MaterialCommunityIcons name="phone" size={24} color={signupMethod === 'phone' ? colors.overText : colors.primary} />
                        <Text style={styles.signupMethodText}>Telefono</Text>
                    </TouchableOpacity>
                </View>
                {signupMethod === 'email' ? (
                    <>
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor={colors.placeholder}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={signupEmail}
                            onChangeText={(text) => {
                                setSignupEmail(text);
                                setErrors(prev => ({ ...prev, email: '' }));
                            }}
                            editable={!isLoading}
                            testID="signupEmailInput"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Contraseña"
                            placeholderTextColor={colors.placeholder}
                            secureTextEntry
                            value={signupPassword}
                            onChangeText={(text) => {
                                setSignupPassword(text);
                                setErrors(prev => ({ ...prev, password: '' }));
                            }}
                            editable={!isLoading}
                            testID="passwordInput"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Confirmar Contraseña"
                            placeholderTextColor={colors.placeholder}
                            secureTextEntry
                            value={signupConfirmPassword}
                            onChangeText={(text) => {
                                setSignupConfirmPassword(text);
                                setErrors(prev => ({ ...prev, confirmPassword: '' }));
                            }}
                            editable={!isLoading}
                            testID="confirmPassword"
                        />
                    </>
                ) : (
                    <View style={styles.phoneContainer}>
                        <TouchableOpacity
                            style={styles.countryCodeButton}
                            onPress={() => setShowCountryCodePicker(true)}
                            disabled={isLoading}
                        >
                            <Text style={styles.countryCodeButtonText}>+54</Text>
                            <Feather name="chevron-down" size={18} color={colors.primary} />
                        </TouchableOpacity>
                        <TextInput
                            ref={phoneInputRef}
                            style={styles.phoneInput}
                            placeholder="Phone"
                            placeholderTextColor={colors.placeholder}
                            keyboardType="phone-pad"
                            value={signupPhone.replace('+54', '')}
                            onChangeText={(text) => {
                                setSignupPhone('+54' + text);
                                setErrors(prev => ({ ...prev, phone: '' }));
                            }}
                            editable={!isLoading}
                            testID="phone"
                        />
                    </View>
                )}
                {errors[signupMethod] ? <Text style={styles.errorText}>{errors[signupMethod]}</Text> : null}
                <TextInput
                    style={styles.input}
                    placeholder="Nombre"
                    placeholderTextColor={colors.placeholder}
                    value={signupName}
                    onChangeText={(text) => {
                        setSignupName(text);
                        setErrors(prev => ({ ...prev, name: '' }));
                    }}
                    editable={!isLoading}
                    testID="name"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Apellido"
                    placeholderTextColor={colors.placeholder}
                    value={signupSurname}
                    onChangeText={(text) => {
                        setSignupSurname(text);
                        setErrors(prev => ({ ...prev, surname: '' }));
                    }}
                    editable={!isLoading}
                    testID="surname"
                />
                {errors.surname ? <Text style={styles.errorText}>{errors.surname}</Text> : null}
            </ScrollView>
            <TouchableOpacity
                style={[styles.actionButton, isLoading && styles.loadingButton]}
                onPress={handleSignup}
                disabled={isLoading}
            >
                <Animated.View style={loadingButtonStyle}>
                    {isLoading ? (
                        <ActivityIndicator color={colors.overText} />
                    ) : (
                        <Text testID="SignUpbutton" style={styles.actionButtonText}>Registrarse</Text>
                    )}
                </Animated.View>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    );

    return (
        <>
            <TouchableWithoutFeedback onPress={dismissKeyboard} disabled={isLoading}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.container}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <SafeAreaView style={styles.safeArea}>
                        <TouchableWithoutFeedback onPress={handleCollapse} disabled={isLoading}>
                            <View style={[styles.content, opacityStyle]}>
                                <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
                                    <Image
                                        source={require('../assets/images/ReGustoLogo-removebg-preview.png')}
                                        style={styles.logo}
                                        resizeMode="contain"
                                    />
                                </Animated.View>
                                <Animated.Text style={[styles.title, titleAnimatedStyle]}>
                                    ReGusto
                                </Animated.Text>
                                <Animated.Text style={[styles.subtitle, titleAnimatedStyle]}>
                                    DELIVERY APP
                                </Animated.Text>
                            </View>
                        </TouchableWithoutFeedback>

                        <Animated.View
                            style={[
                                styles.bottomContainer,
                                formContainerAnimatedStyle,
                                !isExpanded && styles.bottomContainerCollapsed,
                                opacityStyle
                            ]}
                        >
                            {!isExpanded ? (
                                <Animated.View>
                                    <StatusBar
                                        barStyle={colors.statusBarStyle as 'dark-content'} // Ensure correct type
                                        backgroundColor={'#1E1E1E'} // Set the background color of the status bar
                                    />
                                    <TouchableOpacity style={styles.beginButton} onPress={handleExpand} disabled={isLoading}>
                                        <Text testID="Ingresar" style={styles.beginButtonText}>Ingresar</Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            ) : (
                                <>
                                    <View style={styles.tabContainer}>
                                        <TouchableOpacity
                                            style={styles.tabButton}
                                            onPress={() => toggleSection('login')}
                                            disabled={isLoading}
                                        >
                                            <Text testID="loginSlide" style={[styles.tabButtonText, activeSection === 'login' && styles.activeTabButtonText]}>Login</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.tabButton}
                                            onPress={() => toggleSection('signup')}
                                            disabled={isLoading}
                                        >
                                            <Text testID="signUp" style={[styles.tabButtonText, activeSection === 'signup' && styles.activeTabButtonText]}>Registrarse</Text>
                                        </TouchableOpacity>
                                        <Animated.View style={[styles.underline, underlineStyle]} />
                                    </View>
                                    {renderForms()}
                                </>
                            )}
                        </Animated.View>
                    </SafeAreaView>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
            <ConfirmAccountModal
                isVisible={showConfirmModal}
                onClose={() => {
                    setShowConfirmModal(false)
                    toggleSection('login')
                }}
                signupMethod={signupMethod}
                contactValue={signupContactValue}
                colors={colors}
            />
            <PhoneVerificationOverlay
                isVisible={showPhoneVerification}
                onClose={() => setShowPhoneVerification(false)}
                phone={loginPhone}
                onVerificationSuccess={async () => {
                    setShowPhoneVerification(false);
                    navigation.navigate('OpeningAnimation');
                }}
                colors={colors}
            />
        </>
    );
}
