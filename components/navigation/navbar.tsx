import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '@/app/AppNavigator';
import { useTheme } from '@/app/themeContext';

type NavigationProp = BottomTabNavigationProp<MainTabParamList>;

const Navbar: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute();
    const { colors, theme } = useTheme();

    const isActive = (routeName: keyof MainTabParamList) => route.name === routeName;

    const styles = StyleSheet.create({
        navegacionInferior: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'center',
            height: 60,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.secondaryBackground,
        },
        itemNav: {
            alignItems: 'center',
        },
        textoNav: {
            marginTop: 4,
            fontSize: 12,
            color: colors.text,
        },
        textoNavActivo: {
            color: colors.primary,
            fontWeight: '600',
        },
    });

    return (
        <View style={styles.navegacionInferior}>
            <TouchableOpacity
                style={styles.itemNav}
                onPress={() => navigation.navigate('PaginaInicio')}
                accessibilityRole="button"
                accessibilityLabel="Ir a Inicio"
            >
                <Feather name="home" size={24} color={isActive('PaginaInicio') ? colors.primary : colors.text} />
                <Text style={[styles.textoNav, isActive('PaginaInicio') && styles.textoNavActivo]}>Inicio</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.itemNav}
                onPress={() => navigation.navigate('Orders')}
                accessibilityRole="button"
                accessibilityLabel="Ir a Mis pedidos"
            >
                <Feather name="shopping-cart" size={24} color={isActive('Orders') ? colors.primary : colors.text} />
                <Text style={[styles.textoNav, isActive('Orders') && styles.textoNavActivo]}>Mis pedidos</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.itemNav}
                onPress={() => navigation.navigate('Stores')}
                accessibilityRole="button"
                accessibilityLabel="Ir a Tiendas"
            >
                <Feather name="shopping-bag" size={24} color={isActive('Stores') ? colors.primary : colors.text} />
                <Text style={[styles.textoNav, isActive('Stores') && styles.textoNavActivo]}>Tiendas</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.itemNav}
                onPress={() => navigation.navigate('Profile')}
                accessibilityRole="button"
                accessibilityLabel="Ir a Mi Perfil"
            >
                <Feather name="heart" size={24} color={isActive('Profile') ? colors.primary : colors.text} />
                <Text style={[styles.textoNav, isActive('Profile') && styles.textoNavActivo]}>Mi Perfil</Text>
            </TouchableOpacity>
        </View>
    );
};

export default Navbar;

