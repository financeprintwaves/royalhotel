import { useState, useEffect } from 'react';

/**
 * Hook to track screen size changes
 * Returns current screen size and device type
 */
export function useResponsive() {
  const [screenSize, setScreenSize] = useState<{
    width: number;
    height: number;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    isPortrait: boolean;
    isLandscape: boolean;
  }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    isMobile: true,
    isTablet: false,
    isDesktop: false,
    deviceType: 'mobile',
    isPortrait: true,
    isLandscape: false
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      
      const deviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
      const isPortrait = height > width;
      const isLandscape = width > height;

      setScreenSize({
        width,
        height,
        isMobile,
        isTablet,
        isDesktop,
        deviceType,
        isPortrait,
        isLandscape
      });
    };

    // Set initial size
    handleResize();

    // Add resize listener
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return screenSize;
}

/**
 * Hook to get responsive value based on screen size
 * Usage: const value = useResponsiveValue('mobile-value', 'tablet-value', 'desktop-value')
 */
export function useResponsiveValue<T>(
  mobile: T,
  tablet: T,
  desktop: T
): T {
  const { deviceType } = useResponsive();

  switch (deviceType) {
    case 'mobile':
      return mobile;
    case 'tablet':
      return tablet;
    case 'desktop':
      return desktop;
    default:
      return desktop;
  }
}

/**
 * Hook to check if screen matches a media query
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    
    if (media.addEventListener) {
      media.addEventListener('change', listener);
    } else {
      media.addListener(listener);
    }

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener);
      } else {
        media.removeListener(listener);
      }
    };
  }, [matches, query]);

  return matches;
}

/**
 * Hook to detect touch device
 */
export function useTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const isTouchDevice = () => {
      return (
        (typeof window !== 'undefined' &&
          ('ontouchstart' in window ||
            (navigator.maxTouchPoints && navigator.maxTouchPoints > 0))) ||
        false
      );
    };

    setIsTouch(isTouchDevice());
  }, []);

  return isTouch;
}

/**
 * Hook to handle responsive column count for grids
 */
export function useResponsiveColumns() {
  const { deviceType } = useResponsive();

  const getColumns = (preset: 'menu' | 'table' | 'gallery' | 'list') => {
    switch (preset) {
      case 'menu':
        return deviceType === 'mobile' ? 2 : deviceType === 'tablet' ? 3 : 4;
      case 'table':
        return deviceType === 'mobile' ? 1 : deviceType === 'tablet' ? 2 : 3;
      case 'gallery':
        return deviceType === 'mobile' ? 2 : deviceType === 'tablet' ? 3 : 4;
      case 'list':
        return 1;
      default:
        return 1;
    }
  };

  return {
    columns: getColumns('table'),
    getColumns,
    deviceType,
    isCompact: deviceType === 'mobile'
  };
}

export default {
  useResponsive,
  useResponsiveValue,
  useMediaQuery,
  useTouchDevice,
  useResponsiveColumns
};
