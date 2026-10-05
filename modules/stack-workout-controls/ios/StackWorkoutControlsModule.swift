import ExpoModulesCore
import UIKit
import ActivityKit

public final class StackWorkoutControlsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("StackWorkoutControls")
    Function("areLiveActivitiesEnabled") { () -> Bool in
      if #available(iOS 16.2, *) { return ActivityAuthorizationInfo().areActivitiesEnabled }
      return false
    }
    View(StackWorkoutControlsView.self) {
      Events("onChangePress", "onMinimizePress", "onExitPress", "onSizeChange")
      Prop("addMode") { (view, value: Bool) in view.addMode = value }
    }
    View(StackNotesDoneView.self) {
      ViewName("NotesDone")
      Events("onDonePress")
      Prop("accessory") { (view, value: Bool) in view.accessory = value }
    }
    View(StackTabBarDepartureView.self) {
      ViewName("TabBarDeparture")
      Prop("active") { (view, value: Bool) in view.active = value }
      Prop("departureOpacity") { (view, value: Double) in view.departureOpacity = value }
    }
    View(StackWeightPickerView.self) {
      ViewName("WeightPicker")
      Events("onValueChange")
      Prop("value") { (view, value: Double) in view.value = value }
      Prop("unit") { (view, value: String) in view.unit = value }
      Prop("compact") { (view, value: Bool) in view.compact = value }
      Prop("hapticsEnabled") { (view, value: Bool) in view.hapticsEnabled = value }
      OnViewDidUpdateProps { (view: StackWeightPickerView) in view.updateSelection() }
    }
    View(StackRepsPickerView.self) {
      ViewName("RepsPicker")
      Events("onValueChange")
      Prop("value") { (view, value: Int) in view.value = value }
      Prop("hapticsEnabled") { (view, value: Bool) in view.hapticsEnabled = value }
      OnViewDidUpdateProps { (view: StackRepsPickerView) in view.updateSelection() }
    }
  }
}

/// A nonvisual anchor inside Home connects its UI-thread animation to UIKit's
/// tab bar without fading the tab controller's entire content view.
final class StackTabBarDepartureView: ExpoView {
  var active = false { didSet { updateTabBar() } }
  var departureOpacity = 1.0 { didSet { updateTabBar() } }
  private weak var tabBar: UITabBar?
  private var originalAlpha: CGFloat = 1
  private var originalInteraction = true
  private var originalAccessibilityHidden = false

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil { restoreTabBar() }
    else { updateTabBar() }
  }

  private func updateTabBar() {
    guard active, window != nil else {
      restoreTabBar()
      return
    }
    if tabBar == nil {
      var responder: UIResponder? = self
      while let current = responder {
        if let controller = current as? UIViewController,
           let bar = (controller as? UITabBarController ?? controller.tabBarController)?.tabBar {
          tabBar = bar
          originalAlpha = bar.alpha
          originalInteraction = bar.isUserInteractionEnabled
          originalAccessibilityHidden = bar.accessibilityElementsHidden
          break
        }
        responder = current.next
      }
    }
    guard let bar = tabBar, departureOpacity.isFinite else { return }
    let opacity = CGFloat(min(1, max(0, departureOpacity)))
    bar.alpha = originalAlpha * opacity
    bar.isUserInteractionEnabled = originalInteraction && opacity > 0.01
    bar.accessibilityElementsHidden = originalAccessibilityHidden || opacity <= 0.01
  }

  private func restoreTabBar() {
    guard let bar = tabBar else { return }
    bar.alpha = originalAlpha
    bar.isUserInteractionEnabled = originalInteraction
    bar.accessibilityElementsHidden = originalAccessibilityHidden
    tabBar = nil
  }
}

/// A real system Done item, hosted in the keyboard accessory or beside the editor.
final class StackNotesDoneView: ExpoView {
  let onDonePress = EventDispatcher()
  private let toolbar = UIToolbar()
  var accessory = false { didSet { configureAppearance() } }

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    overrideUserInterfaceStyle = .dark
    isOpaque = false
    toolbar.tintColor = .systemBlue
    isAccessibilityElement = true
    accessibilityLabel = "Done"
    accessibilityHint = "Finish editing and dismiss the keyboard"
    accessibilityTraits = .button
    let done = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(donePressed))
    done.accessibilityHint = "Finish editing and dismiss the keyboard"
    toolbar.items = [UIBarButtonItem(systemItem: .flexibleSpace), done]
    addSubview(toolbar)
    configureAppearance()
  }

  private func configureAppearance() {
    let appearance = UIToolbarAppearance()
    if accessory { appearance.configureWithDefaultBackground() }
    else { appearance.configureWithTransparentBackground() }
    toolbar.standardAppearance = appearance
    toolbar.compactAppearance = appearance
    toolbar.scrollEdgeAppearance = appearance
    toolbar.compactScrollEdgeAppearance = appearance
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    toolbar.frame = bounds
  }

  @objc private func donePressed() { onDonePress() }
  override func accessibilityActivate() -> Bool {
    onDonePress()
    return true
  }
}

/// UIKit supplies the wheel's cylindrical projection, inertia, snapping, and
/// VoiceOver adjustment. Only the row content is specific to workout logging.
final class StackWeightPickerView: ExpoView, UIPickerViewDataSource, UIPickerViewDelegate, UIPickerViewAccessibilityDelegate {
  let onValueChange = EventDispatcher()
  var value = 0.0
  var hapticsEnabled = true
  var unit = "kg" { didSet { unitLabel.text = unit } }
  var compact = false {
    didSet {
      guard compact != oldValue else { return }
      picker.reloadAllComponents()
      setNeedsLayout()
    }
  }

  private let picker = UIPickerView()
  private let unitLabel = UILabel()
  private let feedback = UISelectionFeedbackGenerator()
  private let wholeNumberMaximum = 999
  private let maximumTenths = 9990
  private var selectedTenths = -1
  private var wholeDigitCount = 1
  private var laidOutDigitCount = 0

  private var numberFont: UIFont {
    UIFontMetrics(forTextStyle: .title1).scaledFont(
      for: .monospacedDigitSystemFont(ofSize: compact ? 34 : 40, weight: .medium),
      maximumPointSize: compact ? 42 : 48)
  }

  private var numberColumnWidths: [CGFloat] {
    let digit = ceil(("0" as NSString).size(withAttributes: [.font: numberFont]).width)
    let dot = ceil(("." as NSString).size(withAttributes: [.font: numberFont]).width)
    return [digit * CGFloat(wholeDigitCount), dot, digit]
  }

  private func resizeForSelection(animated: Bool) {
    let digits = String(max(0, selectedTenths) / 10).count
    guard digits != wholeDigitCount else { return }
    wholeDigitCount = digits
    setNeedsLayout()
    let changes = {
      self.layoutIfNeeded()
      self.picker.layoutIfNeeded()
    }
    if animated && window != nil && !UIAccessibility.isReduceMotionEnabled {
      UIView.animate(withDuration: 0.3, delay: 0, usingSpringWithDamping: 0.9,
                     initialSpringVelocity: 0, options: [.beginFromCurrentState, .allowUserInteraction],
                     animations: changes)
    } else {
      UIView.performWithoutAnimation(changes)
    }
  }

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    isOpaque = false
    overrideUserInterfaceStyle = .dark
    picker.dataSource = self
    picker.delegate = self
    addSubview(picker)
    unitLabel.textColor = UIColor(red: 169/255, green: 159/255, blue: 145/255, alpha: 1)
    unitLabel.isAccessibilityElement = false
    unitLabel.textAlignment = .left
    addSubview(unitLabel)
    if #available(iOS 17.0, *) {
      registerForTraitChanges([UITraitPreferredContentSizeCategory.self]) {
        (view: StackWeightPickerView, _: UITraitCollection) in
        view.picker.reloadAllComponents()
        view.setNeedsLayout()
      }
    }
  }

  func updateSelection() {
    guard value.isFinite else { return }
    let tenths = Int((min(999, max(0, value)) * 10).rounded())
    // Acknowledging a native selection must not interrupt either wheel.
    guard tenths != selectedTenths else { return }
    let hadSelection = selectedTenths >= 0
    selectedTenths = tenths
    resizeForSelection(animated: hadSelection)
    let whole = tenths / 10
    picker.selectRow(whole, inComponent: 0, animated: false)
    picker.selectRow(tenths % 10, inComponent: 2, animated: false)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let unitFont = UIFontMetrics(forTextStyle: .body).scaledFont(for: .systemFont(ofSize: 17, weight: .medium), maximumPointSize: 22)
    unitLabel.font = unitFont
    let unitWidth = max(28, ceil((unit as NSString).size(withAttributes: [.font: unitFont]).width))
    unitLabel.isHidden = compact
    // Equal 12-point outer insets around the digits, plus UIKit's 32-point gutters.
    // Keep the enclosing weight column fixed while the native pill grows inward/outward.
    let desiredWidth = numberColumnWidths.reduce(0, +) + 56
    let pickerWidth = max(0, min(desiredWidth, bounds.width - (compact ? 0 : unitWidth + 8)))
    let left = max(0, (bounds.width - pickerWidth - (compact ? 0 : unitWidth + 8)) / 2)
    let widthChanged = abs(picker.bounds.width - pickerWidth) > 0.5
    picker.frame = CGRect(x: left, y: 0, width: pickerWidth, height: bounds.height)
    if widthChanged || laidOutDigitCount != wholeDigitCount {
      laidOutDigitCount = wholeDigitCount
      picker.reloadAllComponents()
    }
    unitLabel.frame = CGRect(x: picker.frame.maxX + 8, y: (bounds.height - 44) / 2, width: unitWidth, height: 44)
  }

  func numberOfComponents(in pickerView: UIPickerView) -> Int { 3 }

  func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
    component == 0 ? wholeNumberMaximum + 1 : component == 1 ? 1 : 10
  }

  func pickerView(_ pickerView: UIPickerView, widthForComponent component: Int) -> CGFloat {
    let widths = numberColumnWidths
    let available = max(0, pickerView.bounds.width - 56)
    let scale = min(1, available / widths.reduce(0, +))
    return widths[component] * scale
  }

  func pickerView(_ pickerView: UIPickerView, rowHeightForComponent component: Int) -> CGFloat { compact ? 40 : 44 }

  func pickerView(_ pickerView: UIPickerView, viewForRow row: Int, forComponent component: Int, reusing view: UIView?) -> UIView {
    let label = (view as? UILabel) ?? UILabel()
    label.text = component == 1 ? "." : String(row)
    // Keep both number wheels close to the decimal point, independent of the
    // whole number's digit count or the available width.
    label.textAlignment = component == 0 ? .right : component == 2 ? .left : .center
    label.textColor = UIColor(red: 245/255, green: 240/255, blue: 232/255, alpha: 1)
    label.font = numberFont
    label.adjustsFontSizeToFitWidth = true
    label.minimumScaleFactor = 0.4
    label.isAccessibilityElement = false
    return label
  }

  func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
    guard component != 1 else { return }
    let requestedTenths = pickerView.selectedRow(inComponent: 0) * 10 + pickerView.selectedRow(inComponent: 2)
    let tenths = min(maximumTenths, requestedTenths)
    if requestedTenths > maximumTenths {
      picker.selectRow(0, inComponent: 2, animated: false)
    }
    guard tenths != selectedTenths else { return }
    selectedTenths = tenths
    resizeForSelection(animated: true)
    if hapticsEnabled { feedback.selectionChanged() }
    onValueChange(["value": Double(tenths) / 10])
  }

  func pickerView(_ pickerView: UIPickerView, accessibilityLabelForComponent component: Int) -> String? {
    component == 0 ? "Weight in \(unit), whole number" : component == 1 ? "Decimal point" : "Weight in \(unit), decimal digit"
  }

  func pickerView(_ pickerView: UIPickerView, accessibilityHintForComponent component: Int) -> String? {
    component == 1 ? nil : "Swipe up or down to adjust"
  }
}

/// Reps share the same UIKit wheel behavior and typography as compact weight.
final class StackRepsPickerView: ExpoView, UIPickerViewDataSource, UIPickerViewDelegate, UIPickerViewAccessibilityDelegate {
  let onValueChange = EventDispatcher()
  var value = 1
  var hapticsEnabled = true
  private let picker = UIPickerView()
  private let feedback = UISelectionFeedbackGenerator()
  private let maximum = 99
  private var selectedValue = 0

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    isOpaque = false
    overrideUserInterfaceStyle = .dark
    isAccessibilityElement = true
    accessibilityLabel = "Repetitions"
    accessibilityHint = "Swipe up or down to adjust"
    accessibilityTraits = .adjustable
    picker.dataSource = self
    picker.delegate = self
    picker.accessibilityElementsHidden = true
    addSubview(picker)
    if #available(iOS 17.0, *) {
      registerForTraitChanges([UITraitPreferredContentSizeCategory.self]) {
        (view: StackRepsPickerView, _: UITraitCollection) in view.picker.reloadAllComponents()
      }
    }
  }

  func updateSelection() {
    let next = min(maximum, max(1, value))
    guard next != selectedValue else { return }
    selectedValue = next
    accessibilityValue = String(next)
    picker.selectRow(next - 1, inComponent: 0, animated: false)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let width = min(88, bounds.width)
    picker.frame = CGRect(x: (bounds.width - width) / 2, y: 0, width: width, height: bounds.height)
  }

  func numberOfComponents(in pickerView: UIPickerView) -> Int { 1 }
  func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int { maximum }
  func pickerView(_ pickerView: UIPickerView, rowHeightForComponent component: Int) -> CGFloat { 40 }
  func pickerView(_ pickerView: UIPickerView, widthForComponent component: Int) -> CGFloat { pickerView.bounds.width }

  func pickerView(_ pickerView: UIPickerView, viewForRow row: Int, forComponent component: Int, reusing view: UIView?) -> UIView {
    let label = (view as? UILabel) ?? UILabel()
    label.text = String(row + 1)
    label.textAlignment = .center
    label.textColor = UIColor(red: 245/255, green: 240/255, blue: 232/255, alpha: 1)
    label.font = UIFontMetrics(forTextStyle: .title1).scaledFont(for: .monospacedDigitSystemFont(ofSize: 34, weight: .medium), maximumPointSize: 42)
    label.adjustsFontSizeToFitWidth = true
    label.minimumScaleFactor = 0.7
    label.isAccessibilityElement = false
    return label
  }

  func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
    let next = row + 1
    guard next != selectedValue else { return }
    selectedValue = next
    accessibilityValue = String(next)
    if hapticsEnabled { feedback.selectionChanged() }
    onValueChange(["value": next])
  }

  func pickerView(_ pickerView: UIPickerView, accessibilityLabelForComponent component: Int) -> String? { "Repetitions" }
  func pickerView(_ pickerView: UIPickerView, accessibilityHintForComponent component: Int) -> String? { "Swipe up or down to adjust" }

  override func accessibilityIncrement() { adjustRepetitions(by: 1) }
  override func accessibilityDecrement() { adjustRepetitions(by: -1) }

  private func adjustRepetitions(by delta: Int) {
    let next = min(maximum, max(1, selectedValue + delta))
    guard next != selectedValue else { return }
    picker.selectRow(next - 1, inComponent: 0, animated: false)
    pickerView(picker, didSelectRow: next - 1, inComponent: 0)
  }
}

final class StackWorkoutControlsView: ExpoView {
  let onChangePress = EventDispatcher()
  let onMinimizePress = EventDispatcher()
  let onExitPress = EventDispatcher()
  let onSizeChange = EventDispatcher()
  var addMode = false { didSet { configureItems() } }

  private let toolbar = UIToolbar()
  private var reportedSize = CGSize.zero

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    isOpaque = false
    // The logger's content is always dark, regardless of device appearance.
    overrideUserInterfaceStyle = .dark
    let appearance = UIToolbarAppearance()
    appearance.configureWithTransparentBackground()
    toolbar.standardAppearance = appearance
    toolbar.compactAppearance = appearance
    toolbar.scrollEdgeAppearance = appearance
    toolbar.compactScrollEdgeAppearance = appearance
    toolbar.tintColor = .label
    addSubview(toolbar)
    configureItems()
    if #available(iOS 17.0, *) {
      registerForTraitChanges([UITraitPreferredContentSizeCategory.self]) {
        (view: StackWorkoutControlsView, _: UITraitCollection) in view.configureItems()
      }
    }
  }

  private func configureItems() {
    let change = UIBarButtonItem(title: addMode ? "Add" : "Change", style: .plain, target: self, action: #selector(change))
    change.accessibilityLabel = addMode ? "Add exercise or navigate" : "Change exercise"
    let font = UIFont.preferredFont(forTextStyle: .body)
    change.setTitleTextAttributes([.font: font], for: .normal)
    let minimize = UIBarButtonItem(image: UIImage(systemName: "chevron.down"), style: .plain, target: self, action: #selector(minimize))
    minimize.accessibilityLabel = "Minimize workout"
    minimize.accessibilityHint = "Keep your workout active and return to the previous screen"
    let exit = UIBarButtonItem(image: UIImage(systemName: "xmark"), style: .plain, target: self, action: #selector(exit))
    exit.accessibilityLabel = "Exit workout"
    exit.accessibilityHint = "Ask to discard this workout"
    // UIKit renders and manages the individual Liquid Glass control surfaces.
    // The toolbar itself is transparent so it doesn't add a content card.
    for item in [change, minimize, exit] {
      if #available(iOS 26.0, *) {
        item.sharesBackground = false
        item.hidesSharedBackground = false
      }
    }
    toolbar.setItems([change, minimize, exit], animated: false)
    setNeedsLayout()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    toolbar.frame = bounds
    // Reserve space for three native controls. Grow the text control with the
    // preferred system font and report that size to Yoga instead of truncating.
    let font = UIFont.preferredFont(forTextStyle: .body)
    let title = (addMode ? "Add" : "Change") as NSString
    let titleWidth = ceil(title.size(withAttributes: [.font: font]).width)
    let size = CGSize(width: max(224, titleWidth + 164), height: max(44, ceil(font.lineHeight) + 20))
    if size != reportedSize {
      reportedSize = size
      onSizeChange(["width": size.width, "height": size.height])
    }
  }

  @objc private func change() { onChangePress() }
  @objc private func minimize() { onMinimizePress() }
  @objc private func exit() { onExitPress() }
}
