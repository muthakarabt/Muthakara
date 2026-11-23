/**
 * Breaks during a long study session (the exam cram): after 25 minutes of
 * study a 5-minute break comes up. Studying in short blocks with rests keeps
 * the mind fresh; the break can still be skipped.
 */
import { useCallback, useEffect, useState } from 'react';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Button, GradientCard, Icon, Screen, Txt, haptic } from '@/components/ui';
import { useApp } from '@/lib/app-context';
import { playSound } from '@/lib/sound';

export const STUDY_BLOCK_MS = 25 * 60_000;
export const BREAK_MS = 5 * 60_000;

export function useBreaks(enabled: boolean) {
  const [start, setStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [onBreak, setOnBreak] = useState(false);

  useEffect(() => {
    if (!enabled || onBreak) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [enabled, onBreak]);

  /** Call after each answer: starts the break once the study block is over (never mid-question). */
  const check = useCallback(() => {
    if (enabled && Date.now() - start >= STUDY_BLOCK_MS) setOnBreak(true);
  }, [enabled, start]);

  const resume = useCallback(() => {
    const t = Date.now();
    setStart(t);
    setNow(t);
    setOnBreak(false);
  }, []);

  const minutesLeft = () => Math.max(1, Math.ceil((STUDY_BLOCK_MS - (now - start)) / 60_000));

  return { onBreak, check, resume, minutesLeft };
}

export function BreakScreen({ onDone }: { onDone: () => void }) {
  const { s } = useApp();
  const [end] = useState(() => Date.now() + BREAK_MS);
  const [left, setLeft] = useState(BREAK_MS);

  useEffect(() => {
    const t = setInterval(() => {
      const ms = Math.max(0, end - Date.now());
      setLeft(ms);
      if (ms === 0) {
        clearInterval(t);
        playSound('complete');
        haptic('success');
      }
    }, 1000);
    return () => clearInterval(t);
  }, [end]);

  const over = left === 0;
  const secs = Math.ceil(left / 1000);
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  return (
    <Screen title={s.breakTitle} contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <Animated.View entering={ZoomIn.springify()}>
        <GradientCard style={{ alignItems: 'center' }}>
          <Icon name={over ? 'sunny' : 'cafe'} size={56} color="#FFD08A" />
          <Txt variant="title" color="#fff" center>
            {over ? s.breakOver : s.breakTitle}
          </Txt>
          {!over ? (
            <>
              <Txt color="#ffffffdd" center>
                {s.breakBody}
              </Txt>
              <Txt color="#fff" center style={{ fontSize: 44, lineHeight: 56, direction: 'ltr' }}>
                {clock}
              </Txt>
            </>
          ) : null}
        </GradientCard>
      </Animated.View>
      {over ? (
        <Button icon="play" title={s.breakResume} onPress={onDone} />
      ) : (
        <Button variant="ghost" icon="play-skip-forward-outline" title={s.breakSkip} onPress={onDone} />
      )}
    </Screen>
  );
}
