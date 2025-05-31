import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Link, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getWorkoutLogs } from "../utils/database";

interface WorkoutLog {
  log_id: number;
  workout_id: number;
  workout_name: string;
  date: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);

  const loadWorkoutLogs = async () => {
    try {
      const logs = (await getWorkoutLogs()) as WorkoutLog[];
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderWorkoutLog = ({ item }: { item: WorkoutLog }) => (
    <TouchableOpacity
      style={styles.workoutCard}
      onPress={() =>
        router.push({
          pathname: "/workout/complete",
          params: {
            name: item.workout_name,
            workoutId: item.workout_id,
            logId: item.log_id,
          },
        })
      }
    >
      <View style={styles.workoutCardContent}>
        <Text style={styles.workoutName}>{item.workout_name}</Text>
        <Text style={styles.workoutDate}>{formatDate(item.date)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#999" />
    </TouchableOpacity>
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
          renderItem={renderWorkoutLog}
          keyExtractor={(item) => item.log_id.toString()}
          contentContainerStyle={styles.workoutList}
          showsVerticalScrollIndicator={false}
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
  workoutCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  workoutCardContent: {
    flex: 1,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  workoutDate: {
    fontSize: 14,
    color: "#666",
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
});
