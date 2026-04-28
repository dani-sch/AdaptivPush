import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/constants/themes';

interface Props {
    imageUrl?: string;
    description?: string;
}

export function ExerciseInfoPanel({ imageUrl, description }: Props) {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

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

function createStyles(theme: Theme) {
    return StyleSheet.create({
        panel: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            paddingTop: 10,
            paddingBottom: 4,
            marginTop: 8,
            borderTopWidth: 1,
            borderTopColor: theme.border,
        },
        image: {
            width: 90,
            height: 90,
            borderRadius: 8,
            backgroundColor: theme.mutedBg,
            flexShrink: 0,
        },
        description: {
            flex: 1,
            color: theme.text,
            fontSize: 12,
            lineHeight: 18,
        },
    });
}
