declare module "react-native-svg-charts" {
  import { ReactNode } from "react";
  import { ViewStyle } from "react-native";

  interface ContentInset {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  }

  interface ChartProps {
    data: (number | null)[];
    style?: ViewStyle;
    contentInset?: ContentInset;
    svg?: any;
    children?: ReactNode;
  }

  interface YAxisProps {
    data: number[];
    contentInset?: ContentInset;
    svg?: any;
    numberOfTicks?: number;
    formatLabel?: (value: number) => string;
  }

  export class LineChart extends React.Component<ChartProps> {}
  export class YAxis extends React.Component<YAxisProps> {}
  export class Grid extends React.Component<any> {}
}
