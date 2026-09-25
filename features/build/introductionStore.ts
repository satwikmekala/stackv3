import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBuildIntroduction } from './introduction';

/** The one introduction state shared by Home and Build entry, so a dismissal reaches Home without a re-read. */
export const buildIntroduction = createBuildIntroduction(AsyncStorage);
