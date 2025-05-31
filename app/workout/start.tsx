import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { deleteWorkout, getWorkouts } from "../utils/database";

function StartWorkout() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [workoutName, setWorkoutName] = useState(params.name as string);
  const workoutId = params.id as string;

  // Update workout name when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const updateWorkoutName = async () => {
        try {
          const workouts = await getWorkouts();
          const workout = workouts.find((w) => w.id === Number(workoutId));
          if (workout && workout.workout_name !== workoutName) {
            setWorkoutName(workout.workout_name);
          }
        } catch (error) {
          console.error("Error updating workout name:", error);
        }
      };

      updateWorkoutName();
    }, [workoutId, workoutName])
  );

  const handleStartWorkout = () => {
    router.push({
      pathname: "/workout/complete",
      params: { workoutId: workoutId, name: workoutName },
    });
  };

  const handleEditWorkout = () => {
    router.push({
      pathname: "/workout/new",
      params: { id: workoutId, name: workoutName },
    });
  };

  const handleDeleteWorkout = () => {
    Alert.alert(
      "Delete Workout",
      `Are you sure you want to delete "${workoutName}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWorkout(Number(workoutId), workoutName);
              router.back();
            } catch (error) {
              console.error("Error deleting workout:", error);
              Alert.alert(
                "Error",
                "Failed to delete workout. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>{workoutName}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.button, styles.startButton]}
          onPress={handleStartWorkout}
        >
          <Ionicons name="play" size={24} color="white" />
          <Text style={[styles.buttonText, styles.startButtonText]}>
            Start Workout
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.editButton]}
          onPress={handleEditWorkout}
        >
          <Ionicons name="create" size={24} color="#007AFF" />
          <Text style={[styles.buttonText, styles.editButtonText]}>
            Edit Workout
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleDeleteWorkout}
        >
          <Ionicons name="trash" size={24} color="#FF3B30" />
          <Text style={[styles.buttonText, styles.deleteButtonText]}>
            Delete Workout
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    padding: 16,
    paddingTop: 60,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 10,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
  },
  startButton: {
    backgroundColor: "#007AFF",
  },
  startButtonText: {
    color: "white",
  },
  editButton: {
    backgroundColor: "white",
  },
  editButtonText: {
    color: "#007AFF",
  },
  deleteButton: {
    backgroundColor: "white",
  },
  deleteButtonText: {
    color: "#FF3B30",
  },
});

export default StartWorkout;
