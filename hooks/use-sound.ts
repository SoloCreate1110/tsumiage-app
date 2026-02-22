import { Audio } from "expo-av";
import { useEffect, useState } from "react";

export function useSound() {
  const [sound, setSound] = useState<Audio.Sound>();

  async function playSuccess() {
    try {
      const { sound } = await Audio.Sound.createAsync({
        uri: "https://actions.google.com/sounds/v1/cartoon/pop.ogg",
      });
      setSound(sound);
      await sound.playAsync();
    } catch (error) {
      console.log("Error playing sound:", error);
    }
  }

  async function playFanfare() {
    try {
      const { sound } = await Audio.Sound.createAsync({
        uri: "https://actions.google.com/sounds/v1/cartoon/slide_whistle_to_drum_hit.ogg",
      });
      setSound(sound);
      await sound.playAsync();
    } catch (error) {
      console.log("Error playing sound:", error);
    }
  }

  async function playClick() {
    try {
      const { sound } = await Audio.Sound.createAsync({
        uri: "https://actions.google.com/sounds/v1/ui/click.ogg",
      });
      setSound(sound);
      await sound.playAsync();
    } catch (error) {
      console.log("Error playing sound:", error);
    }
  }

  async function playToggle() {
    try {
      const { sound } = await Audio.Sound.createAsync({
        uri: "https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg",
      });
      setSound(sound);
      await sound.playAsync();
    } catch (error) {
      console.log("Error playing sound:", error);
    }
  }

  async function playStart() {
    try {
      const { sound } = await Audio.Sound.createAsync({
        uri: "https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg",
      });
      setSound(sound);
      await sound.playAsync();
    } catch (error) {
      console.log("Error playing sound:", error);
    }
  }

  async function playStop() {
    try {
      const { sound } = await Audio.Sound.createAsync({
        uri: "https://actions.google.com/sounds/v1/cartoon/woodpecker_pecking.ogg",
      });
      setSound(sound);
      await sound.playAsync();
    } catch (error) {
      console.log("Error playing sound:", error);
    }
  }

  async function playDelete() {
    try {
      const { sound } = await Audio.Sound.createAsync({
        uri: "https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg",
      });
      setSound(sound);
      await sound.playAsync();
    } catch (error) {
      console.log("Error playing sound:", error);
    }
  }

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  return {
    playSuccess,
    playFanfare,
    playClick,
    playToggle,
    playStart,
    playStop,
    playDelete,
  };
}