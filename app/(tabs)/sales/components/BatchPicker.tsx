// app/sale/components/BatchPicker.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, FlatList, TouchableWithoutFeedback } from 'react-native';
import type { Lot } from '@/src/sale/lib/api';

type Props = {
  visible: boolean;
  loading: boolean;
  lots: Lot[];
  onUseLot: (lot: Lot) => void;
  onRequestTransfer: (lot: Lot) => void;
  onClose: () => void;
};

export default function BatchPicker({ visible, loading, lots, onUseLot, onRequestTransfer, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <TouchableWithoutFeedback>
            <View style={{ backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%' }}>
              <Text style={{ fontWeight: '800', fontSize: 20, marginBottom: 8 }}>Choose batch / store</Text>
              {loading ? (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <ActivityIndicator /><Text style={{ marginTop: 8 }}>Loading lots…</Text>
                </View>
              ) : lots.length ? (
                <FlatList
                  data={lots}
                  keyExtractor={(i) => `${i.batch_id}-${i.store_id}`}
                  ItemSeparatorComponent={() => <View style={{ height: 6, backgroundColor: '#fafafa' }} />}
                  renderItem={({ item }) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' }}>
                      <Text style={{ flex: 1 }} numberOfLines={2}>
                        {item.store_name} • {item.batch_number}
                        {item.expiry_date ? ` • exp ${item.expiry_date}` : ''} • on-hand {item.on_hand}
                      </Text>
                      <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#000', marginRight: 8 }}
                        onPress={() => onUseLot(item)}>
                        <Text style={{ color: '#fff', fontWeight: '800' }}>Use</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#444' }}
                        onPress={() => { onClose(); setTimeout(() => onRequestTransfer(item), 80); }}>
                        <Text style={{ color: '#fff', fontWeight: '800' }}>Transfer</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#777', marginTop: 12 }}>No lots</Text>}
                />
              ) : (
                <Text style={{ textAlign: 'center', color: '#777', marginTop: 12 }}>No lots found for this product.</Text>
              )}
              <TouchableOpacity onPress={onClose} style={{ alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100, marginTop: 10 }}>
                <Text style={{ color: 'white', fontWeight: '700' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}