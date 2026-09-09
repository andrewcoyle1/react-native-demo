/**
 * A route drawn as a polyline, for the map thumbnails on the activity list.
 *
 * Each leg is one view: a thin rectangle rotated to the bearing between two
 * points. It is a stand-in for real map tiles — enough to tell one route's shape
 * from another's at thumbnail size, with no mapping dependency.
 */
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export type RoutePoint = {
  /** 0-1 across the box, left to right. */
  x: number;
  /** 0-1 down the box, top to bottom. */
  y: number;
};

type RouteLineProps = {
  points: RoutePoint[];
  width: number;
  height: number;
  color: string;
  stroke?: number;
  style?: StyleProp<ViewStyle>;
};

export function RouteLine({ points, width, height, color, stroke = 2, style }: RouteLineProps) {
  const legs = points.slice(1).map((point, index) => {
    const from = points[index];
    const x1 = from.x * width;
    const y1 = from.y * height;
    const x2 = point.x * width;
    const y2 = point.y * height;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);

    return {
      length,
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      // The leg is laid out from its start point, then rotated about that end
      // rather than its middle, so consecutive legs stay joined.
      left: x1,
      top: y1 - stroke / 2,
    };
  });

  return (
    <View style={[{ width, height }, style]} pointerEvents="none">
      {legs.map((leg, index) => (
        <View
          key={index}
          style={[
            styles.leg,
            {
              left: leg.left,
              top: leg.top,
              width: leg.length,
              height: stroke,
              borderRadius: stroke / 2,
              backgroundColor: color,
              transform: [{ rotate: `${leg.angle}deg` }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  leg: {
    position: 'absolute',
    /* Rotate about the leg's starting edge, so the joins meet exactly. */
    transformOrigin: 'left center',
  },
});
