import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Responsive Grid Component
 * Automatically adjusts columns based on screen size
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: 'auto' | 'auto4' | 'menu' | 'compact' | 'custom';
  customCols?: string;
  gap?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  cols = 'auto',
  customCols,
  gap = 'md',
  className
}) => {
  const gapMap = {
    xs: 'gap-2 md:gap-3 lg:gap-4',
    sm: 'gap-3 md:gap-4 lg:gap-5',
    md: 'gap-4 md:gap-5 lg:gap-6',
    lg: 'gap-6 md:gap-8 lg:gap-10'
  };

  const colsMap = {
    auto: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    auto4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    menu: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    compact: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2',
    custom: customCols || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  };

  return (
    <div
      className={cn(
        'grid',
        colsMap[cols],
        gapMap[gap],
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * Responsive Container Component
 * Centers content with responsive max-width
 */
interface ResponsiveContainerProps {
  children: React.ReactNode;
  size?: 'narrow' | 'medium' | 'wide' | 'responsive' | 'full';
  className?: string;
  padding?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  size = 'responsive',
  className,
  padding = true
}) => {
  const sizeMap = {
    full: 'w-full',
    narrow: 'w-full max-w-2xl mx-auto',
    medium: 'w-full max-w-4xl mx-auto',
    wide: 'w-full max-w-6xl mx-auto',
    responsive: 'w-full md:max-w-2xl lg:max-w-4xl mx-auto'
  };

  const paddingClasses = padding ? 'px-4 md:px-6 lg:px-8' : '';

  return (
    <div className={cn(sizeMap[size], paddingClasses, className)}>
      {children}
    </div>
  );
};

/**
 * Responsive Card Component
 * Card with responsive padding and rounded corners
 */
interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  className,
  hover = false
}) => {
  return (
    <div
      className={cn(
        'bg-card text-card-foreground rounded-lg md:rounded-xl border border-border',
        'p-4 md:p-5 lg:p-6',
        'transition-all duration-200',
        hover && 'hover:shadow-lg hover:scale-105',
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * Responsive Flex Component
 * Flex container with responsive spacing
 */
interface ResponsiveFlexProps {
  children: React.ReactNode;
  direction?: 'row' | 'col' | 'responsive';
  gap?: 'xs' | 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  className?: string;
  wrap?: boolean;
}

export const ResponsiveFlex: React.FC<ResponsiveFlexProps> = ({
  children,
  direction = 'row',
  gap = 'md',
  align = 'center',
  justify = 'start',
  className,
  wrap = false
}) => {
  const directionMap = {
    row: 'flex-row',
    col: 'flex-col',
    responsive: 'flex-col md:flex-row'
  };

  const gapMap = {
    xs: 'gap-2 md:gap-3 lg:gap-4',
    sm: 'gap-3 md:gap-4 lg:gap-5',
    md: 'gap-4 md:gap-5 lg:gap-6',
    lg: 'gap-6 md:gap-8 lg:gap-10'
  };

  const alignMap = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  };

  const justifyMap = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around'
  };

  return (
    <div
      className={cn(
        'flex',
        directionMap[direction],
        gapMap[gap],
        alignMap[align],
        justifyMap[justify],
        wrap && 'flex-wrap',
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * Responsive Button Group
 * Group buttons with responsive spacing
 */
interface ResponsiveButtonGroupProps {
  children: React.ReactNode;
  vertical?: boolean;
  className?: string;
}

export const ResponsiveButtonGroup: React.FC<ResponsiveButtonGroupProps> = ({
  children,
  vertical = false,
  className
}) => {
  return (
    <div
      className={cn(
        'flex',
        vertical ? 'flex-col' : 'flex-row md:flex-row flex-wrap',
        'gap-2 md:gap-3 lg:gap-4',
        className
      )}
    >
      {children}
    </div>
  );
};

export default {
  ResponsiveGrid,
  ResponsiveContainer,
  ResponsiveCard,
  ResponsiveFlex,
  ResponsiveButtonGroup
};
