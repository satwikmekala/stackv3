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
  func enqueueStackAction(source: String, target: String) throws -> [String: Any] {
    if failJournal { throw CocoaError(.fileWriteOutOfSpace) }
    sequence += 1
    let command: [String: Any] = ["source": source, "target": target, "sequence": sequence]
    commands.append(command)
    return command
  }
  func sendNotification(type: Kind, data: [String: Any]) {}
  func hasPendingStackActions(source: String) throws -> Bool { !commands.isEmpty }
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
  }
}
