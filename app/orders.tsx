import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, FlatList, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NavigationProp } from "@react-navigation/native";
import Animated, {
    FadeInRight,
    LinearTransition,
    useAnimatedScrollHandler,
    useSharedValue
} from 'react-native-reanimated';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {fetchOrders, fetchStores} from "@/app/api";
import { useTheme } from "@/app/themeContext";
import FilterModal from './FilterModal';

export interface ProductInstance {
    product_instance: string;
    quantity: number;
    discount: number;
    price: number;
    name: string;
}

export interface Order {
    order_id: string;
    user_id: string;
    created_at: string;
    price: number;
    del_address: string;
    pickup: boolean;
    status: string;
    products: ProductInstance[];
    rating: string;
    commerce_id: string;
}

type OrdersPageProps = {
    navigation: NavigationProp<any>;
};

const traducirOrdenes = (status: string) => {
    switch (status) {
        case 'all':
            return 'Todos';
        case 'accepted':
            return 'Aceptado';
        case 'pending':
            return 'Pendiente';
        case 'ready':
            return 'Listo';
        case 'completed':
            return 'Completado';
        case 'payed':
            return 'Pagado';
        case 'rejected':
            return 'Rechazado';
        case 'rated':
            return 'Calificado';
        default:
            return 'Desconocido';
    }
}

const OrderItem = React.memo(({ item, onPress, onChatPress }: { item: Order; onPress: () => void; onChatPress: () => void }) => {
    const { colors } = useTheme();
    return (
        <Animated.View entering={FadeInRight} layout={LinearTransition.springify()}>
            <TouchableOpacity style={[styles.orderItem, { backgroundColor: colors.secondaryBackground }]} onPress={onPress}>
                <View style={styles.orderHeader}>
                    <Text style={[styles.orderId, { color: colors.primary }]}>Orden #{item.order_id}</Text>
                    <Text style={[styles.orderDate, { color: colors.text }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={styles.orderContent}>
                    <View style={styles.orderInfo}>
                        <Text style={[styles.orderPrice, { color: colors.text }]}>{`$${item.price.toFixed(2)}`}</Text>
                        <Text style={[
                            styles.orderStatus,
                            { backgroundColor: getStatusColor(item.status, colors), color: colors.secondaryBackground }
                        ]}>
                            {traducirOrdenes(item.status)}
                        </Text>
                    </View>
                    <View style={styles.actionIcons}>
                        {(item.status === 'ready' || item.status === 'accepted') && (
                            <TouchableOpacity onPress={onChatPress} style={styles.chatIcon}>
                                <Feather name="message-square" size={24} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                        <Feather name="chevron-right" size={24} color={colors.primary} />
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

const getStatusColor = (status: string, colors: any) => {
    switch (status) {
        case 'accepted':
            return colors.success;
        case 'completed':
            return colors.completed;
        case 'payed':
            return colors.success;
        case 'ready':
            return colors.success;
        case 'pending':
            return colors.pending;
        case 'rejected':
            return colors.failure;
        default:
            return colors.text;
    }
};

const ITEM_HEIGHT = 120;

export default function OrdersPage({ navigation }: OrdersPageProps) {
    const { colors } = useTheme();
    const { data: orders = [], isLoading, isError } = useQuery<Order[]>({
        queryKey: ['orders'],
        queryFn: fetchOrders,
    });
    const { data: stores = [], isLoading: isStoresLoading, isError: isStoresError } = useQuery({
        queryKey: ['stores'],
        queryFn: fetchStores,
    });
    const scrollY = useSharedValue(0);
    const [refreshing, setRefreshing] = useState(false);
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    const sortedOrders = useMemo(() => {
        return [...orders].sort((a, b) => b.order_id > a.order_id ? 1 : -1);
    }, [orders]);

    const filteredOrders = useMemo(() => {
        if (!selectedCategory) return sortedOrders;
        return sortedOrders.filter(order => order.status === selectedCategory || selectedCategory === 'all');
    }, [sortedOrders, selectedCategory]);

    const queryClient = useQueryClient();

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Promise.all([
            queryClient.invalidateQueries({ queryKey: ['ratingStatus'] }),
            queryClient.invalidateQueries({ queryKey: ['orders'] }),
        ]).then(() => {
            setRefreshing(false);
        })
    }, [queryClient]);

    const renderOrderItem = useCallback(({ item }: { item: Order }) => (
        <OrderItem
            key={item.order_id}
            item={item}
            onPress={() => navigation.navigate('OrderDetails', { order: item, storeName: stores.find(store => store.id === item.commerce_id)?.name })}
            onChatPress={() => navigation.navigate('Chat', { order: item})}
        />
    ), [navigation]);

    const getItemLayout = useCallback((data: ArrayLike<Order> | null | undefined, index: number) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
    }), []);

    if (isError) {
        return (
            <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { color: colors.error }]}>No se pudieron cargar tus ordenes. Intente de nuevo.</Text>
            </View>
        );
    }

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Mis Pedidos</Text>
                <Text style={[styles.subtitle, { color: colors.text }]}>{traducirOrdenes(selectedCategory)}</Text>
                <TouchableOpacity
                    style={[styles.filterButton, { backgroundColor: colors.primary }]}
                    onPress={() => setFilterModalVisible(true)}
                >
                    <Feather name="filter" size={24} color={colors.secondaryBackground} />
                </TouchableOpacity>
            </View>
            {filteredOrders.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                    <Text style={[styles.emptyStateText, { color: colors.text }]}>No hay ordenes</Text>
                    <Text style={[styles.emptyStateSubText, { color: colors.text }]}>Comenza a comprar para ver tus ordenes</Text>
                </View>
            ) : (
                <Animated.FlatList
                    data={filteredOrders}
                    renderItem={renderOrderItem}
                    keyExtractor={(item) => item.order_id}
                    contentContainerStyle={styles.orderList}
                    onScroll={scrollHandler}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                    getItemLayout={getItemLayout}
                    windowSize={5}
                    removeClippedSubviews={true}
                    initialNumToRender={10}
                    maxToRenderPerBatch={5}
                />
            )}
            <FilterModal
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                onSelectCategory={(category) => {
                    setSelectedCategory(category || "all");
                    setFilterModalVisible(false);
                }}
                selectedCategory={selectedCategory}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 16,
        color: 'gray',
        marginTop: 4,
    },
    filterButton: {
        padding: 8,
        borderRadius: 8,
    },
    orderList: {
        padding: 16,
    },
    orderItem: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    orderId: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    orderDate: {
        fontSize: 14,
    },
    orderContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderInfo: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    orderPrice: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    orderStatus: {
        fontSize: 14,
        textTransform: 'capitalize',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    actionIcons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    chatIcon: {
        marginRight: 8,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    emptyStateText: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptyStateSubText: {
        fontSize: 16,
        textAlign: 'center',
    },
});

