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
  exercise: WorkoutLogDetails["exercises"][0];
  previousExercise?: WorkoutLogDetails["exercises"][0];
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
  if (!previousSet) return "rgba(0, 122, 255, 0.5)"; // Blue for first time

  // For single-arm exercises
  if (
    currentSet.reps_left !== undefined &&
    currentSet.reps_right !== undefined
  ) {
    const previousLeftReps = previousSet.reps_left || 0;
    const previousRightReps = previousSet.reps_right || 0;
    const currentLeftReps = currentSet.reps_left || 0;
    const currentRightReps = currentSet.reps_right || 0;

    // Progress: Weight increase or both arms have more reps
    if (
      currentSet.weight > previousSet.weight ||
      (currentLeftReps > previousLeftReps &&
        currentRightReps > previousRightReps)
    ) {
      return "rgba(0, 122, 255, 0.5)"; // Blue
    }

    // Maintained: Same weight and reps
    if (
      currentSet.weight === previousSet.weight &&
      currentLeftReps === previousLeftReps &&
      currentRightReps === previousRightReps
    ) {
      return "rgba(52, 199, 89, 0.5)"; // Green
    }

    // Small loss: One rep less on either arm
    if (
      currentSet.weight === previousSet.weight &&
      Math.abs(currentLeftReps - previousLeftReps) <= 1 &&
      Math.abs(currentRightReps - previousRightReps) <= 1
    ) {
      return "rgba(255, 204, 0, 0.5)"; // Yellow
    }

    // Large loss: Weight decrease or 2+ reps less
    return "rgba(255, 59, 48, 0.5)"; // Red
  }

  // For regular exercises
  const currentReps = currentSet.reps || 0;
  const previousReps = previousSet.reps || 0;

  // Progress: Weight increase or more reps
  if (currentSet.weight > previousSet.weight || currentReps > previousReps) {
    return "rgba(0, 122, 255, 0.5)"; // Blue
  }

  // Maintained: Same weight and reps
  if (
    currentSet.weight === previousSet.weight &&
    currentReps === previousReps
  ) {
    return "rgba(52, 199, 89, 0.5)"; // Green
  }

  // Small loss: One rep less
  if (
    currentSet.weight === previousSet.weight &&
    previousReps - currentReps === 1
  ) {
    return "rgba(255, 204, 0, 0.5)"; // Yellow
  }

  // Large loss: Weight decrease or 2+ reps less
  return "rgba(255, 59, 48, 0.5)"; // Red
};

const ExerciseProgression: React.FC<ExerciseProgressionProps> = ({
  exercise,
  previousExercise,
}) => {
  return (
    <View style={styles.exerciseRow}>
      <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
      <View style={styles.progressionDots}>
        {exercise.sets.map((set, index) => {
          // Convert string values to numbers for comparison
          const currentSet = {
            weight: parseFloat(set.weight.toString()) || 0,
            ...(set.reps !== undefined
              ? { reps: parseInt(set.reps.toString()) || 0 }
              : {
                  reps_left: parseInt(set.reps_left?.toString() || "0"),
                  reps_right: parseInt(set.reps_right?.toString() || "0"),
                }),
          };

          const previousSet = previousExercise?.sets[index]
            ? {
                weight:
                  parseFloat(previousExercise.sets[index].weight.toString()) ||
                  0,
                ...(previousExercise.sets[index].reps !== undefined
                  ? {
                      reps: parseInt(
                        previousExercise.sets[index].reps?.toString() || "0"
                      ),
                    }
                  : {
                      reps_left: parseInt(
                        previousExercise.sets[index].reps_left?.toString() ||
                          "0"
                      ),
                      reps_right: parseInt(
                        previousExercise.sets[index].reps_right?.toString() ||
                          "0"
                      ),
                    }),
              }
            : undefined;

          return (
            <View
              key={index}
              style={[
                styles.progressionDot,
                {
                  backgroundColor: getProgressionColor(currentSet, previousSet),
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const WorkoutLogCard = ({ log }: { log: WorkoutLog }) => {
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
              }).start();
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
  }, [log.log_id, slideAnim]);

  if (!detailedLog) return null;

  const date = new Date(log.date);
  const formattedDate = date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

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
          <Text style={styles.date}>{formattedDate}</Text>
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

  useFocusEffect(
    useCallback(() => {
      loadWorkoutLogs();
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workout Tracker</Text>
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
          renderItem={({ item }) => <WorkoutLogCard log={item} />}
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
    padding: 16,
    paddingTop: 60,
    backgroundColor: "#007AFF",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
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
  date: {
    fontSize: 14,
    color: "#666",
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  exerciseName: {
    flex: 1,
    fontSize: 14,
    color: "#666",
  },
  progressionDots: {
    flexDirection: "row",
    gap: 4,
  },
  progressionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  removeButton: {
    width: TILE_WIDTH,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
  },
});
