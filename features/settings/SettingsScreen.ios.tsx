import {
  Button, Form, Host, HStack, Image, Section, Spacer, Text, TextField, Toggle, useNativeState,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel, autocorrectionDisabled, background, disabled, font, foregroundStyle,
  frame, listRowBackground, scrollContentBackground, scrollDismissesKeyboard,
  onSubmit, submitLabel, textInputAutocapitalization,
} from '@expo/ui/swift-ui/modifiers';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { redesignColors as c } from '@/constants/theme';
import type { SettingsRow } from './types';
import { SETTINGS_TITLES, useSettings } from './useSettings';

const rowModifiers = [listRowBackground(c.surface), foregroundStyle(c.bone), font({ textStyle: 'body' }), frame({ minHeight: 24 })];
type Model = ReturnType<typeof useSettings>;

function NameField({ row, active, save }: { row: Extract<SettingsRow, { kind: 'input' }>; active: boolean; save: () => void }) {
  const text = useNativeState(row.value);
  return <TextField text={text} placeholder={row.label} maxLength={80} autoFocus={active} onTextChange={row.onChange}
    modifiers={[...rowModifiers, textInputAutocapitalization('words'), autocorrectionDisabled(), submitLabel('done'), onSubmit(save), accessibilityLabel(row.label)]} />;
}

function Row({ row, busy, model }: { row: SettingsRow; busy: boolean; model: Model }) {
  const modifiers = [...rowModifiers, disabled(Boolean(row.disabled || busy))];
  if (row.kind === 'input') return <NameField row={row} active save={model.saveName} />;
  if (row.kind === 'toggle') return <Toggle label={row.label} isOn={row.value} onIsOnChange={row.onChange} modifiers={modifiers} />;
  if (row.kind === 'link') return <Button onPress={() => model.open(row.page)} modifiers={[
    ...modifiers, accessibilityLabel(`${row.label}${row.value ? `, ${row.value}` : ''}`),
  ]}>
    <HStack spacing={12}>
      <Text modifiers={[foregroundStyle(c.bone)]}>{row.label}</Text>
      <Spacer minLength={8} />
      {row.value && <Text modifiers={[foregroundStyle(c.ash)]}>{row.value}</Text>}
      <Image systemName="chevron.right" modifiers={[font({ textStyle: 'footnote', weight: 'semibold' }), foregroundStyle(c.ashDim)]} />
    </HStack>
  </Button>;
  if (row.kind === 'info') return <HStack spacing={12} modifiers={modifiers}>
    <Text>{row.label}</Text><Spacer />{row.value && <Text modifiers={[foregroundStyle(c.ash)]}>{row.value}</Text>}
  </HStack>;
  if (row.kind === 'choice') return <Button onPress={row.onPress} modifiers={[
    ...modifiers, accessibilityLabel(`${row.label}${row.selected ? ', selected' : ''}`),
  ]}>
    <HStack spacing={12}>
      <Text>{row.label}</Text><Spacer />
      {row.selected && <Image systemName="checkmark" modifiers={[font({ textStyle: 'body', weight: 'semibold' }), foregroundStyle(c.bone)]} />}
    </HStack>
  </Button>;
  return <Button label={row.label} role={row.destructive ? 'destructive' : 'default'} onPress={row.onPress}
    modifiers={row.destructive ? [listRowBackground(c.surface), disabled(Boolean(row.disabled || busy)), font({ textStyle: 'body' }), frame({ minHeight: 24 })] : modifiers} />;
}

function SettingsPageForm({ model }: { model: Model }) {
  return <Form modifiers={[scrollContentBackground('hidden'), background(c.ink), scrollDismissesKeyboard('interactively')]}>
      {model.sections(model.page).map(section => <Section key={section.id} title={section.title}
        footer={section.footer ? <Text modifiers={[foregroundStyle(c.ash), font({ textStyle: 'footnote' })]}>{section.footer}</Text> : undefined}>
        {section.rows.map(row => <Row key={row.id} row={row} busy={Boolean(model.busy)} model={model} />)}
      </Section>)}
    </Form>;
}

/** SwiftUI owns the form; the app's native navigation stack owns each full-screen page. */
export default function SettingsScreen() {
  const model = useSettings();
  if (!model.profile) return <View style={{ flex: 1, backgroundColor: c.ink }} />;
  return <>
    <Stack.Screen options={{
      headerShown: true, presentation: 'card', animation: 'slide_from_right',
      title: model.page ? SETTINGS_TITLES[model.page] : 'Settings',
      headerLargeTitle: false, headerBackTitle: 'Back', headerBackButtonDisplayMode: 'minimal',
      headerStyle: { backgroundColor: c.ink }, headerTintColor: c.bone, headerShadowVisible: false,
      headerTitleStyle: { color: c.bone },
      unstable_nativeProps: { headerConfig: { experimental_userInterfaceStyle: 'dark' } },
      gestureEnabled: !model.busy, headerBackVisible: !model.busy,
      unstable_headerRightItems: () => model.page === 'name' ? [{
        type: 'button', label: 'Done', accessibilityLabel: 'Save name',
        disabled: !model.name.trim() || Boolean(model.busy), onPress: model.saveName,
      }] : [],
    }} />
    <Host colorScheme="dark" style={{ flex: 1, backgroundColor: c.ink }}>
      <SettingsPageForm model={model} />
    </Host>
  </>;
}
