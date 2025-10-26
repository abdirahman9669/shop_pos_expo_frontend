import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { API_BASE, TOKEN } from '@/src/config';

const AUTH = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };
const SHOP_ID = '11111111-1111-4111-8111-111111111111';

type Device = { id: string; label?: string; name?: string };

export default function NewCashSession() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [usd, setUsd] = useState('0');
  const [sos, setSos] = useState('0');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDevices = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/devices`, { headers: AUTH });
      const j = await r.json();
      const arr: Device[] = (j?.data ?? j ?? []).map((x: any) => ({ id: x.id, label: x.label, name: x.name }));
      setDevices(arr);
      if (!deviceId && arr[0]) setDeviceId(arr[0].id);
    } catch { setDevices([]); }
    finally { setLoading(false); }
  }, [deviceId]);

  useEffect(() => { loadDevices(); }, [loadDevices]);

  const submit = useCallback(async () => {
    if (!deviceId) { Alert.alert('Pick device', 'Device is required'); return; }
    setBusy(true);
    try {
      const body = {
        shop_id: SHOP_ID,
        device_id: deviceId,
        opening_cash_usd: Number.parseFloat(usd) || 0,
        opening_cash_sos: Number.parseFloat(sos) || 0,
      };
      const r = await fetch(`${API_BASE}/api/cash-sessions`, { method: 'POST', headers: AUTH, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      Alert.alert('✅ Opened', `Session ${j.id}`);
      router.back();
    } catch (e: any) {
      Alert.alert('Open session failed', e?.message || 'Unknown error');
    } finally {
      setBusy(false);
    }
  }, [deviceId, usd, sos, router]);

  return (
    <SafeAreaView style={{ flex:1 }}>
      <Stack.Screen options={{ title: 'Open Cash Session' }} />
      <View style={{ padding:16, gap:12 }}>
        <Text style={s.label}>Device</Text>
        {loading ? <ActivityIndicator /> : (
          <View style={s.pillRow}>
            {devices.map(d => (
              <TouchableOpacity key={d.id} onPress={() => setDeviceId(d.id)} style={[s.pill, deviceId === d.id ? s.pillOn : s.pillOff]}>
                <Text style={[s.pillTxt, deviceId === d.id ? s.pillTxtOn : s.pillTxtOff]} numberOfLines={1}>
                  {d.label || d.name || d.id.slice(0,8)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={s.label}>Opening cash USD</Text>
        <TextInput value={usd} onChangeText={setUsd} keyboardType="decimal-pad" style={s.input} placeholder="0" />
        <Text style={s.label}>Opening cash SOS</Text>
        <TextInput value={sos} onChangeText={setSos} keyboardType="decimal-pad" style={s.input} placeholder="0" />

        <TouchableOpacity onPress={submit} disabled={busy} style={[s.submit, busy && { opacity: 0.6 }]}>
          <Text style={s.submitTxt}>{busy ? 'Saving…' : 'Open Session'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  label:{ fontWeight:'700' },
  input:{ borderWidth:1, borderColor:'#e1e1e1', borderRadius:10, padding:12, backgroundColor:'#fff' },
  pillRow:{ flexDirection:'row', flexWrap:'wrap', gap:8 },
  pill:{ paddingHorizontal:12, paddingVertical:8, borderRadius:999 },
  pillOn:{ backgroundColor:'#000' }, pillOff:{ backgroundColor:'#eee' },
  pillTxt:{ fontWeight:'800' }, pillTxtOn:{ color:'#fff' }, pillTxtOff:{ color:'#333' },
  submit:{ backgroundColor:'#000', padding:14, borderRadius:12, alignItems:'center', marginTop:6 },
  submitTxt:{ color:'#fff', fontWeight:'800' },
});