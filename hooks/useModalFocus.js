// hooks/useModalFocus.js
// Reusable hook to manage focus when modals open/close
// Prevents "aria-hidden on element with focused descendant" warnings on web

import { useCallback } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Clears focus from any currently focused element (works on React Native Web).
 * This must be called BEFORE a modal closes or aria-hidden is applied to prevent
 * accessibility warnings about focused elements being hidden.
 */
export const clearAccessibilityFocus = () => {
  // Dismiss keyboard for any active TextInput on native and web
  Keyboard.dismiss();
  
  // On web, also blur any focused DOM element to prevent aria-hidden warnings
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      document.activeElement?.blur?.();
    } catch (e) {
      // Silently ignore if blur fails (in case we're in a strange state)
    }
  }
};

/**
 * React hook that provides a function to safely close modals with focus clearing.
 * Use this whenever you close a modal to prevent accessibility warnings.
 *
 * @returns {Function} closeModal - Call this instead of setModal directly
 *
 * Example:
 * const closeModal = useModalFocus(modalState, setModal);
 * 
 * // In your close button:
 * <TouchableOpacity onPress={closeModal}>
 *   <Text>Close</Text>
 * </TouchableOpacity>
 */
export const useModalFocus = (modalState, setModalState) => {
  return useCallback(() => {
    // Clear focus first, then close the modal
    clearAccessibilityFocus();
    
    // Reset the modal state (handle both object and boolean states)
    if (typeof modalState === 'boolean') {
      setModalState(false);
    } else if (typeof modalState === 'object') {
      // For object-based modal states, reset the visible property
      setModalState(prev => ({ ...prev, visible: false }));
    }
  }, [modalState, setModalState]);
};

/**
 * Variant for complex modal close handlers that need to do more than just set state.
 * Automatically clears focus before calling your custom close function.
 *
 * Example:
 * const handleModalClose = useModalFocusWithCallback(() => {
 *   // Your custom logic here (navigation, etc)
 *   navigation.goBack();
 * });
 */
export const useModalFocusWithCallback = (callback) => {
  return useCallback(() => {
    clearAccessibilityFocus();
    callback?.();
  }, [callback]);
};
