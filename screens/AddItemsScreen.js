// screens/AddItemsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, FlatList, ActivityIndicator,
  Alert, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { auth } from '../firebase';
import {
  addChecklistItem, getChecklistItems,
  deleteChecklistItem, toggleChecklistItem
} from '../services/checklistService';
import { getFrequentItems, trackItemUsage } from '../services/historyService';

export default function AddItemsScreen({ navigation, route }) {
  const { eventId, eventName, category } = route.params;
  const [items, setItems] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchSuggestions();
  }, []);

  const fetchItems = async () => {
    try {
      const fetchedItems = await getChecklistItems(eventId);
      setItems(fetchedItems);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !category) return;
      const frequent = await getFrequentItems(user.uid, category);
      setSuggestions(frequent.map(f => f.itemName));
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const handleAddItem = async (itemName = newItem) => {
    const trimmed = itemName.trim();
    if (!trimmed) return;

    // Check duplicate
    if (items.some(i => i.name.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Duplicate', 'This item is already in your checklist.');
      return;
    }

    setAdding(true);
    try {
      const user = auth.currentUser;
      await addChecklistItem(user.uid, eventId, trimmed);
      await trackItemUsage(user.uid, trimmed, category);
      setNewItem('');
      fetchItems();
    } catch (error) {
      Alert.alert('Error', 'Failed to add item.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await deleteChecklistItem(itemId);
      fetchItems();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete item.');
    }
  };

  const handleToggle = async (itemId, currentStatus) => {
    try {
      await toggleChecklistItem(itemId, currentStatus);
      fetchItems();
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  const filteredSuggestions = suggestions.filter(
    s => !items.some(i => i.name.toLowerCase() === s.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <View style={styles.itemRow}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => handleToggle(item.id, item.isChecked)}
      >
        <Ionicons
          name={item.isChecked ? 'checkbox' : 'square-outline'}
          size={24}
          color={item.isChecked ? COLORS.primary : COLORS.textSecondary}
        />
      </TouchableOpacity>
      <Text style={[styles.itemName, item.isChecked && styles.itemChecked]}>
        {item.name}
      </Text>
      <TouchableOpacity onPress={() => handleDeleteItem(item.id)}>
        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Add Items</Text>
          <Text style={styles.headerSubtitle}>{eventName}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Main', { screen: 'MyEvents' })}
        >
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Add Item Input */}
      <View style={styles.addWrapper}>
        <TextInput
          style={styles.addInput}
          placeholder="Add item..."
          value={newItem}
          onChangeText={setNewItem}
          placeholderTextColor={COLORS.textSecondary}
          onSubmitEditing={() => handleAddItem()}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleAddItem()}
          disabled={adding}
        >
          {adding ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.addButtonText}>Add</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Suggestions */}
      {filteredSuggestions.length > 0 && (
        <View style={styles.suggestionsSection}>
          <Text style={styles.suggestionsTitle}>
            🌟 Suggested for {category}
          </Text>
          <View style={styles.suggestionsList}>
            {filteredSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => handleAddItem(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
                <Ionicons name="add" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Items List */}
      <View style={styles.listSection}>
        <Text style={styles.listTitle}>
          Checklist ({items.length} items)
        </Text>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>No items yet — add some above!</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  addWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    outline: 'none',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
  suggestionsSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  suggestionText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  listSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  checkbox: {
    padding: 2,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  itemChecked: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});