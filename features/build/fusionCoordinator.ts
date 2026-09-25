import AsyncStorage from '@react-native-async-storage/async-storage';
import { createFusionCoordinator } from './fusion';

export const fusionCoordinator = createFusionCoordinator(AsyncStorage);
