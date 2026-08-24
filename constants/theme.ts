/**
 * Single source of truth for color.
 *
 * `accent` is the only accent — named for its role, not its hue, so a color
 * change never requires a codebase-wide rename. It appears ONLY on the
 * suggested-workout signal, the active tab, and set-confirmation states.
 * Everything else is ink / surface / surfaceRaised / bone / ash / ashDim.
 *
 * These same values are mirrored into tailwind.config.js so NativeWind
 * classes and raw style objects never diverge. Change a value here and
 * update tailwind.config.js to match.
 */
export const colors = {
  ink: '#100E0C', // base background
  surface: '#1C1815', // card backgrounds
  surfaceRaised: '#262019', // nested/pressed/active elements
  accent: '#4C6FFF', // cool cobalt — THE ONLY accent color
  bone: '#F3EDE4', // primary text
  ash: '#A39C8F', // secondary/muted text
  ashDim: '#6B6459', // genuinely de-emphasized only (disabled, future/unreached days)
};

/**
 * Stack redesign tokens.
 *
 * Kept alongside the original palette while the app is migrated one screen at
 * a time. New screens should prefer these semantic neutrals and use a split
 * color only to identify a workout category or its primary action.
 */
export const redesignColors = {
  ink: '#13110E',
  surface: '#1D1915',
  raised: '#2A231C',
  hi: '#3D3228',
  bone: '#F5F0E8',
  ash: '#A99F91',
  ashDim: '#6F6558',
  border: '#3A322A',
  accent: '#FF7A3D',
};

export const splitColors = {
  chest: '#FF7A3D',
  back: '#4F8BFF',
  shoulders: '#A76FF2',
  arms: '#28C8BD',
  legs: '#B5E53F',
  core: '#FF5682',
};

/**
 * Per-day accents for the focused active-logging screen. Kept separate from
 * `splitColors` so this redesign does not recolor established app surfaces.
 */
export const workoutLoggingColors = {
  chest: splitColors.chest,
  back: splitColors.back,
  shoulders: '#F05C66',
  arms: splitColors.arms,
  legs: splitColors.legs,
  core: '#55C96B',
};

/**
 * Loaded font family names (see app/_layout.tsx font gating).
 * Switzer = all text (weight is the only variable), SpaceMono = all numbers.
 */
export const fonts = {
  heading: 'Switzer-Semibold',
  headingBold: 'Switzer-Bold',
  body: 'Switzer-Regular',
  bodyMedium: 'Switzer-Medium',
  bodySemiBold: 'Switzer-Semibold',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
};

export const redesignFonts = {
  display: 'BricolageGrotesque_700Bold',
  ui: 'HankenGrotesk_400Regular',
  uiMedium: 'HankenGrotesk_500Medium',
  uiSemiBold: 'HankenGrotesk_600SemiBold',
  uiBold: 'HankenGrotesk_700Bold',
  uiItalic: 'HankenGrotesk_400Regular_Italic',
  mono: 'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_700Bold',
};

export type AppColors = typeof colors;
export type AppFonts = typeof fonts;
export type RedesignColors = typeof redesignColors;
export type RedesignFonts = typeof redesignFonts;
