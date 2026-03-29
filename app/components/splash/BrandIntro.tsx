import React, { useEffect, useMemo, useRef } from "react";
import { View, Image, StyleSheet } from "react-native";
import { MotiView } from "moti";
import { Text } from "../common/Text";

/** Native splash ile aynı */
const BG = "#ffffff";
const ICON_PX = 190;
const LETTER_DELAY_MS = 86;
const BEFORE_LETTERS_MS = 200;
const POST_LETTERS_HOLD_MS = 520;
const LETTER_ANIM_MS = 360;
const SPACE_ANIM_MS = 220;

const SCRIPT_FONT = "DancingScript_700Bold";
const BRAND_PHRASE = "GÜMÜŞ MAKAS";

type Props = {
  onFinish: () => void;
};

export function BrandIntro({ onFinish }: Props) {
  const slots = useMemo(() => {
    const out: Array<{ key: string; char?: string; isSpace?: boolean }> = [];
    BRAND_PHRASE.split("").forEach((ch, i) => {
      if (ch === " ") {
        out.push({ key: `sp-${i}`, isSpace: true });
      } else {
        out.push({ key: `${ch}-${i}`, char: ch });
      }
    });
    return out;
  }, []);

  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const lettersStart = BEFORE_LETTERS_MS;
    const lastLetterDelay =
      slots.length > 0
        ? lettersStart + (slots.length - 1) * LETTER_DELAY_MS
        : lettersStart;
    const total = lastLetterDelay + LETTER_ANIM_MS + POST_LETTERS_HOLD_MS;
    const t = setTimeout(onFinish, total);
    return () => clearTimeout(t);
  }, [slots.length, onFinish]);

  return (
    <View style={styles.root}>
      <View style={styles.iconWrap}>
        <Image
          source={require("../../../assets/icon.png")}
          style={styles.icon}
          resizeMode="contain"
        />
      </View>

      <View style={styles.titleRow} accessibilityRole="text">
        {slots.map((slot, i) => {
          const letterDelay = BEFORE_LETTERS_MS + i * LETTER_DELAY_MS;
          return slot.isSpace ? (
            <MotiView
              key={slot.key}
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                type: "timing",
                duration: SPACE_ANIM_MS,
                delay: letterDelay,
              }}
              style={styles.spaceSlot}
            />
          ) : (
            <MotiView
              key={slot.key}
              from={{ opacity: 0, translateY: 18 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: "timing",
                duration: LETTER_ANIM_MS,
                delay: letterDelay,
              }}
              style={styles.letterSlot}
            >
              <Text style={styles.letter}>{slot.char}</Text>
            </MotiView>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  iconWrap: {
    marginBottom: 18,
  },
  icon: {
    width: ICON_PX,
    height: ICON_PX,
  },
  titleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-end",
  },
  letterSlot: {
    marginHorizontal: -0.5,
  },
  spaceSlot: {
    width: 16,
    height: 1,
  },
  letter: {
    fontFamily: SCRIPT_FONT,
    fontSize: 40,
    color: "#1e293b",
    textShadowColor: "rgba(251, 191, 36, 0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
