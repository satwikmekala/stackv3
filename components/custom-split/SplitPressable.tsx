import { useState } from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

/**
 * NativeWind's interop loses callback/conditional-array Pressable styles in
 * the current native runtime. Resolve and flatten them so hit regions reach
 * the native view, while retaining immediate press feedback and callbacks.
 */
export function SplitPressable({ style, children, onPressIn, onPressOut, onHoverIn, onHoverOut, ...props }: PressableProps) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  return <Pressable {...props}
    onHoverIn={event => { setHovered(true); onHoverIn?.(event); }}
    onHoverOut={event => { setHovered(false); onHoverOut?.(event); }}
    onPressIn={event => { setPressed(true); onPressIn?.(event); }}
    onPressOut={event => { setPressed(false); onPressOut?.(event); }}
    style={StyleSheet.flatten(typeof style === 'function' ? style({ pressed, hovered }) : style)}>
    {typeof children === 'function' ? children({ pressed, hovered }) : children}
  </Pressable>;
}
