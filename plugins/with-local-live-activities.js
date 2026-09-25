const { withEntitlementsPlist } = require('expo/config-plugins');

// expo-widgets 57 adds aps-environment even when remote updates are disabled.
// Local Live Activities do not require the APNs entitlement.
module.exports = function withLocalLiveActivities(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });
};
