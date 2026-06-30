import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const FIRST_LAUNCH_SEEN_KEY = "first_launch_seen";

export function useFirstLaunch() {
  const [loading, setLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const seen = await AsyncStorage.getItem(FIRST_LAUNCH_SEEN_KEY);
        setIsFirstLaunch(!seen);
      } catch (error) {
        console.error("Failed to load first launch state:", error);
        setIsFirstLaunch(false);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const markFirstLaunchSeen = useCallback(async () => {
    await AsyncStorage.setItem(FIRST_LAUNCH_SEEN_KEY, "1");
    setIsFirstLaunch(false);
  }, []);

  return {
    loading,
    isFirstLaunch,
    markFirstLaunchSeen,
  };
}
