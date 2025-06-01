import { Ionicons } from "@expo/vector-icons";
import { Link, Stack, useRouter } from "expo-router";
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
import { getExercises } from "../utils/database";

interface Exercise {
  id: number;
  exercise_name: string;
}

export default function SelectExercise() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const exerciseList = await getExercises();
        setExercises(exerciseList);
        setFilteredExercises(exerciseList);
      } catch (error) {
        console.error("Error loading exercises:", error);
        Alert.alert("Error", "Failed to load exercises");
      }
    };

    loadExercises();
  }, []);

  useEffect(() => {
    const filtered = exercises.filter((exercise) =>
      exercise.exercise_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredExercises(filtered);
  }, [searchQuery, exercises]);

  const handleSelectExercise = (exercise: Exercise) => {
    // Pass back the selected exercise
    if (router.canGoBack()) {
      router.back();
      // Use a small delay to ensure the params are set after navigation
      setTimeout(() => {
        router.setParams({
          selectedExerciseId: exercise.id.toString(),
          selectedExerciseName: exercise.exercise_name,
        });
      }, 0);
    } else {
      router.replace("/");
    }
  };

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
          <Text style={styles.title}>Select Exercise</Text>
          <Link
            href={{
              pathname: "/exercise/create",
              params: { initialName: searchQuery },
            }}
            asChild
          >
            <TouchableOpacity style={styles.createButton}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </Link>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search exercises"
            placeholderTextColor="#999"
            autoFocus={true}
          />
        </View>

        <ScrollView style={styles.exerciseList}>
          {filteredExercises.map((exercise) => (
            <TouchableOpacity
              key={exercise.id}
              style={styles.exerciseItem}
              onPress={() => handleSelectExercise(exercise)}
            >
              <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    margin: 16,
    padding: 12,
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
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#333",
  },
  exerciseList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  exerciseItem: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  exerciseName: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
});
