import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../../theme';

const PLACEHOLDERS = [
  "Search 'Belgian Bite'...",
  "Search 'Roasted Almond'...",
  "Search 'Zero Sugar'...",
  "Search 'Malai Kulfi'...",
  "Search 'Mango Scoop'...",
  "Search 'Guava Chilli'...",
];

export default function SearchBar({ value, onChangeText, onFocus, autoFocus = false, isButton = false, onPress }) {
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
      <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
        <Text style={styles.buttonPlaceholder}>{PLACEHOLDERS[index]}</Text>
        <Ionicons name="mic-outline" size={18} color={colors.primary} style={styles.micIcon} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
      <TextInput
        style={styles.input}
        placeholder={PLACEHOLDERS[index]}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        autoFocus={autoFocus}
        returnKeyType="search"
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearButton}>
          <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : (
        <Ionicons name="mic-outline" size={18} color={colors.primary} style={styles.micIcon} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
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
    color: colors.textMuted,
  },
  micIcon: {
    marginLeft: spacing.sm,
  },
  clearButton: {
    marginLeft: spacing.sm,
  },
});
