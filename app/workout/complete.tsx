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
import {
  getExercises,
  getWorkoutExercises,
  getWorkoutLogDetails,
  saveWorkoutLog,
  updateWorkoutLog,
} from "../utils/database";

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

const TILE_WIDTH = 300; // Adjust this value based on your needs

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
  openSetIndex: { exerciseIndex: number; setIndex: number } | null;
  setOpenSetIndex: (
    value: { exerciseIndex: number; setIndex: number } | null
  ) => void;
}> = ({
  exercise,
  exerciseIndex,
  handleUpdateSet,
  handleRemoveSet,
  handleAddSet,
  handleRemoveExercise,
  openSetIndex,
  setOpenSetIndex,
}) => {
  const setListRefs = useRef<{ [key: string]: FlatList | null }>({});
  const [fullyOpenSet, setFullyOpenSet] = useState<{ setIndex: number } | null>(
    null
  );

  const handleScroll = (event: any, setIndex: number) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const isThisSetOpen =
      openSetIndex?.exerciseIndex === exerciseIndex &&
      openSetIndex?.setIndex === setIndex;

    // If this set is starting to open (moved more than 10% of the way)
    if (offsetX > TILE_WIDTH * 0.1 && !isThisSetOpen) {
      // If there's a different set fully open, close it immediately
      if (fullyOpenSet && fullyOpenSet.setIndex !== setIndex) {
        const listRef =
          setListRefs.current[`${exerciseIndex}-${fullyOpenSet.setIndex}`];
        if (listRef) {
          listRef.scrollToOffset({ offset: 0, animated: true });
        }
        setFullyOpenSet(null);
      }
    }

    // When fully opened
    if (offsetX >= TILE_WIDTH) {
      if (!isThisSetOpen) {
        setOpenSetIndex({ exerciseIndex, setIndex });
        setFullyOpenSet({ setIndex });
      }
    }
    // When fully closed
    else if (offsetX === 0) {
      if (isThisSetOpen) {
        setOpenSetIndex(null);
        if (fullyOpenSet?.setIndex === setIndex) {
          setFullyOpenSet(null);
        }
      }
    }
  };

  const renderSetItem = ({
    item: set,
    index: setIndex,
  }: {
    item: ExerciseSet;
    index: number;
  }) => {
    const isOpen =
      openSetIndex?.exerciseIndex === exerciseIndex &&
      openSetIndex?.setIndex === setIndex;
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
            onPress={() => {
              handleRemoveSet(exerciseIndex, setIndex);
              setOpenSetIndex(null);
              setFullyOpenSet(null);
            }}
          >
            <Text style={styles.removeSetText}>Remove Set</Text>
          </TouchableOpacity>
        ),
      },
    ];

    return (
      <View style={styles.setItemContainer}>
        <FlatList
          ref={(ref) => {
            setListRefs.current[`${exerciseIndex}-${setIndex}`] = ref;
          }}
          horizontal
          showsHorizontalScrollIndicator={false}
          data={rowItems}
          renderItem={({ item }) => item.content}
          keyExtractor={(item) => item.type}
          snapToAlignment="start"
          decelerationRate="fast"
          snapToInterval={TILE_WIDTH}
          pagingEnabled
          scrollEnabled={true}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          onScroll={(event) => handleScroll(event, setIndex)}
          onMomentumScrollEnd={(event) => handleScroll(event, setIndex)}
          scrollEventThrottle={16}
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
        keyExtractor={(_, index) => `set-${exerciseIndex}-${index}`}
        style={styles.setsContainer}
        scrollEnabled={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        removeClippedSubviews={false}
        windowSize={10}
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

interface WorkoutLogExercise {
  exercise_id: number;
  exercise_name: string;
  single_arm: number;
  sets: Array<{
    weight: number;
    reps_left?: number;
    reps_right?: number;
    reps?: number;
  }>;
}

interface WorkoutLog {
  log_id: number;
  workout_id: number;
  workout_name: string;
  exercises: WorkoutLogExercise[];
}

interface WorkoutTemplateExercise {
  id: number;
  exercise_name: string;
  sets_per_exercise: number;
  single_arm: number;
}

function CompleteWorkout() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [workoutName, setWorkoutName] = useState(params.name as string);
  const [workoutId, setWorkoutId] = useState(
    params.workoutId ? parseInt(params.workoutId as string) : 0
  );
  const [logId, setLogId] = useState(
    params.logId ? parseInt(params.logId as string) : 0
  );
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [gestureType, setGestureType] = useState<
    "horizontal" | "vertical" | null
  >(null);
  const [openSetIndex, setOpenSetIndex] = useState<{
    exerciseIndex: number;
    setIndex: number;
  } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const MIN_GESTURE_DISTANCE = 5;

  useEffect(() => {
    const loadWorkoutData = async () => {
      try {
        if (logId) {
          // Load existing workout log
          const workoutLog = (await getWorkoutLogDetails(logId)) as WorkoutLog;
          setWorkoutId(workoutLog.workout_id);
          setWorkoutName(workoutLog.workout_name);

          // Transform the exercises data to match our state structure
          const transformedExercises: WorkoutExercise[] =
            workoutLog.exercises.map((exercise) => ({
              id: exercise.exercise_id,
              name: exercise.exercise_name,
              singleArm: exercise.single_arm === 1,
              sets: exercise.sets.length,
              setData: exercise.sets.map((set) => ({
                weight: set.weight.toString(),
                ...(exercise.single_arm === 1
                  ? {
                      repsLeft: set.reps_left?.toString() || "",
                      repsRight: set.reps_right?.toString() || "",
                    }
                  : { reps: set.reps?.toString() || "" }),
              })),
            }));

          setExercises(transformedExercises);
        } else {
          // Load new workout template
          const workoutExercises = (await getWorkoutExercises(
            workoutName
          )) as WorkoutTemplateExercise[];
          const exercisesWithSetData: WorkoutExercise[] = workoutExercises.map(
            (exercise) => ({
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
            })
          );
          setExercises(exercisesWithSetData);
        }
      } catch (error) {
        console.error("Error loading workout data:", error);
        Alert.alert("Error", "Failed to load workout data");
      }
    };

    loadWorkoutData();
  }, [workoutName, logId]);

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

    // If no sets left, remove the exercise
    if (exercise.sets === 0) {
      updatedExercises.splice(exerciseIndex, 1);
    }

    setExercises(updatedExercises);
    setOpenSetIndex(null); // Close the remove button after removing
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

  const handleFinishWorkout = async () => {
    try {
      // Transform exercises data for saving
      const exercisesForSaving = exercises.map((exercise) => ({
        id: exercise.id,
        singleArm: exercise.singleArm,
        sets: exercise.setData.map((set) => ({
          weight: parseFloat(set.weight) || 0,
          ...(exercise.singleArm
            ? {
                repsLeft: parseInt(set.repsLeft || "0"),
                repsRight: parseInt(set.repsRight || "0"),
              }
            : { reps: parseInt(set.reps || "0") }),
        })),
      }));

      if (logId) {
        // Update existing workout log
        await updateWorkoutLog(logId, exercisesForSaving);
      } else {
        // Save new workout log
        await saveWorkoutLog(workoutId, exercisesForSaving);
      }

      router.replace("/(tabs)");
    } catch (error) {
      console.error("Error saving workout:", error);
      Alert.alert("Error", "Failed to save workout");
    }
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
      openSetIndex={openSetIndex}
      setOpenSetIndex={setOpenSetIndex}
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
            openSetIndex={openSetIndex}
            setOpenSetIndex={setOpenSetIndex}
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
    flexGrow: 0,
  },
  setItemContainer: {
    width: TILE_WIDTH,
    marginBottom: 4,
    height: 40,
  },
  removeSetButton: {
    width: TILE_WIDTH,
    height: 40,
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
