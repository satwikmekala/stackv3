import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';

interface SetInputProps {
  setNumber: number;
  reps: number;
  weight: number;
  onRepsChange: (delta: number) => void;
  onWeightChange: (delta: number) => void;
}

export function SetInput({ setNumber, reps, weight, onRepsChange, onWeightChange }: SetInputProps) {
  return (
    <View className="bg-surface-light rounded-xl p-4 mb-3">
      <Text className="text-text-secondary text-sm font-medium mb-3">Set {setNumber}</Text>

      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-text font-medium">Reps</Text>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => onRepsChange(-1)}
            className="bg-surface w-10 h-10 rounded-lg items-center justify-center"
          >
            <Minus color="#A1A1A1" size={20} />
          </TouchableOpacity>
          <Text className="text-text text-xl font-bold mx-4 min-w-[40px] text-center">{reps}</Text>
          <TouchableOpacity
            onPress={() => onRepsChange(1)}
            className="bg-surface w-10 h-10 rounded-lg items-center justify-center"
          >
            <Plus color="#A1A1A1" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-text font-medium">Weight (kg)</Text>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => onWeightChange(-2.5)}
            className="bg-surface w-10 h-10 rounded-lg items-center justify-center"
          >
            <Minus color="#A1A1A1" size={20} />
          </TouchableOpacity>
          <Text className="text-text text-xl font-bold mx-4 min-w-[50px] text-center">{weight}</Text>
          <TouchableOpacity
            onPress={() => onWeightChange(2.5)}
            className="bg-surface w-10 h-10 rounded-lg items-center justify-center"
          >
            <Plus color="#A1A1A1" size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
