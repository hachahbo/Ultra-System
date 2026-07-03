import React, { useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, Plus, X } from 'lucide-react-native';
import type { ItemWithModifiers, Modifier } from '../types/airtable';
import { useCartStore, type SelectedModifier } from '../store/useCartStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductCardProps {
  item: ItemWithModifiers;
}

type ModifierGroup = {
  group_name_fr: string;
  is_required: boolean;
  options: Modifier[];
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Preserves insertion order (first occurrence of each group_name_fr wins),
 * which mirrors the Airtable sort_order the restaurant owner controls.
 */
function groupModifiers(modifiers: Modifier[]): ModifierGroup[] {
  const map = new Map<string, ModifierGroup>();
  for (const mod of modifiers) {
    const bucket = map.get(mod.group_name_fr);
    if (bucket) {
      bucket.options.push(mod);
    } else {
      map.set(mod.group_name_fr, {
        group_name_fr: mod.group_name_fr,
        is_required: mod.is_required,
        options: [mod],
      });
    }
  }
  return Array.from(map.values());
}

function toSelectedModifier(mod: Modifier): SelectedModifier {
  return {
    modifier_id: mod.modifier_id,
    group_name_fr: mod.group_name_fr,
    option_name_fr: mod.option_name_fr,
    price_impact: mod.price_impact,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductCard({ item }: ProductCardProps): JSX.Element {
  const addLine = useCartStore((s) => s.addLine);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);

  const hasModifiers = item.modifiers.length > 0;
  const groups = hasModifiers ? groupModifiers(item.modifiers) : [];

  // Required groups with no selection yet — blocks confirmation.
  const missingRequiredGroups = groups.filter(
    (g) =>
      g.is_required &&
      !g.options.some((opt) =>
        selectedModifiers.some((m) => m.modifier_id === opt.modifier_id)
      )
  );
  const canConfirm = missingRequiredGroups.length === 0;

  // ── Card actions ───────────────────────────────────────────────────────────

  function handleAddPress(): void {
    if (hasModifiers) {
      setSelectedModifiers([]); // always open the modal with a clean slate
      setIsModalVisible(true);
    } else {
      addLine(item, []);
    }
  }

  // ── Modal actions ──────────────────────────────────────────────────────────

  function handleToggleModifier(mod: Modifier): void {
    setSelectedModifiers((prev) => {
      const alreadySelected = prev.some((m) => m.modifier_id === mod.modifier_id);
      return alreadySelected
        ? prev.filter((m) => m.modifier_id !== mod.modifier_id)
        : [...prev, toSelectedModifier(mod)];
    });
  }

  function handleConfirm(): void {
    if (!canConfirm) return; // required groups must be satisfied first
    addLine(item, selectedModifiers);
    setIsModalVisible(false);
    setSelectedModifiers([]);
  }

  function handleDismiss(): void {
    setIsModalVisible(false);
    setSelectedModifiers([]);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <View style={[styles.card, !item.in_stock && styles.cardDisabled]}>

        {/* Thumbnail */}
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: item.image_url }}
            style={styles.image}
            resizeMode="cover"
          />
          {!item.in_stock && (
            <View style={styles.imageOverlay}>
              <Text style={styles.outOfStockLabel}>Épuisé</Text>
            </View>
          )}
        </View>

        {/* Text content */}
        <View style={styles.content}>
          <Text style={styles.nameFr} numberOfLines={2}>
            {item.name_fr}
          </Text>
          {item.name_ar ? (
            <Text style={styles.nameAr} numberOfLines={1}>
              {item.name_ar}
            </Text>
          ) : null}
          <Text style={styles.price}>{item.base_price.toFixed(2)} DH</Text>
        </View>

        {/* Add button — disabled and visually muted when out of stock */}
        <View style={styles.addWrapper}>
          <TouchableOpacity
            style={[styles.addButton, !item.in_stock && styles.addButtonDisabled]}
            onPress={handleAddPress}
            disabled={!item.in_stock}
            accessibilityRole="button"
            accessibilityLabel={`Ajouter ${item.name_fr} au panier`}
            accessibilityState={{ disabled: !item.in_stock }}
          >
            <Plus
              size={20}
              color={item.in_stock ? COLORS.white : COLORS.textDisabled}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Modifier modal (bottom sheet) ─────────────────────────────────── */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleDismiss}
        statusBarTranslucent
      >
        {/*
          Outer column: TouchableOpacity (backdrop, flex:1) sits above the
          panel. Tapping it dismisses without confirming.
        */}
        <View style={styles.modalOuter}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={handleDismiss}
            accessibilityLabel="Fermer"
          />

          {/* ── Panel ──────────────────────────────────────────────────────── */}
          <View style={styles.panel}>

            {/* Drag handle */}
            <View style={styles.handleBar} />

            {/* Header row */}
            <View style={styles.panelHeader}>
              <View style={styles.panelTitles}>
                <Text style={styles.panelTitle}>Personnaliser</Text>
                <Text style={styles.panelSubtitle} numberOfLines={1}>
                  {item.name_fr}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleDismiss}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Fermer le menu des options"
              >
                <X size={20} color={COLORS.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Scrollable option groups */}
            <ScrollView
              style={styles.optionsList}
              contentContainerStyle={styles.optionsContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {groups.map((group, groupIndex) => (
                <View
                  key={group.group_name_fr}
                  style={[
                    styles.group,
                    groupIndex > 0 && styles.groupBorder,
                  ]}
                >
                  {/* Group heading */}
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupName}>{group.group_name_fr}</Text>
                    {group.is_required && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredBadgeText}>Obligatoire</Text>
                      </View>
                    )}
                  </View>

                  {/* Option rows */}
                  {group.options.map((mod) => {
                    const isSelected = selectedModifiers.some(
                      (m) => m.modifier_id === mod.modifier_id
                    );
                    return (
                      <TouchableOpacity
                        key={mod.modifier_id}
                        style={styles.optionRow}
                        onPress={() => handleToggleModifier(mod)}
                        activeOpacity={0.7}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected }}
                        accessibilityLabel={mod.option_name_fr}
                      >
                        {/* Checkbox */}
                        <View
                          style={[
                            styles.checkbox,
                            isSelected && styles.checkboxChecked,
                          ]}
                        >
                          {isSelected && (
                            <Check size={11} color={COLORS.white} strokeWidth={3} />
                          )}
                        </View>

                        {/* Option name */}
                        <Text
                          style={[
                            styles.optionName,
                            isSelected && styles.optionNameSelected,
                          ]}
                        >
                          {mod.option_name_fr}
                        </Text>

                        {/* Price delta — only shown when there is an upsell */}
                        {mod.price_impact > 0 && (
                          <Text style={styles.priceImpact}>
                            +{mod.price_impact.toFixed(2)} DH
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            {/* Confirm CTA */}
            <View style={styles.ctaWrapper}>
              {!canConfirm && (
                <Text style={styles.ctaHint}>
                  Veuillez choisir : {missingRequiredGroups.map((g) => g.group_name_fr).join(', ')}
                </Text>
              )}
              <TouchableOpacity
                style={[styles.ctaButton, !canConfirm && styles.ctaButtonDisabled]}
                onPress={handleConfirm}
                disabled={!canConfirm}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Ajouter au panier"
                accessibilityState={{ disabled: !canConfirm }}
              >
                <Text style={styles.ctaText}>Ajouter au panier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const COLORS = {
  accent: '#FF6B35',
  white: '#FFFFFF',
  background: '#F8F8F8',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textDisabled: '#C0C0C0',
  border: '#E8E8E8',
  imageBg: '#F0F0F0',
  overlay: 'rgba(0, 0, 0, 0.08)',
  backdrop: 'rgba(0, 0, 0, 0.50)',
  requiredBg: '#FFF3EE',
  requiredText: '#FF6B35',
} as const;

// ─── Styles ───────────────────────────────────────────────────────────────────

const IMAGE_SIZE = 88;
const ADD_BUTTON_SIZE = 36;
const PANEL_RADIUS = 24;

const styles = StyleSheet.create({
  // ── Card ────────────────────────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
    // Subtle elevation
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.55,
  },

  // ── Thumbnail ────────────────────────────────────────────────────────────────
  imageWrapper: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    backgroundColor: COLORS.imageBg,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // ── Text content ─────────────────────────────────────────────────────────────
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  nameFr: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  nameAr: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  price: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.accent,
  },

  // ── Add button ────────────────────────────────────────────────────────────────
  addWrapper: {
    paddingRight: 12,
  },
  addButton: {
    width: ADD_BUTTON_SIZE,
    height: ADD_BUTTON_SIZE,
    borderRadius: ADD_BUTTON_SIZE / 2,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: COLORS.border,
  },

  // ── Modal outer ───────────────────────────────────────────────────────────────
  modalOuter: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.backdrop,
  },

  // ── Bottom sheet panel ────────────────────────────────────────────────────────
  panel: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: PANEL_RADIUS,
    borderTopRightRadius: PANEL_RADIUS,
    maxHeight: '80%',
    // Panel shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 16,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  panelTitles: {
    flex: 1,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  panelSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },

  // ── Option list ───────────────────────────────────────────────────────────────
  optionsList: {
    flexGrow: 0,
  },
  optionsContent: {
    paddingBottom: 8,
  },
  group: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  groupBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  groupName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requiredBadge: {
    backgroundColor: COLORS.requiredBg,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  requiredBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.requiredText,
    letterSpacing: 0.3,
  },

  // ── Option rows ────────────────────────────────────────────────────────────────
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  optionName: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  optionNameSelected: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  priceImpact: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
    flexShrink: 0,
  },

  // ── CTA ────────────────────────────────────────────────────────────────────────
  ctaWrapper: {
    padding: 16,
    paddingBottom: 32, // safe area buffer for devices with home indicator
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ctaButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaButtonDisabled: {
    backgroundColor: COLORS.textDisabled,
  },
  ctaHint: {
    fontSize: 12,
    color: COLORS.requiredText,
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});
