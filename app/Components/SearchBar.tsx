import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import {Feather} from '@expo/vector-icons';
import {useTheme} from "@/app/themeContext";

export const SearchBar = ({ onSearch }: { onSearch: (query: string) => void }) => {
    const [query, setQuery] = useState('');
    const {colors} = useTheme();

    const handleSearch = (text: string) => {
        setQuery(text);
        onSearch(text);
    };

    return (
        <View style={[styles.container, {backgroundColor: colors.searchContainer}]}>
            <Feather name="search" size={20} color={colors.searchIcon} style={styles.icon} />
            <TextInput
                style={[styles.input, {color: colors.text}]}
                placeholder="Buscar productos..."
                placeholderTextColor={colors.placeholder}
                value={query}
                onChangeText={handleSearch}
            />
            {query.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
                    <Feather name="x" size={20} color="#9CA3AF" />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginHorizontal: 16,
        marginVertical: 8,
    },
    icon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 8,
    },
    clearButton: {
        padding: 4,
    },
});

