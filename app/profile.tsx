import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Switch,
    TextInput,
    Modal,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, FadeIn } from 'react-native-reanimated';
import { NavigationProp } from "@react-navigation/native";
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/app/AppNavigator";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {fetchUserData, updateUserData} from "@/app/api";
import {useTheme} from "@/app/themeContext";
import LottieView from 'lottie-react-native';

type ProfilePageProps = {
    navigation: NavigationProp<any>;
};

type ProfileNavigationProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

export interface UserData {
    id: string;
    email: string;
    created_at: string;
    name: string;
    surname: string;
    phone: string;
    address_id: number;
    roles: string;
}

export interface UpdatedUserData {
    name?: string;
    surname?: string;
    email?: string;
    phone?: string;
}

export default function Profile({ navigation }: ProfilePageProps) {
    const [editingField, setEditingField] = useState<keyof UserData | null>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [darkModeEnabled, setDarkModeEnabled] = useState(false);
    const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
    const navigate = useNavigation<ProfileNavigationProp>();
    const { colors } = useTheme();

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: colors.headerBackground,
            margin: -36,
        },
        headerContent: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            height: '100%',
            paddingTop: 32,
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: '700',
            color: colors.primary,
        },
        scrollView: {
            flex: 1,
            paddingTop: 100,
        },
        profileHeader: {
            alignItems: 'center',
            marginBottom: 24,
        },
        profilePicture: {
            width: 150,
            height: 150,
            marginBottom: 16,
        },
        profileName: {
            fontSize: 24,
            fontWeight: '700',
            color: colors.primary,
            marginBottom: 4,
        },
        profileEmail: {
            fontSize: 16,
            color: colors.text,
        },
        section: {
            backgroundColor: colors.secondaryBackground,
            borderRadius: 12,
            padding: 16,
            marginHorizontal: 16,
            marginBottom: 24,
            shadowColor: colors.opposite,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: colors.primary,
            marginBottom: 16,
        },
        infoItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        infoIcon: {
            marginRight: 12,
        },
        infoContent: {
            flex: 1,
        },
        infoLabel: {
            fontSize: 14,
            color: colors.secondaryText,
            marginBottom: 4,
        },
        infoValue: {
            fontSize: 16,
            color: colors.text,
        },
        infoInput: {
            fontSize: 16,
            color: colors.text,
            borderBottomWidth: 1,
            borderBottomColor: colors.primary,
            paddingVertical: 4,
        },
        preferenceItem: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
        },
        preferenceText: {
            fontSize: 16,
            color: colors.text,
        },
        actionButton: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        actionButtonText: {
            marginLeft: 12,
            fontSize: 16,
            color: colors.text,
        },
        submitButton: {
            backgroundColor: colors.primary,
            padding: 16,
            borderRadius: 8,
            margin: 16,
            alignItems: 'center',
        },
        submitButtonText: {
            color: colors.overText,
            fontSize: 16,
            fontWeight: 'bold',
        },
        logoutSection: {
            marginBottom: 130,
        },
        logoutButton: {
            backgroundColor: '#FFE5E5',
            borderRadius: 8,
            paddingHorizontal: 16,
        },
        logoutButtonText: {
            color: '#FF6B6B',
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        modalContent: {
            backgroundColor: colors.secondaryBackground,
            borderRadius: 12,
            padding: 24,
            width: '80%',
            alignItems: 'center',
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: '700',
            color: colors.primary,
            marginBottom: 16,
        },
        modalText: {
            fontSize: 16,
            color: colors.text,
            marginBottom: 24,
            textAlign: 'center',
        },
        modalButtons: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%',
        },
        modalButton: {
            borderRadius: 8,
            padding: 12,
            width: '48%',
            alignItems: 'center',
        },
        cancelButton: {
            backgroundColor: colors.searchContainer,
        },
        confirmButton: {
            backgroundColor: '#FF6B6B',
        },
        modalButtonText: {
            fontSize: 16,
            fontWeight: '600',
        },
        confirmButtonText: {
            color: colors.overText,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.background,
        },
        errorContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.background,
            padding: 20,
        },
        errorText: {
            fontSize: 16,
            color: '#FF6B6B',
            textAlign: 'center',
            marginBottom: 20,
        },
        retryButton: {
            backgroundColor: colors.primary,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 5,
        },
        retryButtonText: {
            color: colors.overText,
            fontSize: 16,
            fontWeight: 'bold',
        },
    });


    const queryClient = useQueryClient();

    const { data: userData, isLoading, error } = useQuery<UserData, Error>({
        queryKey: ['userData'],
        queryFn: fetchUserData,
    });

    const [originalData, setOriginalData] = useState<UserData | undefined>(userData);

    const updateUserMutation = useMutation<void, Error, Partial<UpdatedUserData>>({
        mutationFn: updateUserData,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userData'] });
            setOriginalData(userData);
            Alert.alert('Éxito', 'Tu perfil fue modificado correctamente.');
        },
        onError: (error) => {
            Alert.alert('Error', `Error al modificar su perfil: ${error.message}`);
        },
    });

    const headerHeight = useSharedValue(100);
    const scale = useSharedValue(1);

    const headerStyle = useAnimatedStyle(() => ({
        height: headerHeight.value,
        opacity: 1,
    }));

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    function handleLogOut() {
        setShowLogoutConfirmation(true);
    }

    async function confirmLogout() {
        setShowLogoutConfirmation(false);
        await AsyncStorage.removeItem('token');
        await new Promise((resolve) => setTimeout(resolve, 110));
        queryClient.invalidateQueries();
        navigate.replace('Login');
    }

    function startEditing(field: keyof UserData) {
        setEditingField(field);
    }

    function updateField(field: keyof UserData, value: string) {
        if (userData) {
            const updatedData = { ...userData, [field]: value };
            queryClient.setQueryData(['userData'], updatedData);
        }
    }

    function saveChanges() {
        setEditingField(null);
    }

    async function submitChanges() {
        if (!userData) return;

        if (userData === originalData) {
            Alert.alert('No hay cambios', 'No hay cambios para enviar.');
            return;
        }
        updateUserMutation.mutate(userData);
    }

    const renderInfoItem = (icon: "user" | "mail" | "map-pin" | "phone", label: string, field: keyof UserData) => (
        <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
                <Feather name={icon} size={20} color="#269577" />
            </View>
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                {editingField === field ? (
                    <TextInput
                        style={styles.infoInput}
                        value={userData?.[field]?.toString() || ''}
                        onChangeText={(value) => updateField(field, value)}
                        onBlur={saveChanges}
                        testID="inputField"
                    />
                ) : (
                    <Text style={styles.infoValue}>{userData?.[field]?.toString() || 'N/A'}</Text>
                )}
            </View>
            <TouchableOpacity onPress={() => startEditing(field)}>
                <Feather testID="editData" name="edit-2" size={20} color="#269577" />
            </TouchableOpacity>
        </View>
    );

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error.message}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => queryClient.refetchQueries({ queryKey: ['userData'] })}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <Animated.View style={[styles.header, headerStyle]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Feather name="arrow-left" size={24} color="#269577" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Perfil</Text>
                    <View style={{ width: 24 }} />
                </View>
            </Animated.View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.profileHeader}>
                    <LottieView
                        source={require('../assets/animations/dog.json')}
                        autoPlay
                        loop
                        style={styles.profilePicture}
                    />
                    <Text style={styles.profileName}>{userData?.name || 'N/A'}</Text>
                    <Text style={styles.profileEmail}>{userData?.email || 'N/A'}</Text>
                </Animated.View>

                <Animated.View entering={FadeIn.delay(200)} style={styles.section}>
                    <Text style={styles.sectionTitle}>Información Personal</Text>
                    {renderInfoItem("user", "Nombre", "name")}
                    {renderInfoItem("user", "Apellido", "surname")}
                    {userData?.email ? (
                        renderInfoItem("mail", "Correo electrónico", "email")
                    ) : (
                        renderInfoItem("phone", "Teléfono", "phone")
                    )}
                </Animated.View>

                {(originalData?.name !== userData?.name || originalData?.surname !== userData?.surname || originalData?.email !== userData?.email || originalData?.phone !== userData?.phone) && (
                    updateUserMutation.isPending ? (
                        <ActivityIndicator size="large" color="#269577" style={styles.submitButton} />
                    ) : (
                        <TouchableOpacity style={styles.submitButton} onPress={submitChanges}>
                            <Text style={styles.submitButtonText}>Guardar Cambios</Text>
                        </TouchableOpacity>
                    )
                )}

                <Animated.View entering={FadeIn.delay(300)} style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferencias</Text>
                    <View style={styles.preferenceItem}>
                        <Text style={styles.preferenceText}>Notificaciones</Text>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                        />
                    </View>
                </Animated.View>

                <Animated.View entering={FadeIn.delay(400)} style={[styles.section, styles.logoutSection]}>
                    <Text style={styles.sectionTitle}>Acciones</Text>
                    <TouchableOpacity style={styles.actionButton} onPress={handleLogOut}>
                        <Feather name="log-out" size={20} color="#FF6B6B" />
                        <Text testID="logOut" style={styles.actionButtonText}>Cerrar sesión</Text>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>

            <Modal
                animationType="fade"
                transparent={true}
                visible={showLogoutConfirmation}
                onRequestClose={() => setShowLogoutConfirmation(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Confirmar cerrar sesión</Text>
                        <Text style={styles.modalText}>Seguro que quieres cerrar sesión?</Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowLogoutConfirmation(false)}>
                                <Text style={styles.modalButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={confirmLogout}>
                                <Text style={[styles.modalButtonText, styles.confirmButtonText]}>Confirmar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

