// Keep UIKit in control of the native tab bar's visibility. Fading it through
// a view inside Train can leave it hidden while that screen is frozen beneath
// the workout modal, including during the minimize animation back to Train.
export function HomeTabBarDeparture() {
  return null;
}
