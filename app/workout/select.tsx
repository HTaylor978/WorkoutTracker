import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getWorkouts } from "../utils/database";

interface Workout {
  id: number;
  workout_name: string;
}

const SCREEN_PADDING = 16;
const GRID_GAP = 16;
const ITEMS_PER_ROW = 2;

function SelectWorkout() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const router = useRouter();

  useEffect(() => {
    const loadWorkouts = async () => {
      try {
        const savedWorkouts = (await getWorkouts()) as Workout[];
        setWorkouts(savedWorkouts);
      } catch (error) {
        console.error("Error loading workouts:", error);
      }
    };

    loadWorkouts();
  }, []);

  // Calculate item width based on screen width
  const screenWidth = Dimensions.get("window").width;
  const itemWidth =
    (screenWidth - SCREEN_PADDING * 2 - GRID_GAP) / ITEMS_PER_ROW;

  return (
    <View style={styles.container}>
      {/* Top Bar with back button */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Select Workout</Text>
      </View>

      {/* Workout Grid */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.gridContainer}
      >
        {/* Create New Workout Button */}
        <Link href="/workout/new" asChild>
          <TouchableOpacity
            style={[
              styles.workoutItem,
              styles.createWorkoutItem,
              { width: itemWidth, height: itemWidth },
            ]}
          >
            <Ionicons name="add" size={32} color="#007AFF" />
            <Text style={styles.createWorkoutText}>Create Workout</Text>
          </TouchableOpacity>
        </Link>

        {/* Existing Workouts */}
        {workouts.map((workout) => (
          <TouchableOpacity
            key={workout.id}
            style={[
              styles.workoutItem,
              { width: itemWidth, height: itemWidth },
            ]}
            onPress={() => {
              // Navigate to workout detail/start page
            }}
          >
            <Text style={styles.workoutName}>{workout.workout_name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default SelectWorkout;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    padding: SCREEN_PADDING,
    paddingTop: 60, // Account for status bar
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
  },
  scrollContainer: {
    flex: 1,
  },
  gridContainer: {
    padding: SCREEN_PADDING,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  workoutItem: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  createWorkoutItem: {
    borderWidth: 2,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },
  createWorkoutText: {
    marginTop: 8,
    fontSize: 16,
    color: "#007AFF",
    textAlign: "center",
  },
  workoutName: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
