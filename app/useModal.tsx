import { useState, useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';

export const useModal = (initialState: boolean = false) => {
    const [isVisible, setIsVisible] = useState(initialState);

    const show = useCallback(() => {
        setIsVisible(true);
    }, []);

    const hide = useCallback(() => {
        setIsVisible(false);
    }, []);

    const toggle = useCallback(() => {
        setIsVisible(prev => !prev);
    }, []);

    // Handle back button press on Android
    const handleBackPress = useCallback(() => {
        if (isVisible) {
            hide();
            return true;
        }
        return false;
    }, [isVisible, hide]);

    // Add back handler when the component mounts
    if (Platform.OS === 'android') {
        BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    }

    return { isVisible, show, hide, toggle };
};

