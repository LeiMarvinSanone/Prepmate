// components/PrepMateIcon.js
import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';

/**
 * PrepMate App Icon - SVG Component
 * Adapts colors based on theme (light/dark mode)
 */
const PrepMateIcon = ({ size = 100, isDarkMode = false }) => {
  // Colors adapt based on theme
  const backpackColor = isDarkMode ? '#4ade80' : '#22c55e';
  const checkmarkColor = '#22c55e';
  
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        {/* Backpack main body */}
        <Path
          d="M 60 140 L 70 60 L 130 60 L 140 140 Q 140 160 120 160 L 80 160 Q 60 160 60 140 Z"
          fill={backpackColor}
          stroke={backpackColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Backpack pocket/flap */}
        <Path
          d="M 75 65 L 125 65 Q 130 65 130 70 L 130 95 Q 130 100 125 100 L 75 100 Q 70 100 70 95 L 70 70 Q 70 65 75 65 Z"
          fill="rgba(255,255,255,0.2)"
        />
        
        {/* Checkmark circle background */}
        <Circle cx="100" cy="115" r="26" fill="white" stroke={backpackColor} strokeWidth="2" />
        
        {/* Checkmark */}
        <Path
          d="M 90 115 L 98 125 L 112 105"
          stroke={checkmarkColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Side pockets */}
        <Path
          d="M 55 85 L 55 115 Q 55 120 60 120 L 65 120 Q 70 120 70 115 L 70 90 Q 70 85 65 85 L 60 85 Q 55 85 55 85 Z"
          fill={backpackColor}
          opacity="0.8"
        />
        <Path
          d="M 135 85 L 135 115 Q 135 120 140 120 L 145 120 Q 150 120 150 115 L 150 90 Q 150 85 145 85 L 140 85 Q 135 85 135 85 Z"
          fill={backpackColor}
          opacity="0.8"
        />
        
        {/* Backpack straps */}
        <Path
          d="M 75 75 Q 70 50 75 40"
          stroke={backpackColor}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M 125 75 Q 130 50 125 40"
          stroke={backpackColor}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Top handle */}
        <Path
          d="M 85 35 Q 100 20 115 35"
          stroke={backpackColor}
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
    </View>
  );
};

export default PrepMateIcon;

