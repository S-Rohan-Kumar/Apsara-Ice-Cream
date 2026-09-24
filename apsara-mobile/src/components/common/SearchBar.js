import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../../theme';

const PLACEHOLDERS = [
  "Search for 'Roasted Almond'...",
  "Search for 'Belgian Chocolate'...",
  "Search for 'Alphonso Mango'...",
  "Search for 'Malai Kulfi'...",
  "Search for 'Zero Sugar Guava'...",
  "Search for 'Family Packs'...",
];

export default function SearchBar({
  value,
  onChangeText,
  onFocus,
  autoFocus = false,
  isButton = false,
  onPress,
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (value) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [value]);

  if (isButton) {
    return (
      <View style={styles.rowWrapper}>
        <TouchableOpacity
          style={styles.pillButton}
          onPress={onPress}
          activeOpacity={0.9}
        >
          <Ionicons name="search" size={18} color="#6B7280" style={styles.searchIcon} />
          <Text style={styles.buttonPlaceholder} numberOfLines={1}>
            {PLACEHOLDERS[index]}
          </Text>
          <Ionicons name="mic-outline" size={18} color={colors.primary} style={styles.micIcon} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.inputContainer}>
      <Ionicons name="search" size={18} color="#6B7280" style={styles.searchIcon} />
      <TextInput
        style={styles.input}
        placeholder={PLACEHOLDERS[index]}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        autoFocus={autoFocus}
        returnKeyType="search"
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearButton}>
          <Ionicons name="close-circle" size={18} color="#6B7280" />
        </TouchableOpacity>
      ) : (
        <Ionicons name="mic-outline" size={18} color={colors.primary} style={styles.micIcon} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.primary,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    height: 44,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    paddingVertical: 0,
  },
  buttonPlaceholder: {
    flex: 1,
    fontSize: fontSize.sm,
    color: '#6B7280',
    fontWeight: '500',
  },
  micIcon: {
    marginLeft: spacing.sm,
  },
  clearButton: {
    marginLeft: spacing.sm,
    padding: 2,
  },
});
