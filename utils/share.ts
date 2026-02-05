import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { RefObject } from "react";
import { View } from "react-native";

export const shareView = async (viewRef: any) => {
    try {
        if (viewRef.current) {
            const uri = await captureRef(viewRef, {
                format: "png",
                quality: 0.9,
            });
            await Sharing.shareAsync(uri);
        }
    } catch (error) {
        console.log("Error sharing:", error);
    }
};
