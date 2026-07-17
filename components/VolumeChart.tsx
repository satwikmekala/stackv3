import React, { useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors, fonts } from '@/constants/theme';

const CHART_HEIGHT = 140;
const BAR_GAP = 8;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Manual formatting instead of Intl so this never depends on locale support.
const formatWeekStart = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

interface VolumeChartProps {
  data: { weekStart: string; volume: number }[];
}

// Bar chart of weekly training volume. The current week (last entry) reads in
// accent; prior weeks are deliberately muted. Zero-volume weeks still draw a
// small stub so the timeline stays legible, and an all-zero history swaps in
// an inline empty state rather than a blank card.
export function VolumeChart({ data }: VolumeChartProps) {
  const [width, setWidth] = useState(0);

  const maxVolume = Math.max(...data.map((d) => d.volume), 1);
  const hasHistory = data.some((d) => d.volume > 0);
  const barWidth =
    width > 0 && data.length > 0 ? (width - BAR_GAP * (data.length - 1)) / data.length : 0;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ height: CHART_HEIGHT, justifyContent: 'flex-end' }}>
        {width > 0 && (
          <Svg width={width} height={CHART_HEIGHT}>
            {data.map((d, i) => {
              const isCurrentWeek = i === data.length - 1;
              const barHeight =
                d.volume > 0 ? Math.max((d.volume / maxVolume) * CHART_HEIGHT, 6) : 3;
              return (
                <Rect
                  key={d.weekStart}
                  x={i * (barWidth + BAR_GAP)}
                  y={CHART_HEIGHT - barHeight}
                  width={barWidth}
                  height={barHeight}
                  rx={Math.min(5, barWidth / 2, barHeight / 2)}
                  fill={
                    isCurrentWeek
                      ? colors.accent
                      : d.volume > 0
                      ? colors.ashDim
                      : colors.surfaceRaised
                  }
                />
              );
            })}
          </Svg>
        )}
        {!hasHistory && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 13,
                color: colors.ash,
                textAlign: 'center',
              }}
            >
              Complete workouts to see your{'\n'}volume build week over week
            </Text>
          </View>
        )}
      </View>
      {data.length > 0 && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.ashDim }}>
            {formatWeekStart(data[0].weekStart)}
          </Text>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.accent }}>
            This week
          </Text>
        </View>
      )}
    </View>
  );
}
