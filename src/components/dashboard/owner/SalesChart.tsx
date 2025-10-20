import React, { useMemo } from 'react';
import { View, Text, LayoutChangeEvent } from 'react-native';
import { Svg, Path, Line, Circle, G } from 'react-native-svg';
import { Card } from '@/src/components';
import { useTheme, text, space } from '@/src/theme';

type Point = { x: number; y: number };
const pad = 16;

export default function SalesChart({
  series,
  title = 'Sales',
}: {
  series: Array<{ date: string; sales_usd: number; tx: number }>;
  title?: string;
}) {
  const { theme: t } = useTheme();
  const [size, setSize] = React.useState({ w: 320, h: 180 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    setSize({ w: width, h: 200 });
  };

  const { points, maxY } = useMemo(() => {
    const w = Math.max(size.w - pad * 2, 10);
    const h = Math.max(size.h - pad * 2, 10);
    const max = Math.max(...series.map(s => s.sales_usd), 1);
    const step = w / Math.max(series.length - 1, 1);
    const pts: Point[] = series.map((s, i) => ({
      x: pad + i * step,
      y: pad + (1 - (s.sales_usd / max)) * h,
    }));
    return { points: pts, maxY: max };
  }, [series, size]);

  const path = useMemo(() => {
    if (!points.length) return '';
    return points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  }, [points]);

  return (
    <Card onLayout={onLayout}>
      <Text style={text('h3', t.colors.textPrimary)}>{title}</Text>
      <View style={{ height: space.xs }} />
      {!series.length ? (
        <Text style={text('bodySm', t.colors.textSecondary)}>No data in range</Text>
      ) : (
        <Svg width="100%" height={size.h}>
          {/* axes */}
          <G stroke={t.colors.border}>
            <Line x1={pad} y1={size.h - pad} x2={size.w - pad} y2={size.h - pad} />
            <Line x1={pad} y1={pad} x2={pad} y2={size.h - pad} />
          </G>

          {/* sales line */}
          <Path d={path} stroke={t.colors.primary.base} strokeWidth={2} fill="none" />

          {/* tx markers */}
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={3} fill={t.colors.primary.base} />
          ))}
        </Svg>
      )}
      <View style={{ height: space.xs }} />
      <Text style={text('caption', t.colors.textSecondary)}>
        Max: ${maxY.toFixed(2)} • Points: {series.length}
      </Text>
    </Card>
  );
}
