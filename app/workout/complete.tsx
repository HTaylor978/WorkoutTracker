import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  GestureResponderEvent,
  ListRenderItem,
  Modal,
  PanResponder,
  PanResponderGestureState,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getExercises, getWorkoutExercises } from "../utils/database";

interface ExerciseSet {
  weight: string;
  repsLeft?: string;
  repsRight?: string;
  reps?: string;
}

interface WorkoutExercise {
  id: number;
  name: string;
  sets: number;
  singleArm: boolean;
  setData: ExerciseSet[];
}

interface Exercise {
  id: number;
  exercise_name: string;
}

interface SetTileProps {
  exercise: WorkoutExercise;
  exerciseIndex: number;
  set: ExerciseSet;
  setIndex: number;
  handleUpdateSet: (
    exerciseIndex: number,
    setIndex: number,
    field: keyof ExerciseSet,
    value: string
  ) => void;
  handleRemoveSet: (exerciseIndex: number, setIndex: number) => void;
}

const SetTile: React.FC<SetTileProps> = ({
  exercise,
  exerciseIndex,
  set,
  setIndex,
  handleUpdateSet,
  handleRemoveSet,
}) => {
  const renderInput = (
    value: string | undefined,
    onChangeText: (value: string) => void,
    label: string
  ) => (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="0"
        value={value || ""}
        onChangeText={onChangeText}
      />
      <Text style={styles.inputLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.setTileContainer}>
      <View style={styles.setTileContent}>
        <View style={styles.setNumber}>
          <Text style={styles.setNumberText}>Set {setIndex + 1}</Text>
        </View>

        {renderInput(
          set.weight,
          (value) => handleUpdateSet(exerciseIndex, setIndex, "weight", value),
          "kg"
        )}

        {exercise.singleArm ? (
          <View style={styles.singleArmContainer}>
            {renderInput(
              set.repsLeft,
              (value) =>
                handleUpdateSet(exerciseIndex, setIndex, "repsLeft", value),
              "L"
            )}
            {renderInput(
              set.repsRight,
              (value) =>
                handleUpdateSet(exerciseIndex, setIndex, "repsRight", value),
              "R"
            )}
          </View>
        ) : (
          renderInput(
            set.reps,
            (value) => handleUpdateSet(exerciseIndex, setIndex, "reps", value),
            "reps"
          )
        )}
      </View>
    </View>
  );
};

interface SetRowItem {
  type: "set" | "remove";
  content: React.ReactElement;
}

const ExerciseRow: React.FC<{
  exercise: WorkoutExercise;
  exerciseIndex: number;
  handleUpdateSet: (
    exerciseIndex: number,
    setIndex: number,
    field: keyof ExerciseSet,
    value: string
  ) => void;
  handleRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  handleAddSet: (exerciseIndex: number) => void;
  handleRemoveExercise: (exerciseIndex: number, name: string) => void;
}> = ({
  exercise,
  exerciseIndex,
  handleUpdateSet,
  handleRemoveSet,
  handleAddSet,
  handleRemoveExercise,
}) => {
  const renderSetItem = ({
    item: set,
    index: setIndex,
  }: {
    item: ExerciseSet;
    index: number;
  }) => {
    const rowItems: SetRowItem[] = [
      {
        type: "set",
        content: (
          <SetTile
            exercise={exercise}
            exerciseIndex={exerciseIndex}
            set={set}
            setIndex={setIndex}
            handleUpdateSet={handleUpdateSet}
            handleRemoveSet={handleRemoveSet}
          />
        ),
      },
      {
        type: "remove",
        content: (
          <TouchableOpacity
            style={styles.removeSetButton}
            onPress={() => handleRemoveSet(exerciseIndex, setIndex)}
          >
            <Text style={styles.removeSetText}>Remove Set</Text>
          </TouchableOpacity>
        ),
      },
    ];

    const renderRowItem: ListRenderItem<SetRowItem> = ({ item }) =>
      item.content;

    return (
      <View style={styles.setItemContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={rowItems}
          renderItem={renderRowItem}
          keyExtractor={(item) => item.type}
          snapToAlignment="start"
          decelerationRate="fast"
          snapToInterval={TILE_WIDTH}
          pagingEnabled
        />
      </View>
    );
  };

  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseNameContainer}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <TouchableOpacity
            onPress={() => handleRemoveExercise(exerciseIndex, exercise.name)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={exercise.setData}
        renderItem={renderSetItem}
        keyExtractor={(_, index) => index.toString()}
        style={styles.setsContainer}
      />

      <TouchableOpacity
        style={styles.addSetButton}
        onPress={() => handleAddSet(exerciseIndex)}
      >
        <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
        <Text style={styles.addSetText}>Add a set</Text>
      </TouchableOpacity>
    </View>
  );
};

const TILE_WIDTH = 300; // Adjust this value based on your needs

function CompleteWorkout() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [workoutName, setWorkoutName] = useState(params.name as string);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [gestureType, setGestureType] = useState<
    "horizontal" | "vertical" | null
  >(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const MIN_GESTURE_DISTANCE = 5;

  useEffect(() => {
    const loadWorkoutExercises = async () => {
      try {
        const workoutExercises = await getWorkoutExercises(workoutName);
        const exercisesWithSetData = workoutExercises.map((exercise: any) => ({
          id: exercise.id,
          name: exercise.exercise_name,
          sets: exercise.sets_per_exercise,
          singleArm: Boolean(exercise.single_arm),
          setData: Array(exercise.sets_per_exercise).fill({
            weight: "",
            ...(Boolean(exercise.single_arm)
              ? { repsLeft: "", repsRight: "" }
              : { reps: "" }),
          }),
        }));
        setExercises(exercisesWithSetData);
      } catch (error) {
        console.error("Error loading workout exercises:", error);
        Alert.alert("Error", "Failed to load workout exercises");
      }
    };

    loadWorkoutExercises();
  }, [workoutName]);

  const handleOpenExerciseModal = async () => {
    try {
      const exerciseList = await getExercises();
      setAvailableExercises(exerciseList as Exercise[]);
      setShowExerciseModal(true);
    } catch (error) {
      console.error("Error loading exercises:", error);
      Alert.alert("Error", "Failed to load exercises");
    }
  };

  const handleAddExercise = (exercise: Exercise) => {
    setExercises([
      ...exercises,
      {
        id: exercise.id,
        name: exercise.exercise_name,
        sets: 3, // Default to 3 sets
        singleArm: false, // Default to regular exercise
        setData: Array(3).fill({
          weight: "",
          reps: "",
        }),
      },
    ]);
    setShowExerciseModal(false);
  };

  const handleAddSet = (exerciseIndex: number) => {
    const updatedExercises = [...exercises];
    const exercise = updatedExercises[exerciseIndex];
    exercise.setData.push({
      weight: "",
      ...(exercise.singleArm ? { repsLeft: "", repsRight: "" } : { reps: "" }),
    });
    exercise.sets += 1;
    setExercises(updatedExercises);
  };

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    const updatedExercises = [...exercises];
    const exercise = updatedExercises[exerciseIndex];
    exercise.setData.splice(setIndex, 1);
    exercise.sets -= 1;
    setExercises(updatedExercises);
  };

  const handleRemoveExercise = (
    exerciseIndex: number,
    exerciseName: string
  ) => {
    Alert.alert(
      "Delete Exercise",
      `Are you sure you want to remove ${exerciseName} from this workout?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedExercises = [...exercises];
            updatedExercises.splice(exerciseIndex, 1);
            setExercises(updatedExercises);
          },
        },
      ]
    );
  };

  const handleUpdateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof ExerciseSet,
    value: string
  ) => {
    const updatedExercises = [...exercises];
    const exercise = updatedExercises[exerciseIndex];
    exercise.setData[setIndex] = {
      ...exercise.setData[setIndex],
      [field]: value,
    };
    setExercises(updatedExercises);
  };

  const handleFinishWorkout = () => {
    // TODO: Save workout data
    console.log("Workout data:", exercises);
    router.back();
  };

  const mainPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponder: (
      _: GestureResponderEvent,
      gestureState: PanResponderGestureState
    ) => {
      const { dx, dy } = gestureState;
      if (
        Math.abs(dx) < MIN_GESTURE_DISTANCE &&
        Math.abs(dy) < MIN_GESTURE_DISTANCE
      ) {
        return false;
      }

      if (!gestureType) {
        const isHorizontal = Math.abs(dx) > Math.abs(dy);
        setGestureType(isHorizontal ? "horizontal" : "vertical");
        return true;
      }
      return true;
    },
    onMoveShouldSetPanResponderCapture: () => false,
    onPanResponderTerminate: () => {
      setGestureType(null);
    },
    onPanResponderRelease: () => {
      setGestureType(null);
    },
  });

  const renderExercise: ListRenderItem<WorkoutExercise> = ({
    item: exercise,
    index: exerciseIndex,
  }) => (
    <ExerciseRow
      key={exercise.id}
      exercise={exercise}
      exerciseIndex={exerciseIndex}
      handleUpdateSet={handleUpdateSet}
      handleRemoveSet={handleRemoveSet}
      handleAddSet={handleAddSet}
      handleRemoveExercise={handleRemoveExercise}
    />
  );

  const renderFooter = () => (
    <TouchableOpacity
      style={styles.addExerciseButton}
      onPress={handleOpenExerciseModal}
    >
      <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
      <Text style={styles.addExerciseText}>Add Exercise</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>{workoutName}</Text>
        <TouchableOpacity
          style={styles.finishButton}
          onPress={handleFinishWorkout}
        >
          <Text style={styles.finishButtonText}>Finish</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        scrollEnabled={gestureType !== "horizontal"}
        directionalLockEnabled={true}
        showsVerticalScrollIndicator={true}
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {exercises.map((exercise, exerciseIndex) => (
          <ExerciseRow
            key={exercise.id}
            exercise={exercise}
            exerciseIndex={exerciseIndex}
            handleUpdateSet={handleUpdateSet}
            handleRemoveSet={handleRemoveSet}
            handleAddSet={handleAddSet}
            handleRemoveExercise={handleRemoveExercise}
          />
        ))}

        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={handleOpenExerciseModal}
        >
          <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

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
    flex: 1,
    marginLeft: 16,
  },
  finishButton: {
    padding: 8,
  },
  finishButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    position: "relative",
  },
  scrollContent: {
    padding: 16,
  },
  exerciseCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
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
  exerciseHeader: {
    marginBottom: 12,
  },
  exerciseNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333",
  },
  setsContainer: {
    marginBottom: 12,
  },
  setItemContainer: {
    width: TILE_WIDTH,
    marginBottom: 4,
  },
  removeSetButton: {
    width: TILE_WIDTH,
    height: "100%",
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
  },
  removeSetText: {
    color: "white",
    fontWeight: "600",
  },
  setTileContainer: {
    width: TILE_WIDTH,
    height: 40,
    backgroundColor: "white",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 4,
  },
  input: {
    minWidth: 40,
    padding: 4,
    textAlign: "center",
    fontSize: 16,
  },
  inputLabel: {
    marginLeft: 4,
    fontSize: 14,
    color: "#666",
  },
  singleArmContainer: {
    flexDirection: "row",
    gap: 8,
  },
  addSetButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e1e1e1",
  },
  addSetText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#007AFF",
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
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
  setNumber: {
    width: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  setNumberText: {
    fontSize: 14,
    fontWeight: "600",
  },
  setTileContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
});

export default CompleteWorkout;
