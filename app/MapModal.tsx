import React, {useCallback, useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Platform, Linking, BackHandler} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from "@/app/themeContext";
import { Order } from './orders';
import { Restaurante } from './home';
import {useFocusEffect, useNavigation} from "@react-navigation/native";
import {runOnJS} from "react-native-reanimated";
import MapboxView from './MapboxView';

const openMaps = (latitude: number, longitude: number, label: string) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${latitude},${longitude}`;
    const url = Platform.select({
        ios: `${scheme}${label}@${latLng}`,
        android: `${scheme}${latLng}(${label})`
    });
    if (url) {
        Linking.openURL(url);
    }
};

interface MapModalProps {
    isVisible: boolean;
    onClose: () => void;
    order: Order | null;
    store: Restaurante | null;
}

export const MapModal: React.FC<MapModalProps> = ({ isVisible, onClose, order, store }) => {
    const { colors } = useTheme();
    //const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    //useEffect(() => {
    //    (async () => {
    //        let { status } = await Location.requestForegroundPermissionsAsync();
    //        if (status !== 'granted') {
    //            console.log('Permission to access location was denied');
    //            return;
    //        }

    //        let location = await Location.getCurrentPositionAsync({});
    //        setUserLocation({
    //            latitude: location.coords.latitude,
    //            longitude: location.coords.longitude,
    //        });
    //    })();
    //}, []);

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (isVisible) {
                    onClose();
                    return true;
                }
                return false;
            };

            BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => {
                BackHandler.removeEventListener('hardwareBackPress', onBackPress);
            };
        }, [isVisible])
    );

    if (!isVisible || !order || !store) return null;

    const styles = StyleSheet.create({
        container: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        modal: {
            backgroundColor: colors.background,
            borderRadius: 20,
            padding: 20,
            width: '90%',
            maxHeight: '90%',
        },
        closeButton: {
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 1,
        },
        title: {
            fontSize: 20,
            fontWeight: 'bold',
            marginBottom: 15,
            color: colors.text,
            textAlign: 'center',
        },
        map: {
            width: '100%',
            height: 350,
            marginBottom: 15,
            borderRadius: 10,
            overflow: 'hidden',
        },
        info: {
            marginBottom: 8,
            color: colors.text,
            fontSize: 16,
        },
        button: {
            backgroundColor: colors.primary,
            padding: 10,
            borderRadius: 10,
            alignItems: 'center',
            marginTop: 10,
        },
        buttonText: {
            color: colors.background,
            fontWeight: 'bold',
        },
        mapContainer: {
            height: 200,
            marginBottom: 16,
            borderRadius: 12,
            overflow: 'hidden',
        },
    });

    return (
        <View style={styles.container}>
            <View style={styles.modal}>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Feather name="x" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Ubicación del comercio</Text>
                <View style={styles.mapContainer}>
                    <MapboxView
                        latitude={store.latitude}
                        longitude={store.longitude}
                        zoom={15}
                        style={styles.map}
                    />
                </View>
                <Text style={styles.info}>Pedido #{order.order_id}</Text>
                <Text style={styles.info}>Comercio: {store.name}</Text>
                <Text style={styles.info}>Dirección: {store.address_data}</Text>
                {/*<TouchableOpacity*/}
                {/*    style={styles.button}*/}
                {/*    onPress={() => openMaps(store.latitude, store.longitude, store.name)}*/}
                {/*>*/}
                {/*    <Text style={styles.buttonText}>Abrir en Maps</Text>*/}
                {/*</TouchableOpacity>*/}
            </View>
        </View>
    );
};

