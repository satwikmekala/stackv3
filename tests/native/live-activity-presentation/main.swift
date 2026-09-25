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
