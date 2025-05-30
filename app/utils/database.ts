import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

interface Exercise {
  name: string;
  muscles: string[];
}

interface DbRow {
  id: number;
  [key: string]: any;
}

// Preset exercises with their associated muscle groups
const presetExercises: Exercise[] = [
  {
    name: "Bench Press",
    muscles: ["Chest", "Triceps", "Front Deltoids"],
  },
  {
    name: "Bicep Curls",
    muscles: ["Biceps"],
  },
  {
    name: "Squats",
    muscles: ["Quadriceps", "Hamstrings", "Glutes"],
  },
  {
    name: "Deadlift",
    muscles: ["Lower Back", "Hamstrings", "Glutes", "Trapezius"],
  },
  {
    name: "Pull-ups",
    muscles: ["Latissimus Dorsi", "Biceps", "Rear Deltoids"],
  },
  {
    name: "Shoulder Press",
    muscles: ["Front Deltoids", "Middle Deltoids", "Triceps"],
  },
  {
    name: "Tricep Pushdown",
    muscles: ["Triceps"],
  },
  {
    name: "Lat Pulldown",
    muscles: ["Latissimus Dorsi", "Biceps"],
  },
];

export const initDatabase = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync("workoutTracker.db");

    // Create Workouts table
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS Workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_name TEXT NOT NULL
      );`
    );

    // Create Exercises table
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS Exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_name TEXT NOT NULL UNIQUE
      );`
    );

    // Create Muscles table
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS Muscles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        muscle_name TEXT NOT NULL UNIQUE
      );`
    );

    // Create Exercise_Muscles join table
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS Exercise_Muscles (
        exercise_id INTEGER,
        muscle_id INTEGER,
        PRIMARY KEY (exercise_id, muscle_id),
        FOREIGN KEY (exercise_id) REFERENCES Exercises(id),
        FOREIGN KEY (muscle_id) REFERENCES Muscles(id)
      );`
    );

    // Load preset data
    await loadPresetData();
  }
  return db;
};

const loadPresetData = async () => {
  const database = await getDb();

  // Helper function to add a muscle if it doesn't exist
  const addMuscleIfNotExists = async (muscleName: string) => {
    try {
      const existingMuscle = await database.getFirstAsync<DbRow>(
        "SELECT id FROM Muscles WHERE muscle_name = ?;",
        [muscleName]
      );
      if (!existingMuscle) {
        const result = await database.runAsync(
          "INSERT INTO Muscles (muscle_name) VALUES (?);",
          [muscleName]
        );
        return result.lastInsertRowId;
      }
      return existingMuscle.id;
    } catch (error) {
      console.error(`Error adding muscle ${muscleName}:`, error);
      throw error;
    }
  };

  // Helper function to add an exercise if it doesn't exist
  const addExerciseIfNotExists = async (exerciseName: string) => {
    try {
      const existingExercise = await database.getFirstAsync<DbRow>(
        "SELECT id FROM Exercises WHERE exercise_name = ?;",
        [exerciseName]
      );
      if (!existingExercise) {
        const result = await database.runAsync(
          "INSERT INTO Exercises (exercise_name) VALUES (?);",
          [exerciseName]
        );
        return result.lastInsertRowId;
      }
      return existingExercise.id;
    } catch (error) {
      console.error(`Error adding exercise ${exerciseName}:`, error);
      throw error;
    }
  };

  // Add all preset exercises and their muscle associations
  for (const exercise of presetExercises) {
    try {
      const exerciseId = await addExerciseIfNotExists(exercise.name);

      for (const muscleName of exercise.muscles) {
        const muscleId = await addMuscleIfNotExists(muscleName);

        // Link exercise with muscle if not already linked
        const existingLink = await database.getFirstAsync(
          "SELECT 1 FROM Exercise_Muscles WHERE exercise_id = ? AND muscle_id = ?;",
          [exerciseId, muscleId]
        );

        if (!existingLink) {
          await database.runAsync(
            "INSERT INTO Exercise_Muscles (exercise_id, muscle_id) VALUES (?, ?);",
            [exerciseId, muscleId]
          );
        }
      }
    } catch (error) {
      console.error(`Error processing exercise ${exercise.name}:`, error);
    }
  }
};

const getDb = async () => {
  if (!db) {
    db = await initDatabase();
  }
  return db;
};

// Function to create a new workout table
export const createWorkoutTable = async (workoutName: string) => {
  const database = await getDb();
  const tableName = `Workout_${workoutName.replace(/\s+/g, "_")}`;

  await database.execAsync(
    `CREATE TABLE IF NOT EXISTS ${tableName} (
      exercise_id INTEGER,
      sets_per_exercise INTEGER NOT NULL,
      single_arm BOOLEAN NOT NULL,
      FOREIGN KEY (exercise_id) REFERENCES Exercises(id)
    );`
  );

  return tableName;
};

// Database operations for Workouts
export const addWorkout = async (workoutName: string) => {
  const database = await getDb();
  const result = await database.runAsync(
    "INSERT INTO Workouts (workout_name) VALUES (?);",
    [workoutName]
  );
  return result.lastInsertRowId;
};

export const getWorkouts = async () => {
  const database = await getDb();
  const workouts = await database.getAllAsync("SELECT * FROM Workouts;");
  return workouts;
};

// Database operations for Exercises
export const addExercise = async (exerciseName: string) => {
  const database = await getDb();
  const result = await database.runAsync(
    "INSERT INTO Exercises (exercise_name) VALUES (?);",
    [exerciseName]
  );
  return result.lastInsertRowId;
};

export const getExercises = async () => {
  const database = await getDb();
  const exercises = await database.getAllAsync("SELECT * FROM Exercises;");
  return exercises;
};

// Database operations for Muscles
export const addMuscle = async (muscleName: string) => {
  const database = await getDb();
  const result = await database.runAsync(
    "INSERT INTO Muscles (muscle_name) VALUES (?);",
    [muscleName]
  );
  return result.lastInsertRowId;
};

// Link exercise with muscles
export const linkExerciseToMuscles = async (
  exerciseId: number,
  muscleIds: number[]
) => {
  const database = await getDb();
  for (const muscleId of muscleIds) {
    await database.runAsync(
      "INSERT INTO Exercise_Muscles (exercise_id, muscle_id) VALUES (?, ?);",
      [exerciseId, muscleId]
    );
  }
  return true;
};

// Add exercises to a workout
export const addExerciseToWorkout = async (
  workoutName: string,
  exerciseId: number,
  setsPerExercise: number,
  singleArm: boolean
) => {
  const database = await getDb();
  const tableName = `Workout_${workoutName.replace(/\s+/g, "_")}`;

  await database.runAsync(
    `INSERT INTO ${tableName} (exercise_id, sets_per_exercise, single_arm) VALUES (?, ?, ?);`,
    [exerciseId, setsPerExercise, singleArm ? 1 : 0]
  );
  return true;
};

// Export an empty object as default to satisfy Expo Router
export default {};
