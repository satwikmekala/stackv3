import Foundation

let layout = try String(contentsOfFile: CommandLine.arguments[1], encoding: .utf8)
let callbackLayout = "(function(props, environment) { return (\(layout))(props, environment).banner; })"
let next: [String: Any] = [
  "exerciseName": "Bench Press", "compactName": "Bench", "setNumber": 3, "totalSets": 4,
  "weight": "82.5", "reps": 8, "unit": "kg", "actionTarget": "next:",
  "actions": ["increaseWeight": "increaseWeight", "completeSet": "completeSet"],
  "interaction": ["weightKg": 82.5, "weightStepKg": 2.5, "displayFactor": 1]
]
var props: [String: Any] = [
  "exerciseName": "Bench Press", "compactName": "Bench", "setNumber": 2, "totalSets": 4,
  "weight": "80", "reps": 8, "unit": "kg", "actionTarget": "current:",
  "actions": ["increaseWeight": "increaseWeight", "increaseReps": "increaseReps", "completeSet": "completeSet"],
  "interaction": ["weightKg": 80, "weightStepKg": 2.5, "displayFactor": 1,
    "next": next, "nextWeightOffsetKg": 2.5, "nextRepsFromCurrent": false]
]
func press(_ target: String) throws -> [String: Any]? {
  switch evaluateWidgetButtonPress(layout: callbackLayout, props: props, environment: ["target": target]) {
  case .success(let result): return result
  case .failure(let error): throw error
  }
}
for expected in ["82.5", "85", "87.5"] {
  props = try press("current:increaseWeight")!
  precondition(props["weight"] as? String == expected)
  // Exercise the exact Swift -> ActivityKit JSON -> JS round trip used on iOS.
  let json = try JSONSerialization.data(withJSONObject: props)
  props = try JSONSerialization.jsonObject(with: json) as! [String: Any]
}
props = try press("current:increaseReps")!
precondition(props["reps"] as? Int == 9)
props = try press("current:completeSet")!
precondition(props["setNumber"] as? Int == 3)
precondition(props["weight"] as? String == "90")
let duplicate = try press("current:completeSet")
precondition(duplicate == nil)
let json = try JSONSerialization.data(withJSONObject: props)
precondition(json.count < 4096)
print("PASS: actual JavaScriptCore/Expo callback runtime, latest-props rapid increments, JSON round trip, immediate next-set display and stale Done rejection")

// Timed exercise (bodyweight + duration): TIME controls only, m:ss display,
// the app's fixed 5 s step and its 0:01 lower bound, propagated to the next set.
let plankNext: [String: Any] = [
  "exerciseName": "Plank", "compactName": "Plank", "setNumber": 2, "totalSets": 3,
  "metric": "duration", "weight": "—", "duration": "1:00", "unit": "", "actionTarget": "plank-next:",
  "actions": ["increaseDuration": "increaseDuration", "decreaseDuration": "decreaseDuration", "completeSet": "completeSet"],
  "interaction": ["weightKg": 0, "weightStepKg": 2.5, "displayFactor": 1, "durationS": 60, "durationStepS": 5]
]
props = [
  "exerciseName": "Plank", "compactName": "Plank", "setNumber": 1, "totalSets": 3,
  "metric": "duration", "weight": "—", "duration": "0:58", "unit": "", "actionTarget": "plank:",
  "actions": ["increaseDuration": "increaseDuration", "decreaseDuration": "decreaseDuration", "completeSet": "completeSet"],
  "interaction": ["weightKg": 0, "weightStepKg": 2.5, "displayFactor": 1, "durationS": 58, "durationStepS": 5,
    "next": plankNext, "nextDurationFromCurrent": true]
]
for expected in ["1:03", "1:08"] {
  props = try press("plank:increaseDuration")!
  precondition(props["duration"] as? String == expected)
  precondition(props["reps"] == nil)
  let roundTrip = try JSONSerialization.data(withJSONObject: props)
  props = try JSONSerialization.jsonObject(with: roundTrip) as! [String: Any]
}
for _ in 0..<20 { props = try press("plank:decreaseDuration")! }
precondition(props["duration"] as? String == "0:01")
props = try press("plank:increaseDuration")!
props = try press("plank:completeSet")!
precondition(props["setNumber"] as? Int == 2)
precondition(props["duration"] as? String == "0:06")
let timedJson = try JSONSerialization.data(withJSONObject: props)
precondition(timedJson.count < 4096)
print("PASS: timed exercise TIME-only presses, m:ss formatting, shared lower bound, next-set duration and payload size")
