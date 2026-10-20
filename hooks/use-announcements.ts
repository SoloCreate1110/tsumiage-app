import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";

import { APP_ANNOUNCEMENTS } from "@/constants/announcements";

const SEEN_ANNOUNCEMENTS_KEY = "seen_announcements";

export function useAnnouncements() {
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSeenIds = async () => {
      try {
        const raw = await AsyncStorage.getItem(SEEN_ANNOUNCEMENTS_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSeenIds(parsed.filter((id): id is string => typeof id === "string"));
        }
      } catch (error) {
        console.error("Failed to load seen announcements:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSeenIds();
  }, []);

  const markAsSeen = useCallback(async (id: string) => {
    setSeenIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      AsyncStorage.setItem(SEEN_ANNOUNCEMENTS_KEY, JSON.stringify(next)).catch((error) => {
        console.error("Failed to save seen announcements:", error);
      });
      return next;
    });
  }, []);

  const markLaunchAnnouncementAsSeen = useCallback(async (id: string) => {
    setSeenIds((prev) => {
      const next = Array.from(
        new Set([
          ...prev,
          ...APP_ANNOUNCEMENTS.filter((announcement) => announcement.id !== id).map(
            (announcement) => announcement.id
          ),
          id,
        ])
      );
      AsyncStorage.setItem(SEEN_ANNOUNCEMENTS_KEY, JSON.stringify(next)).catch((error) => {
        console.error("Failed to save seen announcements:", error);
      });
      return next;
    });
  }, []);

  const latestUnseen = useMemo(() => {
    return APP_ANNOUNCEMENTS.find((announcement) => !seenIds.includes(announcement.id)) ?? null;
  }, [seenIds]);

  const announcements = APP_ANNOUNCEMENTS;

  return {
    announcements,
    latestUnseen,
    seenIds,
    loading,
    markAsSeen,
    markLaunchAnnouncementAsSeen,
  };
}
