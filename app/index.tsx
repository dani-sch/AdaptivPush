import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function Index() {
    return (
        <View style={styles.container}>
            <Pressable
                style={styles.button}
                onPress={() => router.push("/(auth)/join")}
            >
                <Text style={styles.buttonText}>Go to Join</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        backgroundColor: "#09090b",
    },
    button: {
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 14,
        backgroundColor: "#2563eb",
    },
    buttonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
});
