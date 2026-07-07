import React from 'react';

/**
 * Единый скелетон-плейсхолдер для всей платформы.
 * Используется вместо текстовых «Загрузка…».
 *
 * <Skeleton />                        — одна строка
 * <Skeleton w={120} h={16} />         — произвольный размер
 * <Skeleton.Text lines={3} />         — несколько строк текста
 * <Skeleton.List rows={4} />          — список карточек-строк
 */

type SkeletonProps = {
  /** ширина: число (px) или CSS-значение ('60%') */
  w?: number | string;
  /** высота в px */
  h?: number;
  /** радиус скругления */
  radius?: number;
  /** circle-плейсхолдер (аватар) */
  circle?: boolean;
  style?: React.CSSProperties;
  className?: string;
};

function SkeletonBase({ w = '100%', h = 14, radius, circle, style, className }: SkeletonProps) {
  const size = circle ? (typeof w === 'number' ? w : h) : undefined;
  return (
    <span
      aria-hidden
      className={`skeleton${className ? ` ${className}` : ''}`}
      style={{
        display: 'block',
        width: circle ? size : w,
        height: circle ? size : h,
        borderRadius: circle ? '50%' : (radius ?? 8),
        ...style,
      }}
    />
  );
}

/** Несколько строк текста, последняя — короче. */
function SkeletonText({ lines = 3, gap = 8, style }: { lines?: number; gap?: number; style?: React.CSSProperties }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase key={i} w={i === lines - 1 ? '55%' : '100%'} h={13} />
      ))}
    </span>
  );
}

/** Список карточек-строк (аватар + две строки). */
function SkeletonList({ rows = 4, gap = 12, style }: { rows?: number; gap?: number; style?: React.CSSProperties }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {Array.from({ length: rows }).map((_, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SkeletonBase circle w={40} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            <SkeletonBase w="45%" h={13} />
            <SkeletonBase w="70%" h={11} />
          </span>
        </span>
      ))}
    </span>
  );
}

export const Skeleton = Object.assign(SkeletonBase, {
  Text: SkeletonText,
  List: SkeletonList,
});

export default Skeleton;
