import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Button, Txt, haptic } from '@/components/ui';
import { Font, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp, useDirection } from '@/lib/app-context';
import type { MatchCard, MatchRound } from '@/lib/game';
import { pickRandom } from '@/lib/i18n';
import { playSound } from '@/lib/sound';
import { detectLanguage } from '@/lib/text';

/** Join each start with its ending. Reports how many pairs were found without a mistake. */
export function MatchBoard({ round, onFinish }: { round: MatchRound; onFinish: (clean: number, total: number) => void }) {
  const { s } = useApp();
  const c = useTheme();
  const d = useDirection();
  const [selected, setSelected] = useState<MatchCard | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [missed, setMissed] = useState<number[]>([]); // pairs that had a mistake
  const [flash, setFlash] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const total = round.prompts.length;
  const done = matched.length === total;

  const tap = (card: MatchCard) => {
    if (matched.includes(card.pairId) || done) return;
    haptic();
    if (!selected || selected.side === card.side) {
      setSelected(card);
      return;
    }
    if (selected.pairId === card.pairId) {
      playSound('correct');
      haptic('success');
      const next = [...matched, card.pairId];
      setMatched(next);
      setMessage(next.length === total ? pickRandom(s.correct) : null);
    } else {
      playSound('wrong');
      haptic('error');
      const prompt = selected.side === 'prompt' ? selected : card;
      setMissed((m) => (m.includes(prompt.pairId) ? m : [...m, prompt.pairId]));
      setFlash(card.key);
      setMessage(s.wrong);
      setTimeout(() => setFlash(null), 500);
    }
    setSelected(null);
  };

  const tile = (card: MatchCard) => {
    const isMatched = matched.includes(card.pairId);
    const isSel = selected?.key === card.key;
    const isBad = flash === card.key;
    const dir = detectLanguage(card.text) === 'ar' ? 'rtl' : 'ltr';
    return (
      <Pressable
        key={card.key}
        accessibilityRole="button"
        onPress={() => tap(card)}
        disabled={isMatched}
        style={({ pressed }) => ({
          padding: Spacing.three,
          minHeight: 76,
          justifyContent: 'center',
          borderRadius: Radius.medium,
          borderWidth: 1.5,
          borderColor: isBad ? c.danger : isSel ? c.primary : isMatched ? 'transparent' : c.border,
          backgroundColor: isBad ? c.dangerSoft : isMatched ? c.primarySoft : isSel ? c.primarySoft : c.cardSolid,
          opacity: isMatched ? 0.55 : pressed ? 0.8 : 1,
        })}>
        <Text
          style={{
            fontFamily: Font.medium,
            fontSize: 14,
            lineHeight: 22,
            color: c.text,
            writingDirection: dir,
            textAlign: d.alignFor(dir),
          }}>
          {card.text}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={{ gap: Spacing.four }}>
      <Txt variant="caption" muted center>
        {s.matchPrompt}
      </Txt>
      <View style={{ flexDirection: d.row, gap: Spacing.two }}>
        <View style={{ flex: 1, gap: Spacing.two }}>{round.prompts.map(tile)}</View>
        <View style={{ flex: 1, gap: Spacing.two }}>{round.answers.map(tile)}</View>
      </View>
      {message ? (
        <Animated.View key={message + matched.length} entering={done ? ZoomIn : FadeIn}>
          <Txt variant="heading" center color={done ? c.primary : c.danger}>
            {message}
          </Txt>
        </Animated.View>
      ) : null}
      {done ? (
        <Button
          title={s.next}
          icon="arrow-forward"
          onPress={() => onFinish(matched.filter((p) => !missed.includes(p)).length, total)}
        />
      ) : null}
    </View>
  );
}
