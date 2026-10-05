export interface WorkoutWeightPickerProps {
  // Value is in the currently displayed unit; storage conversion belongs to the card.
  value: number;
  unit: string;
  compact?: boolean;
  onChange: (value: number) => void;
}
