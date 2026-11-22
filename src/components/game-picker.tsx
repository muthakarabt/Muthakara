import { View } from 'react-native';

import { Card, IconBadge, Row, Txt, type IconName } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useApp } from '@/lib/app-context';
import type { GameType } from '@/lib/db';

export const GAME_ICONS: Record<GameType, IconName> = {
  mix: 'shuffle',
  cloze: 'extension-puzzle-outline',
  type: 'create-outline',
  order: 'swap-horizontal',
  match: 'git-compare-outline',
};

export const GAME_ORDER: GameType[] = ['mix', 'cloze', 'type', 'order', 'match'];

/** Lets the user choose how a subject tests them. */
export function GamePicker({ value, onChange }: { value: GameType; onChange: (g: GameType) => void }) {
  const { s } = useApp();
  return (
    <View style={{ gap: Spacing.two }}>
      {GAME_ORDER.map((g) => (
        <Card key={g} selected={g === value} onPress={() => onChange(g)} style={{ paddingVertical: Spacing.three }}>
          <Row>
            <IconBadge icon={GAME_ICONS[g]} tone={g === value ? 'primary' : 'sky'} size={40} />
            <View style={{ flex: 1 }}>
              <Txt variant="heading">{s.games[g]}</Txt>
              <Txt variant="caption" muted>
                {s.gameDescs[g]}
              </Txt>
            </View>
          </Row>
        </Card>
      ))}
    </View>
  );
}
