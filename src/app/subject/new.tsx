import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useRef, useState } from 'react';

import { GamePicker } from '@/components/game-picker';
import { Button, Input, Screen, Section, Txt } from '@/components/ui';
import { useApp } from '@/lib/app-context';
import { createSubject, type GameType } from '@/lib/db';

export default function NewSubject() {
  const db = useSQLiteContext();
  const { s } = useApp();
  const [title, setTitle] = useState('');
  const [game, setGame] = useState<GameType>('mix');

  // Set on the first tap and kept until the screen closes, so a double tap creates one subject.
  const creating = useRef(false);

  const create = async () => {
    if (!title.trim() || creating.current) return;
    creating.current = true;
    try {
      const id = await createSubject(db, title.trim(), game);
      router.replace(`/subject/${id}`);
    } catch (e) {
      creating.current = false;
      throw e;
    }
  };

  return (
    <Screen
      title={s.newSubject}
      footer={<Button title={s.create} icon="add-circle-outline" onPress={create} disabled={!title.trim()} />}>
      <Input
        label={s.subjectTitle}
        placeholder={s.subjectPlaceholder}
        value={title}
        onChangeText={setTitle}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={create}
      />
      <Section title={s.testStyle}>
        <Txt variant="caption" muted>
          {s.testStyleHint}
        </Txt>
        <GamePicker value={game} onChange={setGame} />
      </Section>
    </Screen>
  );
}
