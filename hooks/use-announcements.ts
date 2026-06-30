import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";

import { APP_ANNOUNCEMENTS } from "@/constants/announcements";

const SEEN_ANNOUNCEMENT_IDS_KEY = "seen_announcement_ids";

export function useAnnouncements() {
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSeenIds = async () => {
      try {
        const raw = await AsyncStorage.getItem(SEEN_ANNOUNCEMENT_IDS_KEY);
        setSeenIds(raw ? JSON.parse(raw) : []);
      } catch (error) {
        console.error("Failed to load seen announcements:", error);
        setSeenIds([]);
      } finally {
        setLoading(false);
      }
    };

    void loadSeenIds();
  }, []);

  const persistSeenIds = useCallback(async (nextIds: string[]) => {
    const uniqueIds = Array.from(new Set(nextIds));
    setSeenIds(uniqueIds);
    await AsyncStorage.setItem(SEEN_ANNOUNCEMENT_IDS_KEY, JSON.stringify(uniqueIds));
  }, []);

  const markAsSeen = useCallback(
    async (id: string) => {
      await persistSeenIds([...seenIds, id]);
    },
    [persistSeenIds, seenIds]
  );

  const markAllAsSeen = useCallback(async () => {
    await persistSeenIds(APP_ANNOUNCEMENTS.map((announcement) => announcement.id));
  }, [persistSeenIds]);

  const unseenAnnouncements = useMemo(
    () => APP_ANNOUNCEMENTS.filter((announcement) => !seenIds.includes(announcement.id)),
    [seenIds]
  );

  const latestUnseen = useMemo(() => {
    return [...unseenAnnouncements].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.version.localeCompare(a.version);
    })[0] ?? null;
  }, [unseenAnnouncements]);

  return {
    latestUnseen,
    loading,
    markAsSeen,
    markAllAsSeen,
    unseenAnnouncements,
  };
}
