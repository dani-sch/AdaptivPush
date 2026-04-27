import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { BORDER_COLOR, MUTED_BG, TEXT_COLOR } from '@/constants/colors';

interface Props {
    imageUrl?: string;
    description?: string;
}

export function ExerciseInfoPanel({ imageUrl, description }: Props) {
    if (!imageUrl && !description) return null;

    return (
        <View style={styles.panel}>
            {imageUrl ? (
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    resizeMode="contain"
                />
            ) : null}
            {description ? (
                <Text style={styles.description} numberOfLines={4}>{description}</Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    panel: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingTop: 10,
        paddingBottom: 4,
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: BORDER_COLOR,
    },
    image: {
        width: 90,
        height: 90,
        borderRadius: 8,
        backgroundColor: MUTED_BG,
        flexShrink: 0,
    },
    description: {
        flex: 1,
        color: TEXT_COLOR,
        fontSize: 12,
        lineHeight: 18,
    },
});
