import Constants from "expo-constants";
import { Platform } from "react-native";

// Guard the import itself: the package requires modules absent from Expo Go.
export async function loadNotifications() {
  if (Constants.executionEnvironment === "storeClient" || Platform.OS === "web") {
    throw new Error("Native notifications are unavailable in this environment");
  }
  return import("expo-notifications");
}
