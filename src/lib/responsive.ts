/**
 * Responsive Design Utilities - Phase 2
 * Helps manage layouts across different screen sizes
 * Mobile (320px-767px), Tablet (768px-1023px), Desktop (1024px+)
 */

export const breakpoints = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

/**
 * Hook to detect current screen size
 * Returns: 'mobile' | 'tablet' | 'desktop'
 */
export function getScreenSize(width: number): 'mobile' | 'tablet' | 'desktop' {
  if (width < breakpoints.md) return 'mobile';
  if (width < breakpoints.lg) return 'tablet';
  return 'desktop';
}

/**
 * Get responsive class names based on screen width
 * Usage: cn(getResponsiveClasses('p-2', 'p-4', 'p-6'))
 */
export function getResponsiveClasses(
  mobile: string,
  tablet?: string,
  desktop?: string
): string {
  return `md:${tablet || mobile} lg:${desktop || tablet || mobile}`;
}

/**
 * Responsive grid columns
 * Mobile: 1-2 columns, Tablet: 2-3, Desktop: 3-4+
 */
export const gridClasses = {
  auto: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  auto4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  menu: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4',
  compact: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4'
};

/**
 * Responsive padding utilities
 * Scales automatically with screen size
 */
export const paddingClasses = {
  container: 'px-4 md:px-6 lg:px-8',
  card: 'p-4 md:p-5 lg:p-6',
  section: 'p-6 md:p-8 lg:p-10',
  compact: 'p-2 md:p-3 lg:p-4'
};

/**
 * Responsive typography
 */
export const textClasses = {
  h1: 'text-2xl md:text-3xl lg:text-4xl font-bold',
  h2: 'text-xl md:text-2xl lg:text-3xl font-semibold',
  h3: 'text-lg md:text-xl lg:text-2xl font-semibold',
  body: 'text-sm md:text-base lg:text-base',
  small: 'text-xs md:text-sm lg:text-sm'
};

/**
 * Responsive button sizing
 */
export const buttonClasses = {
  sm: 'px-3 py-2 text-xs md:text-sm',
  md: 'px-4 py-2 md:py-2.5 text-sm md:text-base',
  lg: 'px-5 py-3 md:py-3 text-base md:text-lg',
  xl: 'px-6 py-3 md:py-4 text-lg md:text-xl'
};

/**
 * Touch-friendly minimum heights
 * Ensures 44px minimum tap target on all devices
 */
export const touchTargetClasses = {
  button: 'h-11 md:h-10 lg:h-10',
  input: 'h-11 md:h-10 lg:h-10',
  control: 'h-9 md:h-8 lg:h-8'
};

/**
 * Responsive gap utilities for flex/grid
 */
export const gapClasses = {
  xs: 'gap-2 md:gap-3 lg:gap-4',
  sm: 'gap-3 md:gap-4 lg:gap-5',
  md: 'gap-4 md:gap-5 lg:gap-6',
  lg: 'gap-6 md:gap-8 lg:gap-10'
};

/**
 * Responsive display utilities
 * Hide/show content based on screen size
 */
export const displayClasses = {
  mobileOnly: 'block md:hidden',
  tabletOnly: 'hidden md:block lg:hidden',
  desktopOnly: 'hidden lg:block',
  mobileTablet: 'block lg:hidden',
  mobileDesktop: 'block md:hidden lg:block'
};

/**
 * Responsive width utilities for containers
 */
export const containerClasses = {
  full: 'w-full',
  narrow: 'w-full max-w-2xl mx-auto',
  medium: 'w-full max-w-4xl mx-auto',
  wide: 'w-full max-w-6xl mx-auto',
  responsive: 'w-full md:max-w-2xl lg:max-w-4xl mx-auto'
};

export default {
  breakpoints,
  getScreenSize,
  getResponsiveClasses,
  gridClasses,
  paddingClasses,
  textClasses,
  buttonClasses,
  touchTargetClasses,
  gapClasses,
  displayClasses,
  containerClasses
};
