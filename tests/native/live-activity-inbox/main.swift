import Foundation
let onUserInteractionNotification = Notification.Name("onExpoWidgetsUserInteraction")
let url = FileManager.default.temporaryDirectory.appendingPathComponent("stack-inbox-test-\(UUID()).json")
defer { try? FileManager.default.removeItem(at: url) }
var events = WidgetsEvents(storageURL: url)
for i in 0..<20 { try events.enqueueStackAction(source: "activity", target: "tap-\(i)") }
let hasPending = try events.hasPendingStackActions(source: "activity")
precondition(hasPending)
// A new process/object must recover all undelivered commands in their original order.
events = WidgetsEvents(storageURL: url)
for i in 0..<20 {
  let command = try events.takeStackActions()
  precondition(command.count == 1)
  precondition(command[0]["target"] as? String == "tap-\(i)")
  let revision = try events.stackConsumedRevision()
  precondition(revision == i + 1)
}
let empty = try events.takeStackActions()
precondition(empty.isEmpty)
DispatchQueue.concurrentPerform(iterations: 1000) { i in
  try! events.enqueueStackAction(source: "activity", target: "tap-\(i)")
}
var ids = Set<String>()
for _ in 0..<1000 {
  let pending = try events.takeStackActions()
  precondition(pending.count == 1)
  ids.insert(pending[0]["id"] as! String)
}
precondition(ids.count == 1000)
let finished = try events.takeStackActions()
precondition(finished.isEmpty)
let finalRevision = try events.stackConsumedRevision()
precondition(finalRevision == 1020)
// Corrupt storage must fail closed instead of silently discarding commands.
try Data("broken".utf8).write(to: url)
do { _ = try events.takeStackActions(); fatalError("Must reject a corrupt inbox") }
catch { }
print("PASS: durable FIFO recovery, 1,000 concurrent taps, unique IDs, per-command consumption, revision watermark and fail-closed storage")
