import React from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, Animated, Dimensions } from 'react-native';
import {useThemeColor} from "@/hooks/useThemeColor";
import {useTheme} from "@/app/themeContext";

interface OverlayProps {
    isVisible: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

const Overlay: React.FC<OverlayProps> = ({ isVisible, onClose, children }) => {
    const [fadeAnim] = React.useState(new Animated.Value(0));
    const { width, height } = Dimensions.get('window');
    const {colors} = useTheme();

    React.useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: isVisible ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isVisible]);

    if (!isVisible) return null;

    const styles = StyleSheet.create({
        container: {
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 1000,
            elevation: 1000,
        },
        backdrop: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
        },
        content: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.background,
            borderTopLeftRadius: 25,
            borderTopRightRadius: 25,
            height: '92%',
        },
        innerContent: {
            flex: 1,
            padding: 20,
            marginBottom: 113,
        },
    });

    return (
        <View style={[styles.container, { width, height }]}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.backdrop} />
            </TouchableWithoutFeedback>
            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{
                            translateY: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [height, 0]
                            })
                        }]
                    }
                ]}
            >
                <View style={styles.innerContent}>
                    {children}
                </View>
            </Animated.View>
        </View>
    );
};

export default Overlay;

