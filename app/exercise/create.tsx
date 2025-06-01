import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  addExercise,
  getMuscles,
  linkExerciseToMuscles,
} from "../utils/database";

interface Muscle {
  id: number;
  muscle_name: string;
}

export default function CreateExercise() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [exerciseName, setExerciseName] = useState(
    (params.initialName as string) || ""
  );
  const [muscles, setMuscles] = useState<Muscle[]>([]);
  const [selectedMuscles, setSelectedMuscles] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    const loadMuscles = async () => {
      try {
        const muscleList = await getMuscles();
        setMuscles(muscleList);
      } catch (error) {
        console.error("Error loading muscles:", error);
        Alert.alert("Error", "Failed to load muscles");
      }
    };

    loadMuscles();
  }, []);

  const handleToggleMuscle = (muscleId: number) => {
    const newSelected = new Set(selectedMuscles);
    if (newSelected.has(muscleId)) {
      newSelected.delete(muscleId);
    } else {
      newSelected.add(muscleId);
    }
    setSelectedMuscles(newSelected);
  };

  const handleCreateExercise = async () => {
    if (!exerciseName.trim()) {
      Alert.alert("Error", "Please enter an exercise name");
      return;
    }

    if (selectedMuscles.size === 0) {
      Alert.alert("Error", "Please select at least one muscle");
      return;
    }

    try {
      // Add the exercise and get its ID
      const exerciseId = await addExercise(exerciseName.trim());

      // Link the exercise to selected muscles
      await linkExerciseToMuscles(exerciseId, Array.from(selectedMuscles));

      // Navigate back twice (to the workout screen) and pass the exercise data
      router.back();
      router.back();
      // Use a small delay to ensure the params are set after navigation
      setTimeout(() => {
        router.setParams({
          selectedExerciseId: exerciseId.toString(),
          selectedExerciseName: exerciseName.trim(),
        });
      }, 0);
    } catch (error) {
      console.error("Error creating exercise:", error);
      Alert.alert("Error", "Failed to create exercise");
    }
  };

  // Create the muscle grid layout
  const muscleGrid = [];
  const columnLengths = [7, 8, 7]; // Number of items in each column
  let currentIndex = 0;

  for (let col = 0; col < 3; col++) {
    const columnMuscles = muscles.slice(
      currentIndex,
      currentIndex + columnLengths[col]
    );
    currentIndex += columnLengths[col];

    muscleGrid.push(
      <View key={col} style={styles.column}>
        {columnMuscles.map((muscle) => (
          <TouchableOpacity
            key={muscle.id}
            style={[
              styles.muscleTile,
              selectedMuscles.has(muscle.id) && styles.selectedMuscleTile,
            ]}
            onPress={() => handleToggleMuscle(muscle.id)}
          >
            <Text
              style={[
                styles.muscleText,
                selectedMuscles.has(muscle.id) && styles.selectedMuscleText,
              ]}
            >
              {muscle.muscle_name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Create Exercise</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateExercise}
          >
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.nameContainer}>
          <TextInput
            style={styles.nameInput}
            value={exerciseName}
            onChangeText={setExerciseName}
            placeholder="Exercise name"
            placeholderTextColor="#999"
          />
        </View>

        <Text style={styles.sectionTitle}>Select Muscles</Text>

        <ScrollView style={styles.scrollView}>
          <View style={styles.gridContainer}>{muscleGrid}</View>
        </ScrollView>
      </View>
    </>
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
  createButton: {
    padding: 8,
  },
  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  nameContainer: {
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
  nameInput: {
    fontSize: 16,
    color: "#333",
    padding: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  column: {
    flex: 1,
    marginHorizontal: 4,
  },
  muscleTile: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
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
  selectedMuscleTile: {
    backgroundColor: "#007AFF",
  },
  muscleText: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
  },
  selectedMuscleText: {
    color: "white",
  },
});
