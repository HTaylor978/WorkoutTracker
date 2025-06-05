import { Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  GestureResponderEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Circle, Text as SVGText } from "react-native-svg";
import { Grid, LineChart, YAxis } from "react-native-svg-charts";
import { getWorkoutLogDetails, getWorkoutLogs } from "../utils/database";

interface ExerciseData {
  dates: string[];
  weights: (number | null)[];
  originalDates: Date[];
}

type TimeRange = "week" | "month" | "6months" | "all";

interface ChartDecorator {
  x: (index: number) => number;
  y: (value: number) => number;
  data: (number | null)[];
}

interface ChartLabels extends ChartDecorator {
  dates: string[];
}

interface WorkoutLog {
  log_id: number;
  workout_id: number;
  workout_name: string;
  date: string;
  start_time: string;
  end_time: string;
}

interface WorkoutLogDetails {
  log_id: number;
  date: string;
  workout_id: number;
  workout_name: string;
  exercises: Array<{
    exercise_id: number;
    exercise_name: string;
    single_arm: number;
    sets: Array<{
      weight: number;
      reps?: number;
      reps_left?: number;
      reps_right?: number;
    }>;
  }>;
}

interface DecoratorProps {
  x: (index: number) => number;
  y: (value: number) => number;
  data: (number | null)[];
}

interface LabelsProps extends DecoratorProps {
  dates: string[];
}

interface XAxisProps {
  data: (number | null)[];
  dates: string[];
  x: (index: number) => number;
}

export default function StatsScreen() {
  const params = useLocalSearchParams<{
    selectedExerciseId?: string;
    selectedExerciseName?: string;
  }>();
  const [selectedExercise, setSelectedExercise] = useState<{
    id?: string;
    name?: string;
  }>({});
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [dateOffset, setDateOffset] = useState(0);
  const [allExerciseData, setAllExerciseData] = useState<ExerciseData>({
    dates: [],
    weights: [],
    originalDates: [],
  });
  const [displayData, setDisplayData] = useState<ExerciseData>({
    dates: [],
    weights: [],
    originalDates: [],
  });

  // Restore exercise selection handling from URL parameters
  useEffect(() => {
    console.log("URL params changed:", params);
    if (params.selectedExerciseId && params.selectedExerciseName) {
      console.log("Setting selected exercise from params:", {
        id: params.selectedExerciseId,
        name: params.selectedExerciseName,
      });
      setSelectedExercise({
        id: params.selectedExerciseId,
        name: params.selectedExerciseName,
      });
    }
  }, [params.selectedExerciseId, params.selectedExerciseName]);

  // Function to format date as DD/MM
  const formatDate = (date: Date): string => {
    return `${date.getDate().toString().padStart(2, "0")}/${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}`;
  };

  // Function to generate date range array
  const generateDateRange = (range: TimeRange, offset: number): Date[] => {
    const now = new Date();
    const dates: Date[] = [];
    let daysToShow = 7;

    switch (range) {
      case "week":
        daysToShow = 7;
        break;
      case "month":
        daysToShow = 30;
        break;
      case "6months":
        daysToShow = 185;
        break;
      case "all":
        return []; // For all-time view, we'll use actual data points
    }

    // Calculate end date based on offset
    const endDate = new Date();
    endDate.setDate(now.getDate() + offset * daysToShow);

    // Generate dates array
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(endDate.getDate() - i);
      dates.push(date);
    }

    return dates;
  };

  // Function to filter and align data with date range
  const filterDataByTimeRange = (
    data: ExerciseData,
    range: TimeRange,
    offset: number
  ) => {
    if (range === "all") {
      return data;
    }

    const dateRange = generateDateRange(range, offset);
    const result: ExerciseData = {
      dates: [],
      weights: [],
      originalDates: dateRange,
    };

    // Map each date in the range to either a data point or null
    dateRange.forEach((date) => {
      const dateStr = formatDate(date);
      result.dates.push(dateStr);

      // Find matching data point
      const matchingIndex = data.originalDates.findIndex(
        (d) =>
          d.getDate() === date.getDate() &&
          d.getMonth() === date.getMonth() &&
          d.getFullYear() === date.getFullYear()
      );

      if (matchingIndex !== -1) {
        result.weights.push(data.weights[matchingIndex]);
      } else {
        result.weights.push(null);
      }
    });

    return result;
  };

  // Function to split data into segments at null values
  const splitDataAtNulls = (data: ExerciseData) => {
    const segments: Array<{ dates: string[]; weights: number[] }> = [];
    let currentSegment: { dates: string[]; weights: number[] } = {
      dates: [],
      weights: [],
    };

    data.weights.forEach((weight, index) => {
      if (weight === null) {
        if (currentSegment.dates.length > 0) {
          segments.push(currentSegment);
          currentSegment = { dates: [], weights: [] };
        }
      } else {
        currentSegment.dates.push(data.dates[index]);
        currentSegment.weights.push(weight);
      }
    });

    if (currentSegment.dates.length > 0) {
      segments.push(currentSegment);
    }

    return segments;
  };

  // Load exercise data
  useEffect(() => {
    const loadExerciseData = async () => {
      if (!selectedExercise.id) return;

      try {
        console.log("Loading exercise data for ID:", selectedExercise.id);
        const logs = (await getWorkoutLogs()) as WorkoutLog[];
        console.log("Found workout logs:", logs.length);
        const exerciseData: ExerciseData = {
          dates: [],
          weights: [],
          originalDates: [],
        };

        // Process each log to find the exercise data
        for (const log of logs) {
          const details = (await getWorkoutLogDetails(
            log.log_id
          )) as WorkoutLogDetails;
          const exercise = details.exercises.find(
            (e) => e.exercise_id === Number(selectedExercise.id)
          );

          if (exercise && exercise.sets.length > 0) {
            const maxWeight = Math.max(
              ...exercise.sets.map((set) => set.weight || 0)
            );

            if (maxWeight > 0) {
              const date = new Date(log.date);
              exerciseData.originalDates.push(date);
              exerciseData.dates.push(formatDate(date));
              exerciseData.weights.push(maxWeight);
            }
          }
        }

        // Sort the data by date
        const sortedIndices = exerciseData.originalDates
          .map((_, index) => index)
          .sort(
            (a, b) =>
              exerciseData.originalDates[a].getTime() -
              exerciseData.originalDates[b].getTime()
          );

        const sortedData = {
          dates: sortedIndices.map((i) => exerciseData.dates[i]),
          weights: sortedIndices.map((i) => exerciseData.weights[i]),
          originalDates: sortedIndices.map(
            (i) => exerciseData.originalDates[i]
          ),
        };

        setAllExerciseData(sortedData);
        const filtered = filterDataByTimeRange(
          sortedData,
          timeRange,
          dateOffset
        );
        setDisplayData(filtered);
      } catch (error) {
        console.error("Error loading exercise data:", error);
      }
    };

    loadExerciseData();
  }, [selectedExercise.id]);

  // Update display data when time range or offset changes
  useEffect(() => {
    const filtered = filterDataByTimeRange(
      allExerciseData,
      timeRange,
      dateOffset
    );
    setDisplayData(filtered);
  }, [timeRange, dateOffset, allExerciseData]);

  // Handle swipe gestures
  const [touchStart, setTouchStart] = useState(0);
  const handleTouchStart = (event: GestureResponderEvent) => {
    setTouchStart(event.nativeEvent.locationX);
  };

  const handleTouchEnd = (event: GestureResponderEvent) => {
    const touchEnd = event.nativeEvent.locationX;
    const swipeDistance = touchEnd - touchStart;

    if (Math.abs(swipeDistance) > 50) {
      // Minimum swipe distance
      if (swipeDistance > 0) {
        // Swipe right - show previous period
        setDateOffset((prev) => prev - 1);
      } else {
        // Swipe left - show next period
        setDateOffset((prev) => prev + 1);
      }
    }
  };

  const renderChart = () => {
    if (!selectedExercise.name || displayData.dates.length === 0) return null;

    // Filter out null values for YAxis but keep them for LineChart
    const yAxisData = displayData.weights.filter(
      (w): w is number => w !== null
    );

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Weight Progression</Text>
        <Text style={styles.debugText}>Data points: {yAxisData.length}</Text>
        <View style={styles.chartWrapper}>
          <View
            style={{ flexDirection: "row", height: 200, paddingVertical: 16 }}
          >
            <YAxis
              data={yAxisData}
              contentInset={{ top: 20, bottom: 20 }}
              svg={{ fontSize: 10, fill: "black" }}
              numberOfTicks={5}
              formatLabel={(value) => `${value}kg`}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <LineChart
                style={{ flex: 1 }}
                data={displayData.weights}
                contentInset={{ top: 20, bottom: 20, left: 10, right: 10 }}
                svg={{ stroke: "#007AFF", strokeWidth: 2 }}
              >
                {
                  (({
                    x,
                    y,
                  }: {
                    x: (i: number) => number;
                    y: (v: number) => number;
                  }) => (
                    <>
                      <Grid />
                      {displayData.weights.map((value, index) => {
                        if (value === null) return null;
                        return (
                          <React.Fragment key={index}>
                            <Circle
                              cx={x(index)}
                              cy={y(value)}
                              r={4}
                              stroke={"#007AFF"}
                              fill={"white"}
                              strokeWidth={2}
                            />
                            <SVGText
                              x={x(index)}
                              y={y(value) - 10}
                              fontSize={12}
                              fill={"black"}
                              alignmentBaseline={"middle"}
                              textAnchor={"middle"}
                            >
                              {value}
                            </SVGText>
                          </React.Fragment>
                        );
                      })}
                      {displayData.dates.map((date, index) => (
                        <SVGText
                          key={index}
                          x={x(index)}
                          y={Dimensions.get("window").height * 0.25 + 20}
                          fontSize={10}
                          fill={"black"}
                          alignmentBaseline={"middle"}
                          textAnchor={"middle"}
                        >
                          {date}
                        </SVGText>
                      ))}
                    </>
                  )) as unknown as React.ReactNode
                }
              </LineChart>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Statistics</Text>
      </View>
      <View style={styles.content}>
        {selectedExercise.name ? (
          <View style={styles.selectedExercise}>
            <Text style={styles.exerciseName}>{selectedExercise.name}</Text>
            <Link
              href={{
                pathname: "/exercise/select",
                params: { fromStats: "true" },
              }}
              asChild
            >
              <TouchableOpacity style={styles.changeButton}>
                <Text style={styles.changeButtonText}>Change</Text>
              </TouchableOpacity>
            </Link>
          </View>
        ) : (
          <Link
            href={{
              pathname: "/exercise/select",
              params: { fromStats: "true" },
            }}
            asChild
          >
            <TouchableOpacity style={styles.selectButton}>
              <Ionicons name="barbell-outline" size={24} color="#007AFF" />
              <Text style={styles.selectButtonText}>Select Exercise</Text>
            </TouchableOpacity>
          </Link>
        )}

        {selectedExercise.name && (
          <View style={styles.timeRangeContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.timeRangeButton,
                  timeRange === "week" && styles.timeRangeButtonActive,
                ]}
                onPress={() => {
                  setTimeRange("week");
                  setDateOffset(0);
                }}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    timeRange === "week" && styles.timeRangeTextActive,
                  ]}
                >
                  Last Week
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.timeRangeButton,
                  timeRange === "month" && styles.timeRangeButtonActive,
                ]}
                onPress={() => {
                  setTimeRange("month");
                  setDateOffset(0);
                }}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    timeRange === "month" && styles.timeRangeTextActive,
                  ]}
                >
                  Last Month
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.timeRangeButton,
                  timeRange === "6months" && styles.timeRangeButtonActive,
                ]}
                onPress={() => {
                  setTimeRange("6months");
                  setDateOffset(0);
                }}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    timeRange === "6months" && styles.timeRangeTextActive,
                  ]}
                >
                  Last 6 Months
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.timeRangeButton,
                  timeRange === "all" && styles.timeRangeButtonActive,
                ]}
                onPress={() => {
                  setTimeRange("all");
                  setDateOffset(0);
                }}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    timeRange === "all" && styles.timeRangeTextActive,
                  ]}
                >
                  All Time
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {renderChart()}

        {selectedExercise.name && displayData.dates.length === 0 && (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>
              No data available for this exercise in the selected time range.
            </Text>
            <Text style={styles.noDataSubtext}>
              Complete a workout with this exercise to see your progress.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    padding: 16,
    paddingTop: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    marginLeft: 12,
  },
  selectedExercise: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  timeRangeContainer: {
    marginBottom: 16,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  timeRangeButtonActive: {
    backgroundColor: "#007AFF",
  },
  timeRangeText: {
    fontSize: 14,
    color: "#666",
  },
  timeRangeTextActive: {
    color: "white",
    fontWeight: "600",
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  changeButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  changeButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  chartContainer: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  chartWrapper: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  overlappingChart: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  debugText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
});
