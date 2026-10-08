import UIKit

// Expo's bridge is replaced only for this standalone UIKit test application.
final class AppContext {}
class ExpoView: UIView {
  required init(appContext: AppContext? = nil) { super.init(frame: .zero) }
  @available(*, unavailable) required init?(coder: NSCoder) { fatalError() }
}
final class EventDispatcher {
  var events: [[String: Any]] = []
  func callAsFunction(_ value: [String: Any] = [:]) { events.append(value) }
}

final class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    let window = UIWindow(frame: UIScreen.main.bounds)
    let controller = UIViewController()
    controller.view.backgroundColor = UIColor(white: 0.07, alpha: 1)
    window.rootViewController = controller
    window.makeKeyAndVisible()
    self.window = window
    var checks = 0
    let values = [0.0, 0.1, 9, 9.9, 10, 99, 99.9, 100, 100.5, 998.9, 999]
    for compact in [true, false] {
      for width in [CGFloat(129), 140, 160, 196, 280] {
        for category in [UIContentSizeCategory.large, .accessibilityExtraExtraExtraLarge] {
          let child = UIViewController()
          controller.addChild(child)
          controller.view.addSubview(child.view)
          child.traitOverrides.preferredContentSizeCategory = category
          let view = StackWeightPickerView()
          view.compact = compact
          view.hapticsEnabled = false
          view.frame = CGRect(x: 0, y: 0, width: width, height: 190)
          child.view.addSubview(view)
          view.setNeedsLayout(); view.layoutIfNeeded()
          let picker = view.subviews.compactMap { $0 as? UIPickerView }.first!
          let baseline = picker.frame
          let widths = (0..<3).map { view.pickerView(picker, widthForComponent: $0) }
          let font = (view.pickerView(picker, viewForRow: 999, forComponent: 0, reusing: nil) as! UILabel).font!
          for unit in ["KG", "LBS"] {
            view.unit = unit
            for value in values {
              view.value = value; view.updateSelection(); view.layoutIfNeeded()
              precondition(picker.frame == baseline, "selection moved picker frame")
              precondition((0..<3).map { view.pickerView(picker, widthForComponent: $0) } == widths)
              precondition(view.onValueChange.events.isEmpty, "prop update wrote a value")
              for component in [0, 2] {
                let row = component == 0 ? 999 : 9
                let label = view.pickerView(picker, viewForRow: row, forComponent: component, reusing: nil) as! UILabel
                precondition(label.font.pointSize == font.pointSize && !label.adjustsFontSizeToFitWidth)
                precondition(label.sizeThatFits(.init(width: 1000, height: 1000)).width <= widths[component], "number clipped")
              }
              precondition(widths.reduce(0,+) <= picker.bounds.width - 32, "gutters collide")
              checks += 1
            }
          }
          for whole in 0...999 {
            picker.selectRow(whole, inComponent: 0, animated: false)
            picker.selectRow(9, inComponent: 2, animated: false)
            view.pickerView(picker, didSelectRow: whole, inComponent: 0)
            precondition(picker.frame == baseline)
            precondition(view.onValueChange.events.last?["value"] as? Double == min(999, Double(whole) + 0.9))
            checks += 1
          }
          precondition(picker.selectedRow(inComponent: 2) == 0)
          precondition(view.pickerView(picker, accessibilityLabelForComponent: 0) == "Weight in LBS, whole number")
          child.view.removeFromSuperview(); child.removeFromParent()
        }
      }
    }
    // A static review surface: production UIKit picker at the digit boundaries.
    for (index, value) in [9.9, 10.0, 99.9, 100.0, 999.0].enumerated() {
      let view = StackWeightPickerView(); view.compact = true; view.hapticsEnabled = false
      let step = (window.bounds.height - 80) / 5
      view.frame = CGRect(x: (window.bounds.width - 160) / 2, y: 40 + CGFloat(index) * step, width: 160, height: step)
      controller.view.addSubview(view); view.value = value; view.updateSelection(); view.setNeedsLayout(); view.layoutIfNeeded()
    }
    let result = "PASS: \(checks) native geometry/value checks; UIKit delegates exercised, touch gestures not simulated.\n"
    try! result.write(to: FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("result.txt"), atomically: true, encoding: .utf8)
    return true
  }
}
UIApplicationMain(CommandLine.argc, CommandLine.unsafeArgv, nil, NSStringFromClass(AppDelegate.self))
