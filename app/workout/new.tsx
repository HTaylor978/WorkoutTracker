import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  addExerciseToWorkout,
  addWorkout,
  createWorkoutTable,
  getWorkoutExercises,
  updateWorkout,
} from "../utils/database";

interface Exercise {
  id: number;
  exercise_name: string;
}

interface WorkoutExercise {
  id: number;
  name: string;
  sets: number;
  singleArm: boolean;
}

function CreateWorkout() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isEditing = Boolean(params.id);

  const [workoutName, setWorkoutName] = useState(params.name?.toString() || "");
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);

  // Load existing workout data if editing
  useEffect(() => {
    if (isEditing) {
      const loadWorkoutExercises = async () => {
        try {
          const workoutExercises = await getWorkoutExercises(
            params.name as string
          );
          setExercises(
            workoutExercises.map((exercise: any) => ({
              id: exercise.id,
              name: exercise.exercise_name,
              sets: exercise.sets_per_exercise,
              singleArm: Boolean(exercise.single_arm),
            }))
          );
        } catch (error) {
          console.error("Error loading workout exercises:", error);
          Alert.alert("Error", "Failed to load workout exercises");
        }
      };

      loadWorkoutExercises();
    }
  }, [isEditing, params.name]);

  // Handle selected exercise from selection screen
  useEffect(() => {
    if (!params.selectedExerciseId || !params.selectedExerciseName) return;

    const exerciseId = parseInt(params.selectedExerciseId as string);
    const exerciseName = params.selectedExerciseName as string;

    // Check if exercise already exists
    const exerciseExists = exercises.some((e) => e.id === exerciseId);
    if (exerciseExists) {
      Alert.alert(
        "Exercise Already Added",
        `${exerciseName} is already in this workout.`
      );
      return;
    }

    // Add the exercise
    setExercises((prevExercises) => [
      ...prevExercises,
      {
        id: exerciseId,
        name: exerciseName,
        sets: 3, // Default to 3 sets
        singleArm: false,
      },
    ]);

    // Clear the params after adding the exercise
    router.setParams({
      selectedExerciseId: undefined,
      selectedExerciseName: undefined,
    });
  }, [params.selectedExerciseId, params.selectedExerciseName, exercises]);

  // Load available exercises when modal opens
  const handleOpenExerciseModal = () => {
    router.push({
      pathname: "/exercise/select",
      params: {
        path: "/workout/new",
      },
    });
  };

  const handleAddExercise = (exercise: Exercise) => {
    setExercises([
      ...exercises,
      {
        id: exercise.id,
        name: exercise.exercise_name,
        sets: 3, // Default to 3 sets
        singleArm: false,
      },
    ]);
    setShowExerciseModal(false);
  };

  const handleUpdateSets = (index: number, increment: boolean) => {
    const updatedExercises = [...exercises];
    if (increment) {
      updatedExercises[index].sets += 1;
    } else if (updatedExercises[index].sets > 1) {
      updatedExercises[index].sets -= 1;
    }
    setExercises(updatedExercises);
  };

  const handleToggleSingleArm = (index: number) => {
    const updatedExercises = [...exercises];
    updatedExercises[index].singleArm = !updatedExercises[index].singleArm;
    setExercises(updatedExercises);
  };

  const handleSaveWorkout = async () => {
    if (!workoutName.trim()) return;

    try {
      if (isEditing) {
        // Update existing workout
        await updateWorkout(
          Number(params.id),
          params.name as string,
          workoutName,
          exercises.map((e) => ({
            id: e.id,
            sets: e.sets,
            singleArm: e.singleArm,
          }))
        );
      } else {
        // Create new workout
        const workoutId = await addWorkout(workoutName);
        await createWorkoutTable(workoutName);

        // Add exercises to the workout
        for (const exercise of exercises) {
          await addExerciseToWorkout(
            workoutName,
            exercise.id,
            exercise.sets,
            exercise.singleArm
          );
        }
      }

      router.back();
    } catch (error) {
      console.error("Error saving workout:", error);
      Alert.alert(
        "Error",
        `Failed to ${isEditing ? "update" : "create"} workout`
      );
    }
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
        <Text style={styles.title}>
          {isEditing ? "Edit Workout" : "Create Workout"}
        </Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveWorkout}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Workout Name Input */}
      <View style={styles.workoutNameContainer}>
        <TextInput
          style={styles.workoutNameInput}
          value={workoutName}
          onChangeText={setWorkoutName}
          placeholder="Enter workout name"
          placeholderTextColor="#999"
        />
      </View>

      {/* Exercise List */}
      <ScrollView style={styles.exerciseList}>
        {exercises.map((exercise, index) => (
          <View key={`${exercise.id}-${index}`} style={styles.exerciseItem}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <View style={styles.singleArmControl}>
                <Text style={styles.singleArmLabel}>Unilateral</Text>
                <Switch
                  value={exercise.singleArm}
                  onValueChange={() => handleToggleSingleArm(index)}
                />
              </View>
            </View>
            <View style={styles.setsControl}>
              <TouchableOpacity
                onPress={() => handleUpdateSets(index, false)}
                style={styles.setButton}
              >
                <Ionicons name="remove-circle" size={24} color="#007AFF" />
              </TouchableOpacity>
              <Text style={styles.setsText}>{exercise.sets} sets</Text>
              <TouchableOpacity
                onPress={() => handleUpdateSets(index, true)}
                style={styles.setButton}
              >
                <Ionicons name="add-circle" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Add Exercise Button */}
        <TouchableOpacity
          style={[styles.exerciseItem, styles.addExerciseButton]}
          onPress={handleOpenExerciseModal}
        >
          <View style={styles.addExerciseContent}>
            <Ionicons name="add-circle" size={24} color="#007AFF" />
            <Text style={styles.addExerciseText}>Add Exercise</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export default CreateWorkout;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#007AFF",
    padding: 16,
    paddingTop: 60,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  workoutNameContainer: {
    backgroundColor: "white",
    padding: 16,
    margin: 16,
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
  workoutNameLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    fontWeight: "500",
  },
  workoutNameInput: {
    fontSize: 16,
    color: "#333",
    padding: 0,
  },
  exerciseList: {
    flex: 1,
    padding: 16,
  },
  exerciseItem: {
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
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  singleArmControl: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  singleArmLabel: {
    fontSize: 12,
    color: "#666",
    marginRight: 8,
  },
  setsControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
    padding: 8,
    borderRadius: 8,
  },
  setButton: {
    padding: 4,
  },
  setsText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    minWidth: 50,
    textAlign: "center",
  },
  addExerciseButton: {
    marginBottom: 32, // Add extra margin at the bottom for better scrolling
  },
  addExerciseContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  addExerciseText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
});
