import Foundation

struct LiveActivityAttributes {
  struct ContentState: Codable { var name: String; var props: String }
}
struct ActivityContent<State> { var state: State; var staleDate: Date? }
enum TestActivityState { case active, stale, ended }
var registeredActivities: [Any] = []
final class Activity<Attributes> {
  static var activities: [Activity<Attributes>] { registeredActivities.compactMap { $0 as? Activity<Attributes> } }
  let id = "test-activity"
  var activityState = TestActivityState.active
  var content: ActivityContent<LiveActivityAttributes.ContentState>
  var writes: [[String: Any]] = []
  init(props: String) { content = ActivityContent(state: .init(name: "StackWorkoutLiveActivity", props: props), staleDate: nil) }
  func update(_ content: ActivityContent<LiveActivityAttributes.ContentState>) async {
    // Force actor reentrancy opportunities, as real ActivityKit does.
    try? await Task.sleep(nanoseconds: 1_000_000)
    self.content = content
    writes.append(try! JSONSerialization.jsonObject(with: Data(content.state.props.utf8)) as! [String: Any])
  }
}
struct WidgetsStorage {
  static func getString(forKey: String) -> String? { try? String(contentsOfFile: CommandLine.arguments[1], encoding: .utf8) }
}
final class WidgetsEvents {
  static let shared = WidgetsEvents()
  enum Kind { case userEvent }
  var commands: [[String: Any]] = []
  var sequence = 0
  var failJournal = false
  func enqueueStackAction(source: String, target: String, trace: StackLATrace? = nil) throws -> [String: Any] {
    if failJournal { throw CocoaError(.fileWriteOutOfSpace) }
    sequence += 1
    let command: [String: Any] = ["source": source, "target": target, "sequence": sequence]
    commands.append(command)
    return command
  }
  func sendNotification(type: Kind, data: [String: Any], trace: StackLATrace? = nil) {}
  func hasPendingStackActions(source: String, trace: StackLATrace? = nil) throws -> Bool { !commands.isEmpty }
}

@main struct OrderingTests {
  static func main() async throws {
    let initial: [String: Any] = [
      "exerciseName": "Bench Press", "compactName": "Bench", "setNumber": 2, "totalSets": 4,
      "weight": "80", "reps": 8, "unit": "kg", "actionTarget": "current:",
      "actions": ["increaseWeight": "increaseWeight", "completeSet": "completeSet"],
      "interaction": ["weightKg": 80, "weightStepKg": 2.5, "displayFactor": 1],
      "acknowledgedRevision": 0
    ]
    func encode(_ props: [String: Any]) throws -> String {
      String(data: try JSONSerialization.data(withJSONObject: props), encoding: .utf8)!
    }
    let activity = Activity<LiveActivityAttributes>(props: try encode(initial))
    registeredActivities = [activity]
    let executor = StackLiveActivityPresentation.shared
    async let a: Void = executor.press(source: activity.id, target: "current:increaseWeight")
    async let b: Void = executor.press(source: activity.id, target: "current:increaseWeight")
    async let c: Void = executor.press(source: activity.id, target: "current:increaseWeight")
    _ = try await (a, b, c)
    precondition(activity.writes.map { $0["weight"] as! String } == ["82.5", "85", "87.5"])
    precondition(WidgetsEvents.shared.commands.count == 3)
    // A startup snapshot must not overwrite undelivered optimistic commands.
    try await executor.reconcile(source: activity.id, props: encode(initial), staleDate: nil)
    precondition(activity.writes.count == 3)
    WidgetsEvents.shared.commands.removeAll()
    // Nor may an earlier host update overwrite taps already consumed by JS.
    try await executor.reconcile(source: activity.id, props: encode(initial), staleDate: nil)
    precondition(activity.writes.count == 3)
    // A rejected action is corrected once the host acknowledges its consumption.
    var rejected = initial
    rejected["acknowledgedRevision"] = 3
    try await executor.reconcile(source: activity.id, props: encode(rejected), staleDate: nil)
    precondition(activity.writes.last?["weight"] as? String == "80")
    // No optimistic update is displayed if accepting the command cannot persist.
    WidgetsEvents.shared.failJournal = true
    do { try await executor.press(source: activity.id, target: "current:increaseWeight"); fatalError("Must fail") }
    catch { }
    precondition(activity.writes.count == 4)
    print("PASS: production native serial executor with mocked ActivityKit; concurrent presses, startup/late snapshot barriers, authoritative rejection correction and journal failure")
    try await responsiveness(initial: initial)
  }

  static func responsiveness(initial: [String: Any]) async throws {
    func encode(_ props: [String: Any]) throws -> String {
      String(data: try JSONSerialization.data(withJSONObject: props, options: [.sortedKeys]), encoding: .utf8)!
    }
    func fixture(_ props: [String: Any]) throws -> (Activity<LiveActivityAttributes>, StackLiveActivityPresentation) {
      WidgetsEvents.shared.commands = []
      WidgetsEvents.shared.sequence = 0
      WidgetsEvents.shared.failJournal = false
      let activity = Activity<LiveActivityAttributes>(props: try encode(props))
      registeredActivities = [activity]
      return (activity, StackLiveActivityPresentation())
    }
    func acknowledged(_ props: [String: Any], _ revision: Int) -> [String: Any] {
      var result = props
      result.removeValue(forKey: "_stackRevision")
      result["acknowledgedRevision"] = revision
      return result
    }

    // Each burst uses production JS callbacks and the production actor. These
    // assert update counts/order, not wall-clock performance of mocked ActivityKit.
    var bursts = 0
    for metric in ["reps", "duration"] {
      for unit in ["kg", "lbs", ""] {
        let valueAction = metric == "reps" ? "increaseReps" : "increaseDuration"
        for action in unit.isEmpty ? [valueAction] : ["increaseWeight", "decreaseWeight", valueAction] {
          for count in [5, 10] {
            var props = initial
            props["metric"] = metric
            props["unit"] = unit
            props["weight"] = unit.isEmpty ? "—" : "80"
            props["actions"] = [action: action, "completeSet": "completeSet"]
            var model: [String: Any] = ["weightKg": 80, "weightStepKg": 2.5, "displayFactor": unit == "lbs" ? 2.2046226218487757 : 1]
            if metric == "duration" {
              props.removeValue(forKey: "reps")
              props["duration"] = "1:00"
              model["durationS"] = 60
              model["durationStepS"] = 5
            }
            props["interaction"] = model
            let (activity, executor) = try fixture(props)
            try await withThrowingTaskGroup(of: Void.self) { group in
              for _ in 0..<count {
                group.addTask { try await executor.press(source: activity.id, target: "current:" + action) }
              }
              try await group.waitForAll()
            }
            precondition(activity.writes.count == count)
            precondition(activity.writes.map { $0["_stackRevision"] as! Int } == Array(1...count))
            precondition(WidgetsEvents.shared.commands.map { $0["sequence"] as! Int } == Array(1...count))
            let last = activity.writes.last!
            let actual = last["interaction"] as! [String: Any]
            if action == "increaseWeight" || action == "decreaseWeight" {
              precondition(actual["weightKg"] as! Double == 80 + Double(count) * (action == "increaseWeight" ? 2.5 : -2.5))
            } else if metric == "duration" {
              precondition(actual["durationS"] as! Int == 60 + count * 5)
            } else { precondition(last["reps"] as! Int == 8 + count) }
            let host = acknowledged(last, count)
            // Even matching host content must not bypass the pending barrier.
            try await executor.reconcile(source: activity.id, props: encode(host), staleDate: nil)
            precondition(activity.writes.count == count)
            WidgetsEvents.shared.commands.removeAll()
            try await executor.reconcile(source: activity.id, props: encode(host), staleDate: nil)
            try await executor.reconcile(source: activity.id, props: encode(host), staleDate: nil)
            precondition(activity.writes.count == count, "Matching acknowledgements must not redraw")
            // Neither the warmed actor nor a restarted actor may accept an old
            // host snapshot after an acknowledgement-only fast path.
            try await executor.reconcile(source: activity.id, props: encode(props), staleDate: nil)
            let restarted = StackLiveActivityPresentation()
            try await restarted.reconcile(source: activity.id, props: encode(props), staleDate: nil)
            precondition(activity.writes.count == count, "Revision floor must survive a skipped update and restart")
            try await restarted.reconcile(source: activity.id, props: encode(host), staleDate: nil)
            precondition(activity.writes.count == count)
            bursts += 1
          }
        }
      }
    }
    print("PASS: \(bursts) burst cases (5/10 taps, kg/lb/reps/duration); one optimistic write per tap, zero identical authoritative writes, warm/cold stale-snapshot protection")

    let (activity, executor) = try fixture(initial)
    try await executor.press(source: activity.id, target: "current:increaseWeight")
    WidgetsEvents.shared.commands.removeAll()
    var host = acknowledged(activity.writes.last!, 1)
    try await executor.reconcile(source: activity.id, props: encode(host), staleDate: nil)
    precondition(activity.writes.count == 1)
    // An acknowledgement not already represented in persisted ActivityKit
    // content must be written even when every visible value is identical.
    host["acknowledgedRevision"] = 2
    try await executor.reconcile(source: activity.id, props: encode(host), staleDate: nil)
    precondition(activity.writes.count == 2)
    for actor in [executor, StackLiveActivityPresentation()] {
      try await actor.reconcile(source: activity.id, props: encode(initial), staleDate: nil)
    }
    precondition(activity.writes.count == 2, "Authoritative acknowledgement is also a revision floor")
    let staleDate = Date(timeIntervalSince1970: 2_000_000_000)
    try await executor.reconcile(source: activity.id, props: encode(host), staleDate: staleDate)
    precondition(activity.writes.count == 3 && activity.content.staleDate == staleDate)
    try await executor.reconcile(source: activity.id, props: encode(host), staleDate: nil)
    precondition(activity.writes.count == 4 && activity.content.staleDate == nil)
    // Equal displayed values cannot conceal a new target, unit, step, preview,
    // or available control. Updating those is essential for the next press.
    let changes: [[String: Any]] = [
      ["actionTarget": "appended-exercise:"], ["unit": "lbs"],
      ["interaction": ["weightKg": 82.5, "weightStepKg": 5, "displayFactor": 1]],
      ["interaction": ["weightKg": 82.5, "weightStepKg": 5, "displayFactor": 1, "next": initial]],
      ["actions": ["increaseWeight": "increaseWeight"]]
    ]
    for change in changes {
      let before = activity.writes.count
      host.merge(change) { _, new in new }
      try await executor.reconcile(source: activity.id, props: encode(host), staleDate: nil)
      precondition(activity.writes.count == before + 1)
    }
    let before = activity.writes.count
    for _ in 0..<10 { try await executor.press(source: activity.id, target: "current:increaseWeight") }
    precondition(activity.writes.count == before && WidgetsEvents.shared.commands.isEmpty,
      "Queued old exercise targets cannot modify the newly focused presentation")
    print("PASS: newer acknowledgements persist; stale-date, target, unit, step, preview and control changes redraw; ten stale targets rejected")

    let (doneActivity, doneExecutor) = try fixture(initial)
    try await doneExecutor.press(source: doneActivity.id, target: "current:completeSet")
    precondition(doneActivity.writes.last?["completionPending"] as? Bool == true)
    try await doneExecutor.press(source: doneActivity.id, target: "current:completeSet")
    precondition(WidgetsEvents.shared.commands.count == 1)
    WidgetsEvents.shared.commands.removeAll()
    let rejectedDone = acknowledged(initial, 1)
    try await doneExecutor.reconcile(source: doneActivity.id, props: encode(rejectedDone), staleDate: nil)
    precondition(doneActivity.writes.count == 2 && doneActivity.writes.last?["completionPending"] == nil)
    precondition((doneActivity.writes.last?["actions"] as? [String: String])?["completeSet"] == "completeSet")
    print("PASS: Done feedback disables duplicate completion; acknowledgement/rejection restores controls despite identical numbers")
  }
}
