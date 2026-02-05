import { Alert } from "react-native";
import { RefObject } from "react";
import { View } from "react-native";

export const shareView = async (viewRef: any) => {
    Alert.alert("お知らせ", "Web版ではシェア機能は利用できません");
};
