import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from "@/app/themeContext";

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectCategory: (category: string | null) => void;
    selectedCategory: string | null;
}

const categories = ['all', 'accepted', 'pending', 'ready', 'completed', 'payed', 'rejected'];

export default function FilterModal({ visible, onClose, onSelectCategory, selectedCategory }: FilterModalProps) {
    const { colors } = useTheme();

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
            default:
                return 'Desconocido';
        }
    }

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={[styles.centeredView, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
                <View style={[styles.modalView, { backgroundColor: colors.background }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Filtrar por categoría</Text>
                    {categories.map((category) => (
                        <TouchableOpacity
                            key={category}
                            style={[
                                styles.categoryButton,
                                { backgroundColor: selectedCategory === category ? colors.primary : colors.secondaryBackground }
                            ]}
                            onPress={() => onSelectCategory(category === 'all' ? null : category)}
                        >
                            <Text
                                style={[
                                    styles.categoryButtonText,
                                    { color: selectedCategory === category ? colors.secondaryBackground : colors.primary }
                                ]}
                            >
                                {traducirOrdenes(category)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={[styles.closeButton, { backgroundColor: colors.primary }]}
                        onPress={onClose}
                    >
                        <Text style={[styles.closeButtonText, { color: colors.secondaryBackground }]}>Cerrar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalView: {
        width: '80%',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    categoryButton: {
        width: '100%',
        padding: 10,
        borderRadius: 10,
        marginVertical: 5,
    },
    categoryButtonText: {
        textAlign: 'center',
        fontSize: 16,
    },
    closeButton: {
        marginTop: 20,
        padding: 10,
        borderRadius: 10,
        width: '100%',
    },
    closeButtonText: {
        textAlign: 'center',
        fontWeight: 'bold',
    },
});

