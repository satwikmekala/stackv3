import { ActionSheetIOS, Alert, Platform } from 'react-native';

type MenuAction = { title: string; onPress: () => void; destructive?: boolean };

/** Keep day/exercise menus native; Android alerts support at most 3 actions. */
export function showActions(title: string, actions: MenuAction[]) {
  if (Platform.OS === 'ios') {
    const cancelButtonIndex = actions.length;
    const destructiveButtonIndex = actions.findIndex(action => action.destructive);
    ActionSheetIOS.showActionSheetWithOptions({
      title,
      options: [...actions.map(action => action.title), 'Cancel'],
      cancelButtonIndex,
      ...(destructiveButtonIndex >= 0 ? { destructiveButtonIndex } : {}),
    }, index => actions[index]?.onPress());
  } else {
    Alert.alert(title, undefined, actions.map(action => ({
      text: action.title,
      style: action.destructive ? 'destructive' : 'default',
      onPress: action.onPress,
    })), { cancelable: true });
  }
}
