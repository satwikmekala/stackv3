import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkoutStore, IntensityLevel } from '@/store/workoutStore';
import { SetInput } from '@/components/SetInput';
import { Button } from '@/components/Button';
import { X } from 'lucide-react-native';
import '@/global.css';

const WORKOUT_LABELS = {
  push: 'Push Day',
  pull: 'Pull Day',
  legs: 'Legs Day',
  abs: 'Abs Day',
};

const INTENSITY_OPTIONS: { value: IntensityLevel; label: string; emoji: string }[] = [
  { value: 'easy', label: 'Too Easy', emoji: '😊' },
  { value: 'medium', label: 'Just Right', emoji: '💪' },
  { value: 'hard', label: 'Too Hard', emoji: '😰' },
];

export default function Workout() {
  const router = useRouter();
  const currentSession = useWorkoutStore((state) => state.currentSession);
  const updateExerciseSet = useWorkoutStore((state) => state.updateExerciseSet);
  const completeWorkout = useWorkoutStore((state) => state.completeWorkout);
  const discardWorkout = useWorkoutStore((state) => state.discardWorkout);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  if (!currentSession) {
    router.back();
    return null;
  }

  const handleRepsChange = (exerciseIndex: number, setIndex: number, delta: number) => {
    const currentSet = currentSession.exercises[exerciseIndex].sets[setIndex];
    const newReps = Math.max(1, currentSet.reps + delta);
    updateExerciseSet(exerciseIndex, setIndex, newReps, currentSet.weight);
  };

  const handleWeightChange = (exerciseIndex: number, setIndex: number, delta: number) => {
    const currentSet = currentSession.exercises[exerciseIndex].sets[setIndex];
    const newWeight = Math.max(0, currentSet.weight + delta);
    updateExerciseSet(exerciseIndex, setIndex, currentSet.reps, newWeight);
  };

  const handleComplete = () => {
    setShowFeedbackModal(true);
  };

  const handleFeedbackSelect = (intensity: IntensityLevel) => {
    completeWorkout(intensity);
    setShowFeedbackModal(false);
    router.replace('/(tabs)');
  };

  const handleDiscard = () => {
    discardWorkout();
    setShowDiscardModal(false);
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-surface-light">
        <View>
          <Text className="text-2xl font-bold text-text">{WORKOUT_LABELS[currentSession.type]}</Text>
          <Text className="text-text-secondary text-sm">{currentSession.exercises.length} exercises</Text>
        </View>
        <TouchableOpacity onPress={() => setShowDiscardModal(true)} className="p-2">
          <X color="#A1A1A1" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        <View className="py-6">
          {currentSession.exercises.map((exercise, exerciseIndex) => (
            <View key={exerciseIndex} className="mb-6">
              <Text className="text-text font-bold text-lg mb-3">{exercise.name}</Text>
              {exercise.sets.map((set, setIndex) => (
                <SetInput
                  key={setIndex}
                  setNumber={setIndex + 1}
                  reps={set.reps}
                  weight={set.weight}
                  onRepsChange={(delta) => handleRepsChange(exerciseIndex, setIndex, delta)}
                  onWeightChange={(delta) => handleWeightChange(exerciseIndex, setIndex, delta)}
                />
              ))}
            </View>
          ))}
        </View>

        <View className="pb-6">
          <Button title="Complete Workout" onPress={handleComplete} />
        </View>
      </ScrollView>

      <Modal visible={showFeedbackModal} transparent animationType="fade">
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-surface rounded-t-3xl p-6">
            <Text className="text-2xl font-bold text-text mb-2">How did it feel?</Text>
            <Text className="text-text-secondary mb-6">
              This helps us adjust your next workout to keep you progressing
            </Text>

            {INTENSITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => handleFeedbackSelect(option.value)}
                className="bg-surface-light p-5 rounded-xl mb-3 flex-row items-center"
              >
                <Text className="text-3xl mr-4">{option.emoji}</Text>
                <Text className="text-text text-lg font-semibold">{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={showDiscardModal} transparent animationType="fade">
        <View className="flex-1 bg-black/80 justify-center items-center px-6">
          <View className="bg-surface rounded-2xl p-6 w-full">
            <Text className="text-xl font-bold text-text mb-2">Discard Workout?</Text>
            <Text className="text-text-secondary mb-6">
              Your progress won't be saved if you leave now
            </Text>

            <Button title="Keep Training" onPress={() => setShowDiscardModal(false)} className="mb-3" />
            <Button title="Discard" onPress={handleDiscard} variant="ghost" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
