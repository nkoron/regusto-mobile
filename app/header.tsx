import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    SafeAreaView,
    TextInput,
    ActivityIndicator,
    Dimensions,
    Platform,
    StatusBar,
    ScrollView,
    Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { RootStackParamList } from "@/app/AppNavigator";
import { useTheme } from "@/app/themeContext";
import {
    confirmNewAddress,
    deleteAddress,
    fetchCartItemCount,
    fetchCurrentAddress,
    fetchSavedAddresses,
    selectAddress,
    updateAddress
} from "@/app/api";
import Overlay from "@/app/overlay";
import debounce from "@react-navigation/stack/src/utils/debounce";
import MapboxView from './MapboxView';

const MAPBOX_ACCESS_TOKEN = "pk.eyJ1Ijoic21hZmZlbyIsImEiOiJjbTN4ZzJkc2EwcXRoMndvZnp1YnF0MWpoIn0.XsrA1MQ32d9le4UpWWoVyw";

type LayoutHeaderProps = {
    showBackButton?: boolean;
    showFavoriteButton?: boolean;
    showCartButton?: boolean;
};

export type Address = {
    id: string,
    longitude: number,
    latitude: number,
    data: string,
    description?: string,
    floor_number?: string
};

const { width, height } = Dimensions.get('window');

export default function AddressManager({
                                           showBackButton = false,
                                           showFavoriteButton = true,
                                           showCartButton = true,
                                       }: LayoutHeaderProps) {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const [currentAddress, setCurrentAddress] = useState<Address | null>(null);
    const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
    const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Address[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { colors, theme } = useTheme();

    const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
    const [isConfirmationModalVisible, setIsConfirmationModalVisible] = useState(false);
    const [isAdditionalInfoModalVisible, setIsAdditionalInfoModalVisible] = useState(false);

    const cartBounce = useSharedValue(1);
    const cartOpacity = useSharedValue(1);

    const cartAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: cartBounce.value }],
            opacity: cartOpacity.value,
        };
    });

    const { data: cartItemCount } = useQuery({
        queryKey: ['cartItemCount'],
        queryFn: fetchCartItemCount,
    });

    const { data: userAddresses, isLoading: isLoadingAddresses, isError: isErrorAddresses } = useQuery({
        queryKey: ['savedAddresses'],
        queryFn: fetchSavedAddresses,
    });

    const { data: currentAddressData } = useQuery({
        queryKey: ['currentAddress'],
        queryFn: fetchCurrentAddress,
    });

    const queryClient = useQueryClient();

    useEffect(() => {
        if (userAddresses) {
            setSavedAddresses(userAddresses);
        }
        if (currentAddressData) {
            setCurrentAddress(currentAddressData);
        }
    }, [userAddresses, currentAddressData]);

    const selectAddressMutation = useMutation({
        mutationFn: selectAddress,
        onSuccess: (_, address) => {
            setSelectedAddress(address);
            setIsAddressModalVisible(false);
            if (!savedAddresses.some(saved => saved.id === address.id)) {
                setIsConfirmationModalVisible(true);
            } else {
                setCurrentAddress(address);
                queryClient.invalidateQueries({ queryKey: ['currentAddress'] });
                queryClient.invalidateQueries({ queryKey: ['nearbyStores'] });
                queryClient.invalidateQueries({ queryKey: ['stores'] });
            }
        },
        onError: (error) => {
            console.error('Error setting current address:', error);
            Alert.alert("Error", "Failed to set current address. Please try again.");
        },
    });

    const addNewAddress = async (newAddress: Address) => {
        setSelectedAddress(newAddress);
        setIsConfirmationModalVisible(false);
        setIsAdditionalInfoModalVisible(true);
    };

    const confirmAddressMutation = useMutation({
        mutationFn: confirmNewAddress,
        onSuccess: (newAddress) => {
            setCurrentAddress(newAddress);
            queryClient.invalidateQueries({ queryKey: ['nearbyStores'] });
            queryClient.invalidateQueries({ queryKey: ['currentAddress'] });
            queryClient.invalidateQueries({ queryKey: ['savedAddresses'] });
            setIsAdditionalInfoModalVisible(false);
            setIsConfirmationModalVisible(false);
            setIsAddressModalVisible(false);
            setSearchQuery('');
        },
        onError: (error) => {
            console.error('Error confirming new address:', error);
            Alert.alert("Error", "Failed to add new address. Please try again.");
        },
    });

    const updateAddressMutation = useMutation({
        mutationFn: updateAddress,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savedAddresses'] });
            setIsAdditionalInfoModalVisible(false);
        },
        onError: (error) => {
            console.error('Error updating address:', error);
            Alert.alert("Error", "Failed to update address. Please try again.");
        },
    });

    const deleteAddressMutation = useMutation({
        mutationFn: deleteAddress,
        onSuccess: (_, addressId) => {
            queryClient.setQueryData<Address[]>(['savedAddresses'], (old) =>
                old?.filter(addr => addr.id !== addressId) || []
            );
            if (currentAddress?.id === addressId) {
                setCurrentAddress(null);
                queryClient.invalidateQueries({ queryKey: ['currentAddress'] });
                queryClient.invalidateQueries({ queryKey: ['nearbyStores'] });
            }
            queryClient.invalidateQueries({ queryKey: ['savedAddresses'] });
            setIsAddressModalVisible(true);
            setIsAdditionalInfoModalVisible(false);
        },
        onError: (error) => {
            console.error('Error deleting address:', error);
            Alert.alert("Error", "Failed to delete address. Please try again.");
        },
    });

    const editAddress = (address: Address) => {
        setSelectedAddress(address);
        setIsAddressModalVisible(false);
        setIsAdditionalInfoModalVisible(true);
    };

    const searchAddresses = useCallback(debounce(async (query: string) => {
        if (query.length < 3 && query.length != 0) return;

        if (query.length === 0) {
            setSearchResults([]);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=5`
            );
            const data = await response.json();
            if (data.features && Array.isArray(data.features)) {
                const results: Address[] = data.features.map((feature: any) => ({
                    id: feature.id,
                    longitude: feature.center[0],
                    latitude: feature.center[1],
                    data: feature.place_name,
                }));
                console.log("Search results:", results);
                setSearchResults(results);
            } else {
                console.error('Unexpected API response format:', data);
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Error searching addresses:', error);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    }, 100), []);

    useEffect(() => {
        searchAddresses(searchQuery);
    }, [searchQuery, searchAddresses]);

    const handleSelectAddress = (address: Address) => {
        setSelectedAddress(address);
        if (searchResults.length > 0) {
            setIsConfirmationModalVisible(true);
        } else {
            selectAddressMutation.mutate(address);
            setSearchResults([]);
        }
    }

    const renderAddressItem = useCallback(({ item }: { item: Address }) => {
        return (
            <TouchableOpacity
                style={styles.addressItem}
                onPress={() => handleSelectAddress(item)}
            >
                <Feather name="map-pin" size={20} color={colors.primary} />
                <View style={styles.addressInfo}>
                    <Text style={styles.addressText}>{item.data}</Text>
                    {item.description && (
                        <Text style={styles.descriptionText}>{item.description}</Text>
                    )}
                </View>
                {searchResults.length === 0 && (
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => editAddress(item)}
                    >
                        <Feather name="edit" size={18} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    }, [colors, handleSelectAddress, editAddress, searchResults]);

    const handleCartPress = () => {
        cartBounce.value = withSpring(1.2, {}, () => {
            cartBounce.value = withSpring(1);
        });
        navigation.navigate('Cart');
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        safeArea: {
            backgroundColor: colors.headerBackground,
            paddingTop: Platform.OS === 'android' ? 0 : 0,
        },
        headerContent: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
        },
        leftSection: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
        },
        ubicacion: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 20,
            paddingVertical: 8,
            paddingHorizontal: 12,
        },
        textoUbicacion: {
            marginLeft: 8,
            marginRight: 4,
            fontSize: 16,
            fontWeight: '600',
            color: colors.overText,
            flex: 1,
        },
        headerIcons: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        headerIcon: {
            padding: 8,
            marginLeft: 8,
        },
        modalContent: {
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 20,
            paddingHorizontal: 16,
            paddingBottom: 30,
            height: '90%',
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
        },
        modalTitle: {
            fontSize: 24,
            fontWeight: '600',
            color: colors.text,
        },
        searchContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.searchContainer,
            borderRadius: 12,
            paddingHorizontal: 16,
            marginBottom: 24,
            height: 50,
        },
        searchIcon: {
            marginRight: 12,
            color: colors.searchIcon,
        },
        searchInput: {
            flex: 1,
            fontSize: 16,
            color: colors.text,
            height: '100%',
        },
        loadingIndicator: {
            marginLeft: 8,
        },
        addressItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        addressInfo: {
            flex: 1,
            marginLeft: 12,
        },
        addressText: {
            fontSize: 16,
            color: colors.text,
            marginBottom: 4,
        },
        descriptionText: {
            fontSize: 14,
            color: colors.searchIcon,
        },
        editButton: {
            padding: 8,
            borderRadius: 8,
            backgroundColor: colors.searchContainer,
        },
        confirmationText: {
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 8,
            color: colors.text,
        },
        confirmationButtons: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 16,
        },
        confirmationButton: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: 'center',
        },
        confirmationButtonCancel: {
            backgroundColor: colors.border,
            marginRight: 8,
        },
        confirmationButtonConfirm: {
            backgroundColor: colors.primary,
            marginLeft: 8,
        },
        confirmationButtonText: {
            fontSize: 16,
            fontWeight: 'bold',
            color: colors.overText,
        },
        additionalInfoContainer: {
            flex: 1,
        },
        label: {
            fontSize: 16,
            fontWeight: 'bold',
            marginTop: 16,
            marginBottom: 8,
            color: colors.text,
        },
        input: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
            color: colors.text,
        },
        buttonContainer: {
            flexDirection: 'column',
            marginTop: 24,
            marginBottom: 16,
        },
        saveButton: {
            backgroundColor: colors.primary,
            borderRadius: 8,
            padding: 16,
            alignItems: 'center',
            marginBottom: 12,
        },
        deleteButton: {
            backgroundColor: '#FF6B6B',
        },
        saveButtonText: {
            color: colors.overText,
            fontSize: 18,
            fontWeight: 'bold',
        },
        emptyListText: {
            textAlign: 'center',
            marginTop: 20,
            fontSize: 16,
            color: colors.searchIcon,
        },
        cartBadge: {
            position: 'absolute',
            right: -6,
            top: -6,
            backgroundColor: '#FF6B6B',
            borderRadius: 10,
            width: 20,
            height: 20,
            justifyContent: 'center',
            alignItems: 'center',
        },
        cartBadgeText: {
            color: colors.overText,
            fontSize: 12,
            fontWeight: 'bold',
        },
        overlayContent: {
            flex: 1,
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
        },
        addressList: {
            flex: 1,
        },
        listContent: {
            paddingBottom: 0,
        },
        editModalContent: {
            flex: 1,
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
        },
        editModalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
        },
        editModalTitle: {
            fontSize: 24,
            fontWeight: '600',
            color: colors.text,
        },
        editInput: {
            backgroundColor: colors.searchContainer,
            borderRadius: 8,
            padding: 16,
            color: colors.text,
            fontSize: 16,
            marginBottom: 16,
        },
        editButtonContainer: {
            marginTop: 24,
            paddingBottom: 50,
            gap: 12,
        },
        editSaveButton: {
            backgroundColor: colors.primary,
            borderRadius: 8,
            padding: 16,
            alignItems: 'center',
        },
        editDeleteButton: {
            backgroundColor: '#FF4136',
            borderRadius: 8,
            padding: 16,
            alignItems: 'center',
        },
        editButtonText: {
            color: colors.overText,
            fontSize: 16,
            fontWeight: '600',
        },
        locationPreview: {
            backgroundColor: colors.searchContainer,
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
        },
        locationPreviewText: {
            fontSize: 16,
            color: colors.text,
        },
        mapContainer: {
            height: 200,
            marginBottom: 16,
            borderRadius: 12,
            overflow: 'hidden',
        },
    });

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar
                    barStyle={colors.statusBarStyle as 'dark-content'}
                    backgroundColor={'#1E1E1E'}
                />
            </View>
            <View style={styles.headerContent}>
                <View style={styles.leftSection}>
                    <TouchableOpacity style={styles.ubicacion} onPress={() => setIsAddressModalVisible(true)}>
                        <Feather name="map-pin" size={18} color={colors.accent} />
                        <Text style={styles.textoUbicacion} numberOfLines={1} ellipsizeMode="tail">
                            {currentAddress ? currentAddress.data : 'Seleccionar dirección'}
                        </Text>
                        <Feather name="chevron-down" size={18} color={colors.accent} />
                    </TouchableOpacity>
                </View>
                <View style={styles.headerIcons}>
                    {showFavoriteButton && (
                        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('Favorites')}>
                            <Feather name="heart" size={24} color={colors.overText} />
                        </TouchableOpacity>
                    )}
                    {showCartButton && (
                        <Animated.View style={[styles.headerIcon, cartAnimatedStyle]}>
                            <TouchableOpacity onPress={handleCartPress}>
                                <Feather name="shopping-cart" size={24} color={colors.overText} />
                                {(cartItemCount ?? 0) > 0 && (
                                    <View style={styles.cartBadge}>
                                        <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </View>
            </View>

            <Overlay
                isVisible={isAddressModalVisible}
                onClose={() => setIsAddressModalVisible(false)}
            >
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Seleccionar dirección</Text>
                        <TouchableOpacity onPress={() => setIsAddressModalVisible(false)}>
                            <Feather name="x" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.searchContainer}>
                        <Feather name="search" size={20} color={colors.searchIcon} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar una nueva dirección"
                            placeholderTextColor={colors.searchIcon}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {isLoading && <ActivityIndicator style={styles.loadingIndicator} color={colors.primary} />}
                    </View>
                    <FlatList
                        style={styles.addressList}
                        contentContainerStyle={styles.listContent}
                        data={searchResults.length > 0 ? searchResults : savedAddresses}
                        keyExtractor={(item) => item.id}
                        renderItem={renderAddressItem}
                        ListEmptyComponent={
                            <Text style={styles.emptyListText}>
                                {isLoadingAddresses
                                    ? "Cargando direcciones..."
                                    : isErrorAddresses
                                        ? "Error al cargar direcciones. Por favor, intente de nuevo."
                                        : "No se encontraron direcciones. Intenta buscar una nueva dirección."}
                            </Text>
                        }
                        showsVerticalScrollIndicator={false}
                    />
                </View>
            </Overlay>

            <Overlay
                isVisible={isConfirmationModalVisible}
                onClose={() => setIsConfirmationModalVisible(false)}
            >
                <View style={styles.overlayContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Confirmar nueva dirección</Text>
                        <TouchableOpacity onPress={() => setIsConfirmationModalVisible(false)}>
                            <Feather name="x" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.mapContainer}>
                        <MapboxView
                            latitude={selectedAddress?.latitude || 0}
                            longitude={selectedAddress?.longitude || 0}
                            zoom={15}
                        />
                    </View>
                    <Text style={styles.confirmationText}>
                        ¿Es esta la ubicación correcta para la nueva dirección?
                    </Text>
                    <Text style={styles.addressText}>
                        {selectedAddress ? selectedAddress.data : ''}
                    </Text>
                    <View style={styles.confirmationButtons}>
                        <TouchableOpacity
                            style={[styles.confirmationButton, styles.confirmationButtonCancel]}
                            onPress={() => setIsConfirmationModalVisible(false)}
                        >
                            <Text style={[styles.confirmationButtonText, { color: colors.text }]}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmationButton, styles.confirmationButtonConfirm]}
                            onPress={() => addNewAddress(selectedAddress!)}
                        >
                            <Text style={styles.confirmationButtonText}>Confirmar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Overlay>

            <Overlay
                isVisible={isAdditionalInfoModalVisible}
                onClose={() => {
                    setIsAdditionalInfoModalVisible(false);
                    setSearchQuery('');
                }}
            >
                <View style={styles.editModalContent}>
                    <View style={styles.editModalHeader}>
                        <Text style={styles.editModalTitle}>
                            {savedAddresses.some(addr => addr.id === selectedAddress?.id)
                                ? 'Editar dirección'
                                : 'Agregar dirección'}
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                setIsAddressModalVisible(true);
                                setIsAdditionalInfoModalVisible(false)
                            }}
                        >
                            <Feather name="x" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView>
                        <Text style={styles.label}>Dirección</Text>
                        <Text style={styles.addressText}>{selectedAddress ? selectedAddress.data : ''}</Text>

                        <Text style={styles.label}>Descripción (ej: Casa, Trabajo)</Text>
                        <TextInput
                            style={styles.editInput}
                            placeholder="Ingrese una descripción"
                            placeholderTextColor={colors.searchIcon}
                            value={selectedAddress?.description}
                            onChangeText={(text) =>
                                setSelectedAddress(prev => prev ? { ...prev, description: text } : null)
                            }
                        />

                        <Text style={styles.label}>Número de piso (opcional)</Text>
                        <TextInput
                            style={styles.editInput}
                            placeholder="Ingrese el número de piso"
                            placeholderTextColor={colors.searchIcon}
                            value={selectedAddress?.floor_number}
                            onChangeText={(text) =>
                                setSelectedAddress(prev => prev ? { ...prev, floor_number: text } : null)
                            }
                        />
                    </ScrollView>

                    <View style={styles.editButtonContainer}>
                        <TouchableOpacity
                            style={styles.editSaveButton}
                            onPress={() => {
                                if (selectedAddress) {
                                    if (savedAddresses.some(addr => addr.id === selectedAddress.id)) {
                                        updateAddressMutation.mutate(selectedAddress);
                                    } else {
                                        confirmAddressMutation.mutate(selectedAddress);
                                    }
                                }
                            }}
                        >
                            <Text style={styles.editButtonText}>
                                {savedAddresses.some(addr => addr.id === selectedAddress?.id)
                                    ? 'Actualizar dirección'
                                    : 'Guardar dirección'}
                            </Text>
                        </TouchableOpacity>

                        {savedAddresses.some(addr => addr.id === selectedAddress?.id) && (
                            <TouchableOpacity
                                style={styles.editDeleteButton}
                                onPress={() => {
                                    if (selectedAddress) {
                                        Alert.alert(
                                            "Borrar Dirección",
                                            "¿Seguro que quieres borrar esta dirección?",
                                            [
                                                {
                                                    text: "Cancelar",
                                                    style: "cancel"
                                                },
                                                {
                                                    text: "Borrar",
                                                    onPress: () => deleteAddressMutation.mutate(selectedAddress.id)
                                                }
                                            ]
                                        );
                                    }
                                }}
                            >
                                <Text style={styles.editButtonText}>Borrar dirección</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Overlay>
        </SafeAreaView>
    );
}

