import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  GestureResponderEvent,
  ListRenderItem,
  PanResponder,
  PanResponderGestureState,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getPreviousExerciseData,
  getPreviousWorkoutData,
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
  previousSetData?: {
    weight: number;
    reps?: number;
    repsLeft?: number;
    repsRight?: number;
  };
  handleUpdateSet: (
    exerciseIndex: number,
    setIndex: number,
    field: keyof ExerciseSet,
    value: string
  ) => void;
  handleRemoveSet: (exerciseIndex: number, setIndex: number) => void;
}

const getProgressionColor = (
  currentSet: ExerciseSet,
  previousSet?: {
    weight: number;
    reps?: number;
    repsLeft?: number;
    repsRight?: number;
  }
): string => {
  // Return transparent if no actual data has been entered
  if (!currentSet.weight || currentSet.weight === "0") return "transparent";

  // For single-arm exercises
  if (currentSet.repsLeft !== undefined && currentSet.repsRight !== undefined) {
    // Return transparent if either reps field is empty or not filled in
    if (
      !currentSet.repsLeft ||
      !currentSet.repsRight ||
      currentSet.repsLeft === "0" ||
      currentSet.repsRight === "0"
    ) {
      return "transparent";
    }

    const currentWeight = parseFloat(currentSet.weight || "0");
    const currentLeftReps = parseInt(currentSet.repsLeft || "0");
    const currentRightReps = parseInt(currentSet.repsRight || "0");
    const previousWeight = previousSet?.weight || 0;
    const previousLeftReps = previousSet?.repsLeft || 0;
    const previousRightReps = previousSet?.repsRight || 0;

    // Progress: Weight increase OR same weight with more reps
    if (currentWeight > previousWeight) {
      return "rgba(0, 122, 255, 0.5)"; // Blue
    }

    if (currentWeight === previousWeight) {
      if (
        currentLeftReps > previousLeftReps &&
        currentRightReps > previousRightReps
      ) {
        return "rgba(0, 122, 255, 0.5)"; // Blue
      }
      if (
        currentLeftReps === previousLeftReps &&
        currentRightReps === previousRightReps
      ) {
        return "rgba(52, 199, 89, 0.5)"; // Green
      }
      if (
        Math.abs(currentLeftReps - previousLeftReps) <= 1 &&
        Math.abs(currentRightReps - previousRightReps) <= 1
      ) {
        return "rgba(255, 204, 0, 0.5)"; // Yellow
      }
    }

    return "rgba(255, 59, 48, 0.5)"; // Red
  }

  // For regular exercises
  // Return transparent if reps field is empty or not filled in
  if (!currentSet.reps || currentSet.reps === "0") {
    return "transparent";
  }

  const currentWeight = parseFloat(currentSet.weight || "0");
  const currentReps = parseInt(currentSet.reps || "0");
  const previousWeight = previousSet?.weight || 0;
  const previousReps = previousSet?.reps || 0;

  // Progress: Weight increase OR same weight with more reps
  if (currentWeight > previousWeight) {
    return "rgba(0, 122, 255, 0.5)"; // Blue
  }

  if (currentWeight === previousWeight) {
    if (currentReps > previousReps) {
      return "rgba(0, 122, 255, 0.5)"; // Blue
    }
    if (currentReps === previousReps) {
      return "rgba(52, 199, 89, 0.5)"; // Green
    }
    if (previousReps - currentReps === 1) {
      return "rgba(255, 204, 0, 0.5)"; // Yellow
    }
  }

  return "rgba(255, 59, 48, 0.5)"; // Red
};

const getUnilateralProgressionColors = (
  currentSet: {
    weight: string;
    repsLeft?: string;
    repsRight?: string;
  },
  previousSet?: {
    weight: number;
    repsLeft?: number;
    repsRight?: number;
  }
): { leftColor: string; rightColor: string } => {
  // Return transparent if no previous set or if weight is empty/zero
  if (!previousSet || !currentSet.weight || currentSet.weight === "0") {
    return { leftColor: "transparent", rightColor: "transparent" };
  }

  // Return transparent if either reps field is empty or zero
  if (
    !currentSet.repsLeft ||
    !currentSet.repsRight ||
    currentSet.repsLeft === "0" ||
    currentSet.repsRight === "0"
  ) {
    return { leftColor: "transparent", rightColor: "transparent" };
  }

  const currentWeight = parseFloat(currentSet.weight);
  const previousWeight = previousSet.weight;

  // Calculate colors for left arm
  let leftColor = "rgba(255, 59, 48, 0.5)"; // Default to red
  if (currentWeight > previousWeight) {
    leftColor = "rgba(0, 122, 255, 0.5)"; // Blue
  } else if (currentWeight === previousWeight) {
    const currentLeftReps = parseInt(currentSet.repsLeft);
    const previousLeftReps = previousSet.repsLeft || 0;

    if (currentLeftReps > previousLeftReps) {
      leftColor = "rgba(0, 122, 255, 0.5)"; // Blue
    } else if (currentLeftReps === previousLeftReps) {
      leftColor = "rgba(52, 199, 89, 0.5)"; // Green
    } else if (previousLeftReps - currentLeftReps === 1) {
      leftColor = "rgba(255, 204, 0, 0.5)"; // Yellow
    }
  }

  // Calculate colors for right arm
  let rightColor = "rgba(255, 59, 48, 0.5)"; // Default to red
  if (currentWeight > previousWeight) {
    rightColor = "rgba(0, 122, 255, 0.5)"; // Blue
  } else if (currentWeight === previousWeight) {
    const currentRightReps = parseInt(currentSet.repsRight);
    const previousRightReps = previousSet.repsRight || 0;

    if (currentRightReps > previousRightReps) {
      rightColor = "rgba(0, 122, 255, 0.5)"; // Blue
    } else if (currentRightReps === previousRightReps) {
      rightColor = "rgba(52, 199, 89, 0.5)"; // Green
    } else if (previousRightReps - currentRightReps === 1) {
      rightColor = "rgba(255, 204, 0, 0.5)"; // Yellow
    }
  }

  return { leftColor, rightColor };
};

const SetTile: React.FC<SetTileProps> = ({
  exercise,
  exerciseIndex,
  set,
  setIndex,
  previousSetData,
  handleUpdateSet,
  handleRemoveSet,
}) => {
  const backgroundColor = exercise.singleArm
    ? getUnilateralProgressionColors(set, previousSetData)
    : {
        leftColor: getProgressionColor(set, previousSetData),
        rightColor: getProgressionColor(set, previousSetData),
      };

  const renderInput = (
    value: string | undefined,
    onChangeText: (value: string) => void,
    label: string,
    placeholder?: string
  ) => (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder={placeholder || "0"}
        placeholderTextColor="#999"
        value={value === "0" ? "" : value}
        onChangeText={onChangeText}
      />
      <Text style={styles.inputLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={[styles.setTileContainer]}>
      <View style={styles.setTileBackgrounds}>
        <View
          style={[
            styles.setTileBackground,
            { left: 0, backgroundColor: backgroundColor.leftColor },
          ]}
        />
        <View
          style={[
            styles.setTileBackground,
            { right: 0, backgroundColor: backgroundColor.rightColor },
          ]}
        />
      </View>
      <View style={styles.setTileContent}>
        <View style={styles.setNumber}>
          <Text style={styles.setNumberText}>Set {setIndex + 1}</Text>
        </View>

        {renderInput(
          set.weight,
          (value) => handleUpdateSet(exerciseIndex, setIndex, "weight", value),
          "kg",
          previousSetData ? previousSetData.weight.toString() : "0"
        )}

        {exercise.singleArm ? (
          <View style={styles.singleArmContainer}>
            {renderInput(
              set.repsLeft,
              (value) =>
                handleUpdateSet(exerciseIndex, setIndex, "repsLeft", value),
              "L",
              previousSetData?.repsLeft?.toString() || "0"
            )}
            {renderInput(
              set.repsRight,
              (value) =>
                handleUpdateSet(exerciseIndex, setIndex, "repsRight", value),
              "R",
              previousSetData?.repsRight?.toString() || "0"
            )}
          </View>
        ) : (
          renderInput(
            set.reps,
            (value) => handleUpdateSet(exerciseIndex, setIndex, "reps", value),
            "reps",
            previousSetData?.reps?.toString() || "0"
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

interface ExerciseRowProps {
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
  handleToggleSingleArm: (exerciseIndex: number) => void;
  openSetIndex: { exerciseIndex: number; setIndex: number } | null;
  setOpenSetIndex: (
    value: { exerciseIndex: number; setIndex: number } | null
  ) => void;
  previousWorkoutData?: Array<{
    weight: number;
    reps?: number;
    repsLeft?: number;
    repsRight?: number;
    setNumber: number;
  }>;
}

const ExerciseRow: React.FC<ExerciseRowProps> = ({
  exercise,
  exerciseIndex,
  handleUpdateSet,
  handleRemoveSet,
  handleAddSet,
  handleRemoveExercise,
  handleToggleSingleArm,
  openSetIndex,
  setOpenSetIndex,
  previousWorkoutData,
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

    const previousSetData = previousWorkoutData?.find(
      (prevSet) => prevSet.setNumber === setIndex + 1
    );

    const rowItems: SetRowItem[] = [
      {
        type: "set",
        content: (
          <SetTile
            exercise={exercise}
            exerciseIndex={exerciseIndex}
            set={set}
            setIndex={setIndex}
            previousSetData={previousSetData}
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
          <View style={styles.exerciseControls}>
            <View style={styles.singleArmToggle}>
              <Text style={styles.singleArmLabel}>Unilateral</Text>
              <Switch
                value={exercise.singleArm}
                onValueChange={() => handleToggleSingleArm(exerciseIndex)}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={exercise.singleArm ? "#007AFF" : "#f4f3f4"}
              />
            </View>
            <TouchableOpacity
              onPress={() => handleRemoveExercise(exerciseIndex, exercise.name)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
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
  date: string;
  start_time: string;
  end_time: string;
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
  const [startTime, setStartTime] = useState<string>(
    (params.startTime as string) || new Date().toISOString()
  );
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [previousWorkoutData, setPreviousWorkoutData] = useState<{
    [key: number]: Array<{
      weight: number;
      reps?: number;
      repsLeft?: number;
      repsRight?: number;
      setNumber: number;
    }>;
  }>({});
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
          setStartTime(workoutLog.start_time || workoutLog.date);

          // Get previous workout data
          const previousData = await getPreviousWorkoutData(
            workoutLog.workout_id,
            workoutLog.workout_name,
            workoutLog.date
          );
          setPreviousWorkoutData(previousData);

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
        } else if (workoutId !== 0) {
          // Load new workout from template
          const workoutExercises = (await getWorkoutExercises(
            params.name as string
          )) as WorkoutTemplateExercise[];

          // Get previous workout data using the template name
          const previousData = await getPreviousWorkoutData(
            workoutId,
            params.name as string,
            new Date().toISOString()
          );
          setPreviousWorkoutData(previousData);

          const exercisesWithSetData: WorkoutExercise[] = workoutExercises.map(
            (exercise) => ({
              id: exercise.id,
              name: exercise.exercise_name,
              sets: exercise.sets_per_exercise,
              singleArm: Boolean(exercise.single_arm),
              setData: Array(exercise.sets_per_exercise)
                .fill({})
                .map(() => ({
                  weight: "0",
                  ...(Boolean(exercise.single_arm)
                    ? { repsLeft: "0", repsRight: "0" }
                    : { reps: "0" }),
                })),
            })
          );
          setExercises(exercisesWithSetData);
        } else {
          // This is a quick workout - start with empty exercises
          setExercises([]);
          setPreviousWorkoutData({});
        }
      } catch (error) {
        console.error("Error loading workout data:", error);
        if (workoutId) {
          Alert.alert("Error", "Failed to load workout data");
        }
      }
    };

    loadWorkoutData();
  }, [logId, workoutId, params.name]);

  // Handle selected exercise from selection screen
  useEffect(() => {
    const handleNewExercise = () => {
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
          setData: Array(3)
            .fill({})
            .map(() => ({
              weight: "0",
              reps: "0",
            })),
        },
      ]);

      // Update previous workout data
      setPreviousWorkoutData((prevData) => ({
        ...prevData,
        [exerciseId]: Array(3)
          .fill({})
          .map((_, index) => ({
            weight: 0,
            reps: 0,
            setNumber: index + 1,
          })),
      }));
    };

    handleNewExercise();
  }, [params.selectedExerciseId, params.selectedExerciseName]);

  const handleOpenExerciseModal = () => {
    router.push({
      pathname: "/exercise/select",
      params: {
        path: "/workout/complete",
      },
    });
  };

  const handleAddExercise = async (exercise: Exercise) => {
    try {
      // Check if exercise already exists in the workout
      const exerciseExists = exercises.some((e) => e.id === exercise.id);
      if (exerciseExists) {
        Alert.alert(
          "Exercise Already Added",
          `${exercise.exercise_name} is already in this workout.`
        );
        return;
      }

      // Get previous exercise data
      const previousData = await getPreviousExerciseData(
        exercise.id,
        new Date().toISOString()
      );

      // Default to 3 sets if no previous data exists
      const numSets = previousData.length || 3;

      // Add the exercise to the exercises list
      setExercises([
        ...exercises,
        {
          id: exercise.id,
          name: exercise.exercise_name,
          sets: numSets,
          singleArm: false, // Default to regular exercise
          setData: Array(numSets)
            .fill({})
            .map(() => ({
              weight: "",
              reps: "", // Always start with regular exercise format
            })),
        },
      ]);

      // Update the previous workout data state with zeros if no previous data exists
      setPreviousWorkoutData((prevData) => ({
        ...prevData,
        [exercise.id]:
          previousData.length > 0
            ? previousData.map((set, index) => {
                const baseSet = {
                  weight: set.weight,
                  setNumber: index + 1,
                };
                if ("repsLeft" in set && "repsRight" in set) {
                  return {
                    ...baseSet,
                    repsLeft: set.repsLeft || 0,
                    repsRight: set.repsRight || 0,
                  };
                }
                return {
                  ...baseSet,
                  reps: set.reps || 0,
                };
              })
            : Array(numSets)
                .fill({})
                .map((_, index) => ({
                  weight: 0,
                  reps: 0,
                  setNumber: index + 1,
                })),
      }));

      // Close the exercise modal after adding
      setShowExerciseModal(false);
    } catch (error) {
      console.error("Error getting previous exercise data:", error);
      Alert.alert("Error", "Failed to get previous exercise data");
    }
  };

  const handleAddSet = (exerciseIndex: number) => {
    const updatedExercises = [...exercises];
    const exercise = updatedExercises[exerciseIndex];
    exercise.setData.push({
      weight: "0",
      ...(exercise.singleArm
        ? { repsLeft: "0", repsRight: "0" }
        : { reps: "0" }),
    });
    exercise.sets += 1;
    setExercises(updatedExercises);

    // Update previous workout data for the new set
    setPreviousWorkoutData((prevData) => {
      const exerciseData = prevData[exercise.id] || [];
      return {
        ...prevData,
        [exercise.id]: [
          ...exerciseData,
          {
            weight: 0,
            ...(exercise.singleArm
              ? { repsLeft: 0, repsRight: 0 }
              : { reps: 0 }),
            setNumber: exerciseData.length + 1,
          },
        ],
      };
    });
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
    const set = exercise.setData[setIndex];
    const previousSetData = previousWorkoutData[exercise.id]?.find(
      (prevSet) => prevSet.setNumber === setIndex + 1
    );

    // If updating reps/repsLeft/repsRight and weight is empty, autofill from placeholder
    if (
      (field === "reps" || field === "repsLeft" || field === "repsRight") &&
      (!set.weight || set.weight === "0") &&
      previousSetData
    ) {
      set.weight = previousSetData.weight.toString();
    }

    // Update the specified field
    set[field] = value;

    exercise.setData[setIndex] = set;
    setExercises(updatedExercises);
  };

  const handleToggleSingleArm = (exerciseIndex: number) => {
    const updatedExercises = [...exercises];
    const exercise = updatedExercises[exerciseIndex];
    exercise.singleArm = !exercise.singleArm;

    // Convert the set data
    exercise.setData = exercise.setData.map((set) => {
      if (exercise.singleArm) {
        // Converting from regular to single arm
        return {
          weight: set.weight,
          repsLeft: set.reps,
          repsRight: set.reps,
        };
      } else {
        // Converting from single arm to regular
        // Use the higher of left/right reps if they differ
        const reps = Math.max(
          parseInt(set.repsLeft || "0"),
          parseInt(set.repsRight || "0")
        ).toString();
        return {
          weight: set.weight,
          reps,
        };
      }
    });

    setExercises(updatedExercises);
  };

  const handleFinishWorkout = async () => {
    if (!workoutName.trim()) {
      Alert.alert("Error", "Please enter a workout name");
      return;
    }

    // Check for incomplete data
    const hasIncompleteData = exercises.some((exercise) =>
      exercise.setData.some((set) => {
        if (exercise.singleArm) {
          return (
            !set.weight ||
            !set.repsLeft ||
            !set.repsRight ||
            set.weight === "0" ||
            set.repsLeft === "0" ||
            set.repsRight === "0"
          );
        }
        return (
          !set.weight || !set.reps || set.weight === "0" || set.reps === "0"
        );
      })
    );

    if (hasIncompleteData) {
      Alert.alert(
        "Incomplete Data",
        "Some sets have missing weight or rep data.",
        [
          {
            text: "Fill Manually",
            style: "cancel",
          },
          {
            text: "Auto-fill from Previous",
            onPress: async () => {
              const updatedExercises = [...exercises];

              for (let i = 0; i < updatedExercises.length; i++) {
                const exercise = updatedExercises[i];
                const previousData = previousWorkoutData[exercise.id] || [];

                for (let j = 0; j < exercise.setData.length; j++) {
                  const set = exercise.setData[j];
                  const previousSet = previousData[j];

                  if (previousSet) {
                    if (exercise.singleArm) {
                      if (!set.weight || set.weight === "0") {
                        set.weight = previousSet.weight.toString();
                      }
                      if (!set.repsLeft || set.repsLeft === "0") {
                        set.repsLeft = previousSet.repsLeft?.toString() || "0";
                      }
                      if (!set.repsRight || set.repsRight === "0") {
                        set.repsRight =
                          previousSet.repsRight?.toString() || "0";
                      }
                    } else {
                      if (!set.weight || set.weight === "0") {
                        set.weight = previousSet.weight.toString();
                      }
                      if (!set.reps || set.reps === "0") {
                        set.reps = previousSet.reps?.toString() || "0";
                      }
                    }
                  }
                }
              }

              setExercises(updatedExercises);
              await saveWorkout();
            },
          },
        ]
      );
      return;
    }

    await saveWorkout();
  };

  const saveWorkout = async () => {
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
        // Update existing workout log with new name
        await updateWorkoutLog(logId, exercisesForSaving, workoutName);
      } else {
        // For a new workout log
        let currentWorkoutId = workoutId;
        if (currentWorkoutId === 0) {
          // This is a quick workout, save it directly to the workout log without creating a routine
          await saveWorkoutLog(0, exercisesForSaving, workoutName, startTime);
        } else {
          // Save the workout log with the existing workout ID (from a routine)
          await saveWorkoutLog(
            currentWorkoutId,
            exercisesForSaving,
            workoutName,
            startTime
          );
        }
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
      handleToggleSingleArm={handleToggleSingleArm}
      openSetIndex={openSetIndex}
      setOpenSetIndex={setOpenSetIndex}
      previousWorkoutData={previousWorkoutData[exercise.id]}
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
      time: date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const { date, time } = formatDateTime(startTime);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <TextInput
          style={styles.workoutNameInput}
          value={workoutName}
          onChangeText={setWorkoutName}
          placeholder="Enter workout name"
          placeholderTextColor="rgba(255, 255, 255, 0.7)"
        />
        <TouchableOpacity
          style={styles.finishButton}
          onPress={handleFinishWorkout}
        >
          <Text style={styles.finishButtonText}>Finish</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dateTimeBar}>
        <Text style={styles.dateText}>{date}</Text>
        <Text style={styles.timeText}>Started at {time}</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        scrollEnabled={gestureType !== "horizontal"}
        directionalLockEnabled={true}
        showsVerticalScrollIndicator={true}
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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
            handleToggleSingleArm={handleToggleSingleArm}
            openSetIndex={openSetIndex}
            setOpenSetIndex={setOpenSetIndex}
            previousWorkoutData={previousWorkoutData[exercise.id]}
          />
        ))}

        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={handleOpenExerciseModal}
        >
          <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
          <Text style={styles.addExerciseText}>Add Exercise</Text>
        </TouchableOpacity>

        {/* Add extra padding for keyboard */}
        <View style={styles.keyboardPadding} />
      </ScrollView>
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
    padding: 8,
  },
  workoutNameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    marginHorizontal: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
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
    paddingBottom: 150,
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
    position: "relative",
    overflow: "hidden",
  },
  setTileBackgrounds: {
    position: "absolute",
    width: "100%",
    height: "100%",
    flexDirection: "row",
  },
  setTileBackground: {
    position: "absolute",
    width: "50%",
    height: "100%",
  },
  setTileContent: {
    position: "relative",
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    zIndex: 1,
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
    color: "#000",
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
  exerciseControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  singleArmToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  singleArmLabel: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
  dateTimeBar: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  timeText: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  keyboardPadding: {
    height: 150,
  },
});

export default CompleteWorkout;
