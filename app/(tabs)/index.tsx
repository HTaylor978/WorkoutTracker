import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  deleteWorkoutLog,
  getWorkoutLogDetails,
  getWorkoutLogs,
} from "../utils/database";

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

interface ExerciseProgressionProps {
  exercise: {
    exercise_id: number;
    exercise_name: string;
    single_arm: number;
    sets: Array<{
      weight: number;
      reps?: number;
      reps_left?: number;
      reps_right?: number;
    }>;
  };
  previousExercise?: {
    exercise_id: number;
    exercise_name: string;
    single_arm: number;
    sets: Array<{
      weight: number;
      reps?: number;
      reps_left?: number;
      reps_right?: number;
    }>;
  };
}

const TILE_WIDTH = Dimensions.get("window").width - 32; // Screen width minus padding

const getProgressionColor = (
  currentSet: {
    weight: number;
    reps?: number;
    reps_left?: number;
    reps_right?: number;
  },
  previousSet?: {
    weight: number;
    reps?: number;
    reps_left?: number;
    reps_right?: number;
  }
): string => {
  if (!previousSet) return "transparent";

  // For single-arm exercises
  if (
    currentSet.reps_left !== undefined &&
    currentSet.reps_right !== undefined
  ) {
    // Return transparent if either reps field is empty or zero
    if (
      !currentSet.reps_left ||
      !currentSet.reps_right ||
      currentSet.reps_left === 0 ||
      currentSet.reps_right === 0
    ) {
      return "transparent";
    }

    const currentWeight = currentSet.weight || 0;
    const currentLeftReps = currentSet.reps_left || 0;
    const currentRightReps = currentSet.reps_right || 0;
    const previousWeight = previousSet.weight || 0;
    const previousLeftReps = previousSet.reps_left || 0;
    const previousRightReps = previousSet.reps_right || 0;

    // Progress: Weight increase OR same weight with more reps
    if (currentWeight > previousWeight) {
      return "rgba(0, 122, 255, 0.5)"; // Blue
    }

    if (currentWeight === previousWeight) {
      if (
        currentLeftReps > previousLeftReps &&
        currentRightReps > previousRightReps
      ) {
        return "rgba(0, 122, 255, 0.5)"; // Blue
      }
      if (
        currentLeftReps === previousLeftReps &&
        currentRightReps === previousRightReps
      ) {
        return "rgba(52, 199, 89, 0.5)"; // Green
      }
      if (
        Math.abs(currentLeftReps - previousLeftReps) <= 1 &&
        Math.abs(currentRightReps - previousRightReps) <= 1
      ) {
        return "rgba(255, 204, 0, 0.5)"; // Yellow
      }
    }

    return "rgba(255, 59, 48, 0.5)"; // Red
  }

  // For regular exercises
  // Return transparent if reps field is empty or zero
  if (!currentSet.reps || currentSet.reps === 0) {
    return "transparent";
  }

  const currentWeight = currentSet.weight || 0;
  const currentReps = currentSet.reps || 0;
  const previousWeight = previousSet.weight || 0;
  const previousReps = previousSet.reps || 0;

  // Progress: Weight increase OR same weight with more reps
  if (currentWeight > previousWeight) {
    return "rgba(0, 122, 255, 0.5)"; // Blue
  }

  if (currentWeight === previousWeight) {
    if (currentReps > previousReps) {
      return "rgba(0, 122, 255, 0.5)"; // Blue
    }
    if (currentReps === previousReps) {
      return "rgba(52, 199, 89, 0.5)"; // Green
    }
    if (previousReps - currentReps === 1) {
      return "rgba(255, 204, 0, 0.5)"; // Yellow
    }
  }

  return "rgba(255, 59, 48, 0.5)"; // Red
};

const getUnilateralProgressionColors = (
  currentSet: {
    weight: number;
    reps_left?: number;
    reps_right?: number;
  },
  previousSet?: {
    weight: number;
    reps_left?: number;
    reps_right?: number;
  }
): { leftColor: string; rightColor: string } => {
  if (!previousSet)
    return { leftColor: "transparent", rightColor: "transparent" };

  // Return transparent if either reps field is empty or zero
  if (
    !currentSet.reps_left ||
    !currentSet.reps_right ||
    currentSet.reps_left === 0 ||
    currentSet.reps_right === 0
  ) {
    return { leftColor: "transparent", rightColor: "transparent" };
  }

  const currentWeight = currentSet.weight || 0;
  const previousWeight = previousSet.weight || 0;

  // Calculate colors for left arm
  let leftColor = "rgba(255, 59, 48, 0.5)"; // Default to red
  if (currentWeight > previousWeight) {
    leftColor = "rgba(0, 122, 255, 0.5)"; // Blue
  } else if (currentWeight === previousWeight) {
    const currentLeftReps = currentSet.reps_left || 0;
    const previousLeftReps = previousSet.reps_left || 0;

    if (currentLeftReps > previousLeftReps) {
      leftColor = "rgba(0, 122, 255, 0.5)"; // Blue
    } else if (currentLeftReps === previousLeftReps) {
      leftColor = "rgba(52, 199, 89, 0.5)"; // Green
    } else if (previousLeftReps - currentLeftReps === 1) {
      leftColor = "rgba(255, 204, 0, 0.5)"; // Yellow
    }
  }

  // Calculate colors for right arm
  let rightColor = "rgba(255, 59, 48, 0.5)"; // Default to red
  if (currentWeight > previousWeight) {
    rightColor = "rgba(0, 122, 255, 0.5)"; // Blue
  } else if (currentWeight === previousWeight) {
    const currentRightReps = currentSet.reps_right || 0;
    const previousRightReps = previousSet.reps_right || 0;

    if (currentRightReps > previousRightReps) {
      rightColor = "rgba(0, 122, 255, 0.5)"; // Blue
    } else if (currentRightReps === previousRightReps) {
      rightColor = "rgba(52, 199, 89, 0.5)"; // Green
    } else if (previousRightReps - currentRightReps === 1) {
      rightColor = "rgba(255, 204, 0, 0.5)"; // Yellow
    }
  }

  return { leftColor, rightColor };
};

const UnilateralProgressionDot: React.FC<{
  currentSet: any;
  previousSet?: any;
}> = ({ currentSet, previousSet }) => {
  const { leftColor, rightColor } = getUnilateralProgressionColors(
    currentSet,
    previousSet
  );

  return (
    <View style={styles.progressionDot}>
      <View
        style={[styles.progressionDotHalf, { backgroundColor: leftColor }]}
      />
      <View
        style={[styles.progressionDotHalf, { backgroundColor: rightColor }]}
      />
    </View>
  );
};

const ExerciseProgression: React.FC<ExerciseProgressionProps> = ({
  exercise,
  previousExercise,
}) => {
  const MAX_DOTS = 5;
  const totalSets = exercise.sets.length;
  const setsToShow = Math.min(totalSets, MAX_DOTS);

  // Create an array of the first MAX_DOTS sets
  const displaySets = exercise.sets.slice(0, setsToShow);
  // Get corresponding previous sets
  const displayPreviousSets = previousExercise?.sets.slice(0, setsToShow) || [];

  return (
    <View style={styles.exerciseRow}>
      <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
      <View style={styles.progressionContainer}>
        <View style={styles.progressionDots}>
          {displaySets.map((set, index) => {
            const previousSet = displayPreviousSets[index];
            if (exercise.single_arm === 1) {
              return (
                <UnilateralProgressionDot
                  key={index}
                  currentSet={set}
                  previousSet={previousSet}
                />
              );
            }
            const currentSet = {
              weight: set.weight,
              reps: set.reps || undefined,
            };
            return (
              <View
                key={index}
                style={[
                  styles.progressionDot,
                  {
                    backgroundColor: getProgressionColor(
                      currentSet,
                      previousSet
                    ),
                  },
                ]}
              />
            );
          })}
        </View>
        {totalSets > MAX_DOTS && (
          <Text style={styles.additionalSets}>+{totalSets - MAX_DOTS}</Text>
        )}
      </View>
    </View>
  );
};

const WorkoutLogCard = ({
  log,
  onDelete,
}: {
  log: WorkoutLog;
  onDelete: (logId: number) => void;
}) => {
  const [detailedLog, setDetailedLog] = useState<WorkoutLogDetails | null>(
    null
  );
  const [previousLog, setPreviousLog] = useState<WorkoutLogDetails | null>(
    null
  );
  const [slideAnim] = useState(new Animated.Value(0));
  const [isDeleting, setIsDeleting] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        // Get current log details
        const details = await getWorkoutLogDetails(log.log_id);
        setDetailedLog(details as WorkoutLogDetails);

        // Get previous log details
        const previousLogs = (await getWorkoutLogs()) as WorkoutLog[];
        const currentLogIndex = previousLogs.findIndex(
          (l) => l.log_id === log.log_id
        );
        if (currentLogIndex < previousLogs.length - 1) {
          const prevLog = await getWorkoutLogDetails(
            previousLogs[currentLogIndex + 1].log_id
          );
          setPreviousLog(prevLog as WorkoutLogDetails);
        }
      } catch (error) {
        console.error("Error loading workout log details:", error);
      }
    };

    loadDetails();
  }, [log.log_id]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Workout Log",
      "Are you sure you want to delete this workout log?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteWorkoutLog(log.log_id);
              Animated.timing(slideAnim, {
                toValue: -400,
                duration: 300,
                useNativeDriver: true,
              }).start(() => {
                // Call the onDelete callback after animation completes
                onDelete(log.log_id);
              });
            } catch (error) {
              console.error("Error deleting workout log:", error);
              Alert.alert("Error", "Failed to delete workout log");
              setIsDeleting(false);
              listRef.current?.scrollToOffset({ offset: 0, animated: true });
            }
          },
        },
      ]
    );
  }, [log.log_id, slideAnim, onDelete]);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  if (!detailedLog) return null;

  const formattedDate = formatDateTime(log.date);
  const duration = calculateDuration(log.start_time, log.end_time);

  const mainContent = (
    <Link
      href={{
        pathname: "/workout/complete",
        params: {
          logId: log.log_id,
        },
      }}
      asChild
    >
      <TouchableOpacity style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.workoutName}>{log.workout_name}</Text>
          <View style={styles.dateTimeContainer}>
            <Text style={styles.date}>{formattedDate}</Text>
            <Text style={styles.duration}>{duration}</Text>
          </View>
        </View>
        {detailedLog.exercises.map((exercise, index) => (
          <ExerciseProgression
            key={`${exercise.exercise_id}-${index}`}
            exercise={exercise}
            previousExercise={previousLog?.exercises.find(
              (e) => e.exercise_id === exercise.exercise_id
            )}
          />
        ))}
      </TouchableOpacity>
    </Link>
  );

  const deleteButton = (
    <TouchableOpacity style={styles.removeButton} onPress={handleDelete}>
      <Ionicons name="trash-outline" size={24} color="white" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.workoutCard}>
      <ScrollView
        ref={listRef as any}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        scrollEnabled={!isDeleting}
        snapToInterval={TILE_WIDTH}
        decelerationRate="fast"
        style={styles.cardScroll}
      >
        {mainContent}
        {deleteButton}
      </ScrollView>
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);

  const loadWorkoutLogs = async () => {
    try {
      console.log("Loading workout logs...");
      const logs = (await getWorkoutLogs()) as WorkoutLog[];
      console.log("Fetched workout logs:", logs);
      setWorkoutLogs(logs);
    } catch (error) {
      console.error("Error loading workout logs:", error);
      Alert.alert("Error", "Failed to load workout logs");
    }
  };

  const handleDeleteWorkoutLog = (logId: number) => {
    setWorkoutLogs((currentLogs) =>
      currentLogs.filter((log) => log.log_id !== logId)
    );
  };

  useFocusEffect(
    useCallback(() => {
      loadWorkoutLogs();
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workouts</Text>
        <Link href="/workout/select" asChild>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </Link>
      </View>
      <View style={styles.content}>
        <Text style={styles.subtitle}>Recent Workouts</Text>
        <FlatList
          data={workoutLogs}
          renderItem={({ item }) => (
            <WorkoutLogCard log={item} onDelete={handleDeleteWorkoutLog} />
          )}
          keyExtractor={(item) => item.log_id.toString()}
          contentContainerStyle={styles.workoutList}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No completed workouts yet. Tap the + button to start a new
                workout!
              </Text>
            </View>
          )}
        />
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
    justifyContent: "space-between",
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  workoutList: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  workoutCard: {
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: "hidden",
  },
  cardScroll: {
    flexGrow: 0,
  },
  cardContent: {
    width: TILE_WIDTH,
    backgroundColor: "white",
    padding: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  dateTimeContainer: {
    alignItems: "flex-end",
  },
  date: {
    fontSize: 14,
    color: "#666",
  },
  duration: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  exerciseName: {
    flex: 1,
    fontSize: 14,
    color: "#666",
  },
  progressionContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressionDots: {
    flexDirection: "row",
    gap: 4,
  },
  progressionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    flexDirection: "row",
  },
  progressionDotHalf: {
    width: 4,
    height: 8,
    backgroundColor: "transparent",
  },
  additionalSets: {
    marginLeft: 8,
    fontSize: 12,
    color: "#666",
  },
  removeButton: {
    width: TILE_WIDTH,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
  },
});
