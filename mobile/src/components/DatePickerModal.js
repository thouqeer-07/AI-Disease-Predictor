import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform
} from 'react-native';
import { Calendar as CalendarIcon, X, Check } from 'lucide-react-native';

const DatePickerModal = ({ visible, currentDate, onConfirm, onClose }) => {
  const parseInitialDate = () => {
    if (currentDate && typeof currentDate === 'string') {
      const trimmed = currentDate.trim();
      if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
        const parts = trimmed.split('-');
        return {
          day: parseInt(parts[0], 10),
          month: parseInt(parts[1], 10),
          year: parseInt(parts[2], 10)
        };
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const parts = trimmed.split('-');
        return {
          year: parseInt(parts[0], 10),
          month: parseInt(parts[1], 10),
          day: parseInt(parts[2], 10)
        };
      }
    }
    return { day: 15, month: 8, year: 1995 };
  };

  const [selectedYear, setSelectedYear] = useState(1995);
  const [selectedMonth, setSelectedMonth] = useState(8);
  const [selectedDay, setSelectedDay] = useState(15);

  useEffect(() => {
    if (visible) {
      const parsed = parseInitialDate();
      setSelectedDay(parsed.day);
      setSelectedMonth(parsed.month);
      setSelectedYear(parsed.year);
    }
  }, [visible, currentDate]);

  const months = [
    { label: '01 (Jan)', value: 1 },
    { label: '02 (Feb)', value: 2 },
    { label: '03 (Mar)', value: 3 },
    { label: '04 (Apr)', value: 4 },
    { label: '05 (May)', value: 5 },
    { label: '06 (Jun)', value: 6 },
    { label: '07 (Jul)', value: 7 },
    { label: '08 (Aug)', value: 8 },
    { label: '09 (Sep)', value: 9 },
    { label: '10 (Oct)', value: 10 },
    { label: '11 (Nov)', value: 11 },
    { label: '12 (Dec)', value: 12 }
  ];

  // Generate Year list from 1940 to 2026
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1939 }, (_, i) => currentYear - i);

  // Calculate days in month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const maxDays = getDaysInMonth(selectedYear, selectedMonth);
  const days = Array.from({ length: maxDays }, (_, i) => i + 1);

  const formattedDayStr = String(Math.min(selectedDay, maxDays)).padStart(2, '0');
  const formattedMonthStr = String(selectedMonth).padStart(2, '0');
  const previewFormattedDate = `${formattedDayStr}-${formattedMonthStr}-${selectedYear}`;

  const handleSave = () => {
    onConfirm(previewFormattedDate);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CalendarIcon size={22} color="#1d4ed8" />
              <Text style={styles.headerTitle}>Select Date of Birth</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Date Preview Bar in DD-MM-YYYY */}
          <View style={styles.previewBar}>
            <Text style={styles.previewLabel}>Format: DD-MM-YYYY</Text>
            <Text style={styles.previewValue}>{previewFormattedDate}</Text>
          </View>

          {/* Selectors Grid: DAY | MONTH | YEAR */}
          <View style={styles.selectorsRow}>
            {/* Day Column */}
            <View style={styles.col}>
              <Text style={styles.colTitle}>DAY (DD)</Text>
              <ScrollView style={styles.scrollCol} showsVerticalScrollIndicator={false}>
                {days.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.itemBtn, selectedDay === d && styles.itemBtnActive]}
                    onPress={() => setSelectedDay(d)}
                  >
                    <Text style={[styles.itemText, selectedDay === d && styles.itemTextActive]}>
                      {String(d).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Month Column */}
            <View style={styles.col}>
              <Text style={styles.colTitle}>MONTH (MM)</Text>
              <ScrollView style={styles.scrollCol} showsVerticalScrollIndicator={false}>
                {months.map(m => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.itemBtn, selectedMonth === m.value && styles.itemBtnActive]}
                    onPress={() => setSelectedMonth(m.value)}
                  >
                    <Text style={[styles.itemText, selectedMonth === m.value && styles.itemTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Year Column */}
            <View style={styles.col}>
              <Text style={styles.colTitle}>YEAR (YYYY)</Text>
              <ScrollView style={styles.scrollCol} showsVerticalScrollIndicator={false}>
                {years.map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.itemBtn, selectedYear === y && styles.itemBtnActive]}
                    onPress={() => setSelectedYear(y)}
                  >
                    <Text style={[styles.itemText, selectedYear === y && styles.itemTextActive]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleSave}>
              <Check size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.confirmText}>Confirm Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end'
  },
  card: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '82%'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a'
  },
  closeBtn: {
    padding: 4
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#dbeafe'
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e40af'
  },
  previewValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1d4ed8',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  selectorsRow: {
    flexDirection: 'row',
    height: 220,
    gap: 8
  },
  col: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  colTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8
  },
  scrollCol: {
    flex: 1
  },
  itemBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 2
  },
  itemBtnActive: {
    backgroundColor: '#1d4ed8'
  },
  itemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155'
  },
  itemTextActive: {
    color: '#ffffff',
    fontWeight: '800'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b'
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1d4ed8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff'
  }
});

export default DatePickerModal;
