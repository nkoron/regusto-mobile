import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
    CardStyleInterpolators,
    createStackNavigator,
    StackCardInterpolationProps,
    TransitionSpecs
} from '@react-navigation/stack';
import { Feather } from "@expo/vector-icons";
import LoginScreen from './login';
import PaginaInicio from './home';
import MisPedidosScreen from "@/app/orders";
import StoresScreen from "@/app/stores";
import OrderDetailsPage from "@/app/orderDetails";
import FavoritesPage from "@/app/favorites";
import { ProductDetailScreen } from "@/app/productInstances";
import { CommerceDetailScreen } from "@/app/commercePage";
import Profile from "@/app/profile";
import CartPage from "@/app/cart";
import { Order } from "@/app/orders";
import { Product, Basket } from "@/app/commercePage";
import LayoutHeader from "@/app/header";
import chatPage from "@/app/chatPage";
import { useTheme } from "@/app/themeContext";
import { OpeningAnimation } from './OpeningAnimation';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import {SlideOutRight} from "react-native-reanimated";
import RatingPage from "@/app/ratings";
import PaymentSuccessScreen from "@/app/paymentSuccess";
export interface Store {
    id: string;
    name: string;
    category: string;
    phone: string;
    rating: number;
    isFavorite?: boolean;
    logo: string;
}

export type RootStackParamList = {
    Login: undefined;
    OpeningAnimation: undefined;
    MainTabs: {screen: keyof MainTabParamList};
    CommerceDetail: { store: Store };
    Cart: undefined;
    OrderDetails: { order: Order, storeName: string };
    Favorites: undefined;
    ProductDetail: { item: Product | Basket };
    Chat: { order: Order };
    PaymentSuccess: { orderId?: string };
    Rating: { order: Order }; // Add this line
};

export type MainTabParamList = {
    PaginaInicio: undefined;
    Orders: undefined;
    Stores: { category: string };
    Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
    const { colors, theme } = useTheme();
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ color, size }) => {
                    let iconName: 'home' | 'shopping-cart' | 'shopping-bag' | 'user' | 'help-circle' = 'help-circle';

                    if (route.name === 'PaginaInicio') {
                        iconName = 'home';
                    } else if (route.name === 'Orders') {
                        iconName = 'shopping-cart';
                    } else if (route.name === 'Stores') {
                        iconName = 'shopping-bag';
                    } else if (route.name === 'Profile') {
                        iconName = 'user';
                    }

                    return <Feather name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.text,
                tabBarStyle: {
                    height: 60,
                    paddingBottom: 5,
                    paddingTop: 5,
                    backgroundColor: colors.secondaryBackground,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
                header: () => route.name !== 'Profile' ? <LayoutHeader /> : null,
            })}
        >
            <Tab.Screen name="PaginaInicio" component={PaginaInicio} options={{ title: 'Inicio' }} />
            <Tab.Screen name="Orders" component={MisPedidosScreen}  options={{ title: 'Mis pedidos' }} />
            <Tab.Screen name="Stores" component={StoresScreen} initialParams={{category: "All"}} options={{ title: 'Tiendas' }} />
            <Tab.Screen name="Profile" component={Profile} options={{ title: 'Mi Perfil' }} />
        </Tab.Navigator>
    );
}

const SlideFromLeft = ({ current, layouts }: StackCardInterpolationProps) => {
    const translateX = current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [-layouts.screen.width, 0],
    });

    return {
        cardStyle: {
            transform: [{ translateX }],
        },
    };
};

const SlideFromRightIOS = ({ current, layouts }: StackCardInterpolationProps) => {
    const translateX = current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [layouts.screen.width, 0],
    });

    return {
        cardStyle: {
            transform: [{ translateX }],
        },
    };
};

export default function AppNavigator() {
    const [isAnimationComplete, setIsAnimationComplete] = useState(false);
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const getQueryParams = (url: string) => {
        const params = new URLSearchParams(url.split('?')[1]);
        const queryParams: { [key: string]: string } = {};
        params.forEach((value, key) => {
            queryParams[key] = value;
        });
        return queryParams;
    };
    useEffect(() => {
        const handleDeepLink = async (url: string) => {
            console.log('Handling deep link:', url);
            if (url) {
                const token = await AsyncStorage.getItem('token');
                if (token) {
                    const orderId = url.includes("orderId");
                    if (orderId) {
                        const aux= getQueryParams(url).orderId;
                        console.log('Order ID:', aux);
                        navigation.navigate('PaymentSuccess', { orderId: aux });
                    } else {
                        navigation.navigate('OpeningAnimation');
                    }
                } else {
                    navigation.navigate('Login');
                }
            }
        };

        const subscription = Linking.addEventListener('url', (event) => {
            handleDeepLink(event.url);
        });

        Linking.getInitialURL().then((url) => {
            if (url) {
                handleDeepLink(url);
            }
        });

        return () => {
            subscription.remove();
        };
    }, [navigation]);


    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                gestureEnabled: false,
                gestureDirection: 'horizontal',
            }}
            initialRouteName="Login"
        >
            <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{
                    headerShown: false,
                    cardStyleInterpolator: SlideFromLeft,
                    gestureEnabled: false,
                }}
            />
            <Stack.Screen
                    name="Rating"
                    component={RatingPage}
                    options={{
                        headerShown: false,
                        cardStyleInterpolator: SlideFromRightIOS,
                        gestureDirection: 'horizontal',
                        gestureEnabled: true,
                        transitionSpec: {
                            open: TransitionSpecs.TransitionIOSSpec,
                            close: TransitionSpecs.TransitionIOSSpec,
                        },
                    }}
                />
                <Stack.Screen
                    name="OpeningAnimation"
                    options={{
                        headerShown: false,
                        gestureEnabled: false,
                    }}
                >
                    {(props) => (
                        <OpeningAnimation
                            {...props}
                            onAnimationComplete={() => setIsAnimationComplete(true)}
                        />
                    )}
                </Stack.Screen>
                <Stack.Screen
                    name="MainTabs"
                    component={MainTabs}
                    options={{
                        headerShown: false,
                        cardStyleInterpolator: CardStyleInterpolators.forNoAnimation,
                        animationEnabled: false,
                        gestureEnabled: false,
                    }}
                />
                <Stack.Screen
                    name="CommerceDetail"
                    component={CommerceDetailScreen}
                    options={{
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="Cart"
                    component={CartPage}
                    options={{
                        headerShown: false,
                        cardStyleInterpolator: SlideFromRightIOS,
                        gestureDirection: 'horizontal',
                        gestureEnabled: true,
                        transitionSpec: {
                            open: TransitionSpecs.TransitionIOSSpec,
                            close: TransitionSpecs.TransitionIOSSpec,
                        },
                    }}
                />
                <Stack.Screen
                    name="OrderDetails"
                    component={OrderDetailsPage}
                    options={{
                        headerShown: false,
                        gestureEnabled: true,
                    }}
                />
                <Stack.Screen
                    name="Chat"
                    component={chatPage}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Favorites"
                    component={FavoritesPage}
                    options={{
                        headerShown: false,
                        gestureEnabled: true,
                    }}
                />
                <Stack.Screen
                    name="ProductDetail"
                    component={ProductDetailScreen}
                    options={{
                        headerShown: false,
                        cardStyleInterpolator: SlideFromRightIOS,
                        gestureDirection: 'horizontal', // Set gesture direction for exiting
                        gestureEnabled: true,
                        transitionSpec: {
                            open: TransitionSpecs.TransitionIOSSpec,
                            close: TransitionSpecs.TransitionIOSSpec,
                        },
                    }}
                />
            <Stack.Screen
                name="PaymentSuccess"
                component={PaymentSuccessScreen} // Add the PaymentSuccessScreen
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            </Stack.Navigator>
    );
}

