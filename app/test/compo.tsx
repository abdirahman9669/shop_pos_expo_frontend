// app/components-preview.tsx
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme, text, space, layout, radius } from '@/src/theme';

// ⬇️ Components
import {
  Button,
  Card,
  Divider,
  ListItem,
  Tag,
  TextField,
  IconButton,
  Switch,
  Checkbox,
  Radio,
  SegmentedControl,
} from '@/src/components';

// ⬇️ Toast hook (ToastProvider should already wrap the app in _layout.tsx)
import { useToast } from '@/src/components/Toast';

export default function ComponentsPreview() {
  const { theme: t, toggleLightDark, resolvedMode } = useTheme();
  const toast = useToast();

  // Local state for demo controls
  const [switchOn, setSwitchOn] = useState(true);
  const [checkedA, setCheckedA] = useState(true);
  const [checkedB, setCheckedB] = useState(false);
  const [radio, setRadio] = useState<'opt1' | 'opt2'>('opt1');
  const [segment, setSegment] = useState<'day' | 'week' | 'month'>('day');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <Stack.Screen
        options={{
          title: 'Components',
          headerStyle: { backgroundColor: t.colors.surface },
          headerTintColor: t.colors.textPrimary,
          headerRight: () => (
            <Button
              title={resolvedMode === 'light' ? 'Dark' : 'Light'}
              variant="ghost"
              onPress={toggleLightDark}
            />
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ padding: layout.containerPadding, gap: space.lg }}>
        {/* Buttons */}
        <Card>
          <Text style={text('h2', t.colors.textPrimary)}>Buttons</Text>
          <View style={{ height: space.sm }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            <Button title="Primary" onPress={() => toast.show({ message: 'Primary clicked', tone: 'primary' })} />
            <Button title="Secondary" variant="secondary" onPress={() => toast.show({ message: 'Secondary', tone: 'secondary' })} />
            <Button title="Ghost" variant="ghost" onPress={() => toast.show({ message: 'Ghost', tone: 'neutral' })} />
            <Button title="Danger" variant="danger" onPress={() => toast.show({ message: 'Danger!', tone: 'danger' })} />
            <Button title="Loading" loading onPress={() => {}} />
            <Button title="Disabled" disabled onPress={() => {}} />
          </View>
        </Card>

        {/* Icon Buttons */}
        <Card>
          <Text style={text('h2', t.colors.textPrimary)}>Icon Buttons</Text>
          <View style={{ height: space.sm }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            <IconButton variant="primary">
              <Text style={text('label', t.colors.primary.onBase)}>★</Text>
            </IconButton>
            <IconButton variant="secondary">
              <Text style={text('label', t.colors.secondary.onBase)}>✚</Text>
            </IconButton>
            <IconButton variant="neutral">
              <Text style={text('label', t.colors.neutral.onBase)}>☰</Text>
            </IconButton>
            <IconButton variant="ghost">
              <Text style={text('label', t.colors.textPrimary)}>⚙︎</Text>
            </IconButton>
            <IconButton size="lg" variant="primary">
              <Text style={text('label', t.colors.primary.onBase)}>✓</Text>
            </IconButton>
            <IconButton size="sm" variant="secondary">
              <Text style={text('label', t.colors.secondary.onBase)}>i</Text>
            </IconButton>
          </View>
        </Card>

        {/* Text Fields */}
        <Card>
          <Text style={text('h2', t.colors.textPrimary)}>Text Fields</Text>
          <View style={{ height: space.sm }} />
          <TextField
            label="Name"
            placeholder="Full name"
            value={name}
            onChangeText={setName}
            helperText="This appears below the field."
          />
          <View style={{ height: space.sm }} />
          <TextField
            label="Email"
            placeholder="name@domain.com"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            errorText={email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Invalid email' : undefined}
          />
        </Card>

        {/* Switch / Checkbox / Radio */}
        <Card>
          <Text style={text('h2', t.colors.textPrimary)}>Switch / Checkbox / Radio</Text>
          <View style={{ height: space.sm }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Switch value={switchOn} onValueChange={setSwitchOn} />
            <Text style={text('body', t.colors.textPrimary)}>Switch is {switchOn ? 'ON' : 'OFF'}</Text>
          </View>

          <View style={{ height: space.sm }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Checkbox checked={checkedA} onChange={setCheckedA} label="Notify by SMS" />
            <Checkbox checked={checkedB} onChange={setCheckedB} label="Notify by Email" />
          </View>

          <View style={{ height: space.sm }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Radio
                selected={radio === 'opt1'}
                onChange={() => setRadio('opt1')}   // <-- onChange (not onPress)
                label="Option A"
            />
            <Radio
                selected={radio === 'opt2'}
                onChange={() => setRadio('opt2')}   // <-- onChange (not onPress)
                label="Option B"
            />
            </View>
        </Card>

        {/* Segmented Control */}
        <Card>
          <Text style={text('h2', t.colors.textPrimary)}>Segmented Control</Text>
          <View style={{ height: space.sm }} />
            <SegmentedControl
            segments={[
                { value: 'day',   label: 'Day' },   // <-- value (not key)
                { value: 'week',  label: 'Week' },
                { value: 'month', label: 'Month' },
            ]}
            value={segment}
            onChange={(val) => setSegment(val as 'day' | 'week' | 'month')}
            />
          <View style={{ height: space.sm }} />
          <Text style={text('body', t.colors.textSecondary)}>Selected: {segment}</Text>
        </Card>

        {/* Tags / List / Divider */}
        <Card>
          <Text style={text('h2', t.colors.textPrimary)}>Tags & List</Text>
          <View style={{ flexDirection: 'row', gap: space.sm, marginVertical: space.sm, flexWrap: 'wrap' }}>
            <Tag label="Neutral" />
            <Tag label="Success" tone="success" />
            <Tag label="Warning" tone="warning" />
            <Tag label="Danger"  tone="danger" />
            <Tag label="Info"    tone="info" />
            <Tag label="Primary" tone="primary" />
            <Tag label="Secondary" tone="secondary" />
          </View>

          <Divider />

          <ListItem title="Chocolate Bar" subtitle="SKU 12345" meta="$2.50" onPress={() => toast.show({ message: 'Chocolate added', tone: 'success' })} />
          <Divider />
          <ListItem title="Coca Cola 330ml" subtitle="SKU 98765" meta="$0.99" onPress={() => toast.show({ message: 'Cola added', tone: 'info' })} />
        </Card>

        {/* Demo actions */}
        <Card>
          <Text style={text('h2', t.colors.textPrimary)}>Toast / Mixed Actions</Text>
          <View style={{ height: space.sm }} />
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Button
              title="Show Toast"
              onPress={() => toast.show({ message: 'Hello from Toast!', tone: 'success' })}
            />
            <Button
              title="Error Toast"
              variant="danger"
              onPress={() => toast.show({ message: 'Something went wrong', tone: 'danger' })}
            />
            <IconButton variant="secondary" onPress={() => toast.show({ message: 'Icon pressed', tone: 'secondary' })}>
              <Text style={text('label', t.colors.secondary.onBase)}>★</Text>
            </IconButton>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}