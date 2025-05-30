import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Modal,
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
  getExercises,
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
  const [workoutName, setWorkoutName] = useState("");
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);

  // Load available exercises when modal opens
  const handleOpenExerciseModal = async () => {
    try {
      const exerciseList = (await getExercises()) as Exercise[];
      setAvailableExercises(exerciseList);
      setShowExerciseModal(true);
    } catch (error) {
      console.error("Error loading exercises:", error);
    }
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

      router.push("/workout/select");
    } catch (error) {
      console.error("Error saving workout:", error);
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
        <Text style={styles.title}>Create Workout</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveWorkout}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Workout Name Input */}
      <TextInput
        style={styles.workoutNameInput}
        placeholder="Workout Name"
        value={workoutName}
        onChangeText={setWorkoutName}
      />

      {/* Exercise List */}
      <ScrollView style={styles.exerciseList}>
        {exercises.map((exercise, index) => (
          <View key={`${exercise.id}-${index}`} style={styles.exerciseItem}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <View style={styles.exerciseControls}>
              <View style={styles.singleArmControl}>
                <Text style={styles.controlLabel}>Single Arm</Text>
                <Switch
                  value={exercise.singleArm}
                  onValueChange={() => handleToggleSingleArm(index)}
                />
              </View>
              <View style={styles.setsControl}>
                <TouchableOpacity
                  onPress={() => handleUpdateSets(index, false)}
                >
                  <Ionicons name="remove-circle" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.setsText}>{exercise.sets} sets</Text>
                <TouchableOpacity onPress={() => handleUpdateSets(index, true)}>
                  <Ionicons name="add-circle" size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add Exercise Button */}
      <TouchableOpacity
        style={styles.addExerciseButton}
        onPress={handleOpenExerciseModal}
      >
        <Ionicons name="add-circle" size={32} color="#007AFF" />
        <Text style={styles.addExerciseText}>Add Exercise</Text>
      </TouchableOpacity>

      {/* Exercise Selection Modal */}
      <Modal
        visible={showExerciseModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Exercise</Text>
              <TouchableOpacity onPress={() => setShowExerciseModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.exercisesList}>
              {availableExercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={styles.exerciseOption}
                  onPress={() => handleAddExercise(exercise)}
                >
                  <Text style={styles.exerciseOptionText}>
                    {exercise.exercise_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  workoutNameInput: {
    backgroundColor: "white",
    padding: 16,
    margin: 16,
    borderRadius: 10,
    fontSize: 16,
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
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  exerciseControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  singleArmControl: {
    flexDirection: "row",
    alignItems: "center",
  },
  controlLabel: {
    marginRight: 8,
    fontSize: 14,
    color: "#666",
  },
  setsControl: {
    flexDirection: "row",
    alignItems: "center",
  },
  setsText: {
    marginHorizontal: 12,
    fontSize: 14,
    color: "#666",
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e1e1e1",
  },
  addExerciseText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  exercisesList: {
    padding: 16,
  },
  exerciseOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  exerciseOptionText: {
    fontSize: 16,
  },
});
