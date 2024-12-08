import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NavigationProp, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { Order } from './orders';
import { getPusherClient } from "@/app/pusherClient";
import asyncStorage from "@react-native-async-storage/async-storage/src/AsyncStorage";
import Pusher from "pusher-js";
import {useTheme} from "@/app/themeContext";

type RootStackParamList = {
    Chat: { order: Order } | undefined;
};

type ChatPageRouteProp = RouteProp<RootStackParamList, 'Chat'>;

interface Message {
    sender: string
    text: string
    order_id: string
}

interface ToSend {
    channel: string
    event: string
    data: Message
}

const traducirOrdenes = (status: string) => {
    switch (status) {
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

const postMessage = async (tosend: ToSend) => {
    let response = await fetch('https://regusto.azurewebsites.net/pusher/trigger', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await asyncStorage.getItem('token')}`
        },
        body: JSON.stringify(tosend)
    })
    if (!response.ok) {
        throw new Error('Failed to send message')
    }
}

const getMessages = async (orderId: string) => {
    let response = await fetch(`https://regusto.azurewebsites.net/pusher/messages?channel=chat-${orderId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await asyncStorage.getItem('token')}`
        }})
    if (!response.ok) {
        throw new Error('Failed to fetch messages')
    }
    return response.json()
}

const ChatPage: React.FC = () => {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const route = useRoute<ChatPageRouteProp>();
    const [order, setOrder] = useState<Order | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        const loadOrder = async () => {
            setIsLoading(true);
            if (route.params?.order) {
                setOrder(route.params.order);
            } else {
                setOrder({
                    commerce_id: "",
                    order_id: 'unknown',
                    user_id: '',
                    created_at: new Date().toISOString(),
                    price: 0,
                    del_address: '',
                    pickup: false,
                    status: 'unknown',
                    products: [],
                    rating: 'unrated'
                });
            }
            setIsLoading(false);
        };

        loadOrder();
    }, [route.params]);

    useEffect(() => {
        const fetchPreviousMessages = async () => {
            if (order) {
                try {
                    const previousMessages = await getMessages(order.order_id);
                    setMessages(previousMessages);
                } catch (error) {
                    console.error('Failed to fetch previous messages:', error);
                }
            }
        };

        fetchPreviousMessages();

        if (order) {
            const pusher = new Pusher('944c0ebb45844385955c', {
                cluster: 'sa1',
            })
            pusher.connection.bind('disconnected', () => {
                console.log('Disconnected, attempting to reconnect...')
                pusher.connect()
            })
            const channel = pusher.subscribe(`chat-${order.order_id}`)
            channel.bind('new-message', (data: Message) => {
                //console.log('new message:', data)
                setMessages((prevMessages) => [...prevMessages, data])
            })

            return () => {
                channel.unbind_all();
                channel.unsubscribe();
                pusher.disconnect();
            };
        }
    }, [order]);

    const sendMessage = useCallback(async () => {
        if (inputMessage.trim() === '' || !order) return;

        const newMessage: Message = {
            text: inputMessage,
            sender: 'user',
            order_id: order.order_id,
        };
        const toSend: ToSend = {
            channel: `chat-${order.order_id}`,
            event: 'new-message',
            data: newMessage,
        };
        try {
            await postMessage(toSend);
            //setMessages(prevMessages => [...prevMessages, newMessage]);
            setInputMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    }, [inputMessage, order]);

    const renderMessage = ({ item }: { item: Message }) => (
        <View style={[
            styles.messageBubble,
            item.sender === 'user' ? styles.userMessage : styles.merchantMessage,
            { backgroundColor: item.sender === 'user' ? colors.primary : colors.card, borderColor: colors.border }
        ]}>
            <Text style={[
                styles.messageText,
                { color: item.sender === 'user' ? colors.messageText : colors.text }
            ]}>{item.text}</Text>
        </View>
    );

    const handleExit = () => {
        navigation.goBack();
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#269577" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
            <View style={[styles.header, { backgroundColor: colors.secondaryBackground, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={handleExit} style={styles.exitButton}>
                    <Feather name="x" size={24} color={colors.icon} />
                </TouchableOpacity>
                {order && (
                    <View style={styles.orderInfo}>
                        <Text style={[styles.orderTitle, { color: colors.primary }]}>Orden #{order.order_id}</Text>
                        <Text style={[styles.orderDetails, { color: colors.secondaryText }]}>
                            Estado: {traducirOrdenes(order.status)} | Total: ${order.price.toFixed(2)}
                        </Text>
                    </View>
                )}
            </View>
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                contentContainerStyle={styles.messageList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                keyExtractor={(item, index) => `${item.order_id}-${index}`}
            />
            <View style={[styles.inputContainer, { backgroundColor: colors.secondaryBackground }]}>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.searchContainer, color: colors.text }]}
                    value={inputMessage}
                    onChangeText={setInputMessage}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.placeholder}
                />
                <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.primary }]} onPress={sendMessage}>
                    <Feather name="send" size={24} color={colors.buttonText} />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    exitButton: {
        padding: 8,
    },
    orderInfo: {
        flex: 1,
        marginLeft: 16,
    },
    orderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    orderDetails: {
        fontSize: 14,
        marginTop: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageList: {
        padding: 16,
        flexGrow: 1,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 20,
        marginBottom: 8,
    },
    userMessage: {
        alignSelf: 'flex-end',
    },
    merchantMessage: {
        alignSelf: 'flex-start',
        borderWidth: 1,
    },
    messageText: {
        fontSize: 16,
    },
    userMessageText: {
        color: '#FFFFFF',
    },
    merchantMessageText: {
        color: '#000000',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
    },
    input: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        fontSize: 16,
    },
    sendButton: {
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ChatPage;