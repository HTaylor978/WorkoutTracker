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

interface DbExercise {
  id: number;
  exercise_name: string;
}

interface DbWorkout {
  id: number;
  workout_name: string;
}

interface DbMuscle {
  id: number;
  muscle_name: string;
}

interface PreviousWorkoutRow {
  log_id: number;
  date: string;
  exercise_id: number;
  exercise_log_id: number;
  set_number: number;
  weight: number;
  reps: number | null;
  reps_left: number | null;
  reps_right: number | null;
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

const loadPresetData = async () => {
  const database = await getDb();

  try {
    // Check if we already have exercises
    const existingExercises = await database.getAllAsync(
      "SELECT * FROM Exercises;"
    );

    if (existingExercises.length > 0) {
      console.log("Exercises already exist, skipping preset data");
      return;
    }

    // Add preset exercises and their muscles
    for (const exercise of presetExercises) {
      // Add exercise
      const result = await database.runAsync(
        "INSERT INTO Exercises (exercise_name) VALUES (?);",
        [exercise.name]
      );
      const exerciseId = result.lastInsertRowId;

      // Add muscles and create exercise-muscle relationships
      for (const muscleName of exercise.muscles) {
        // Add muscle if it doesn't exist
        let muscleResult = await database.getFirstAsync<DbMuscle>(
          "SELECT id FROM Muscles WHERE muscle_name = ?;",
          [muscleName]
        );

        let muscleId;
        if (!muscleResult) {
          const insertResult = await database.runAsync(
            "INSERT INTO Muscles (muscle_name) VALUES (?);",
            [muscleName]
          );
          muscleId = insertResult.lastInsertRowId;
        } else {
          muscleId = muscleResult.id;
        }

        // Create exercise-muscle relationship
        await database.runAsync(
          "INSERT INTO Exercise_Muscles (exercise_id, muscle_id) VALUES (?, ?);",
          [exerciseId, muscleId]
        );
      }
    }
  } catch (error) {
    console.error("Error in loadPresetData:", error);
    throw error;
  }
};

export const initDatabase = async () => {
  if (!db) {
    console.log("Opening database...");
    db = await SQLite.openDatabaseAsync("workoutTracker.db");
    console.log("Database opened");

    try {
      // Create tables
      console.log("Creating tables...");
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS Workouts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workout_name TEXT NOT NULL
        );`
      );

      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS Exercises (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          exercise_name TEXT NOT NULL UNIQUE
        );`
      );

      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS Muscles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          muscle_name TEXT NOT NULL UNIQUE
        );`
      );

      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS Exercise_Muscles (
          exercise_id INTEGER,
          muscle_id INTEGER,
          PRIMARY KEY (exercise_id, muscle_id),
          FOREIGN KEY (exercise_id) REFERENCES Exercises(id),
          FOREIGN KEY (muscle_id) REFERENCES Muscles(id)
        );`
      );

      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS Workout_Logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workout_id INTEGER,
          date TEXT,
          FOREIGN KEY (workout_id) REFERENCES Workouts(id)
        );`
      );

      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS Exercise_Logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workout_log_id INTEGER,
          exercise_id INTEGER,
          single_arm BOOLEAN,
          FOREIGN KEY (workout_log_id) REFERENCES Workout_Logs(id),
          FOREIGN KEY (exercise_id) REFERENCES Exercises(id)
        );`
      );

      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS Set_Logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          exercise_log_id INTEGER,
          set_number INTEGER,
          reps_left INTEGER,
          reps_right INTEGER,
          reps INTEGER,
          weight REAL,
          FOREIGN KEY (exercise_log_id) REFERENCES Exercise_Logs(id)
        );`
      );

      console.log("Tables created successfully");

      // Load preset exercises
      console.log("Loading preset exercises...");
      await loadPresetData();
      console.log("Preset exercises loaded");
    } catch (error) {
      console.error("Error during database initialization:", error);
      throw error;
    }
  }
  return db;
};

const getDb = async () => {
  if (!db) {
    db = await initDatabase();
  }
  return db!;
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

// Delete a workout and its associated table
export const deleteWorkout = async (workoutId: number, workoutName: string) => {
  const database = await getDb();
  const tableName = `Workout_${workoutName.replace(/\s+/g, "_")}`;

  try {
    // Delete the workout's table
    await database.execAsync(`DROP TABLE IF EXISTS ${tableName};`);

    // Delete the workout from the Workouts table
    await database.runAsync("DELETE FROM Workouts WHERE id = ?;", [workoutId]);

    return true;
  } catch (error) {
    console.error("Error deleting workout:", error);
    throw error;
  }
};

// Get exercises for a specific workout
export const getWorkoutExercises = async (workoutName: string) => {
  const database = await getDb();
  const tableName = `Workout_${workoutName.replace(/\s+/g, "_")}`;

  try {
    const exercises = await database.getAllAsync(
      `SELECT e.id, e.exercise_name, w.sets_per_exercise, w.single_arm
       FROM ${tableName} w
       JOIN Exercises e ON w.exercise_id = e.id;`
    );
    return exercises;
  } catch (error) {
    console.error("Error getting workout exercises:", error);
    throw error;
  }
};

// Update a workout
export const updateWorkout = async (
  workoutId: number,
  oldWorkoutName: string,
  newWorkoutName: string,
  exercises: { id: number; sets: number; singleArm: boolean }[]
) => {
  const database = await getDb();
  const oldTableName = `Workout_${oldWorkoutName.replace(/\s+/g, "_")}`;
  const newTableName = `Workout_${newWorkoutName.replace(/\s+/g, "_")}`;

  try {
    // Update workout name in Workouts table if it changed
    if (oldWorkoutName !== newWorkoutName) {
      await database.runAsync(
        "UPDATE Workouts SET workout_name = ? WHERE id = ?;",
        [newWorkoutName, workoutId]
      );

      // Rename the workout table
      await database.execAsync(
        `ALTER TABLE ${oldTableName} RENAME TO ${newTableName};`
      );
    }

    // Clear existing exercises
    await database.execAsync(`DELETE FROM ${newTableName};`);

    // Add new exercises
    for (const exercise of exercises) {
      await database.runAsync(
        `INSERT INTO ${newTableName} (exercise_id, sets_per_exercise, single_arm) VALUES (?, ?, ?);`,
        [exercise.id, exercise.sets, exercise.singleArm ? 1 : 0]
      );
    }

    return true;
  } catch (error) {
    console.error("Error updating workout:", error);
    throw error;
  }
};

// Save a completed workout
export const saveWorkoutLog = async (
  workoutId: number,
  exercises: Array<{
    id: number;
    singleArm: boolean;
    sets: Array<{
      weight: number;
      reps?: number;
      repsLeft?: number;
      repsRight?: number;
    }>;
  }>
) => {
  const database = await getDb();

  try {
    // Insert workout log and get its ID
    const workoutLogResult = await database.runAsync(
      "INSERT INTO Workout_Logs (workout_id, date) VALUES (?, ?);",
      [workoutId, new Date().toISOString()]
    );
    const workoutLogId = workoutLogResult.lastInsertRowId;

    // Insert each exercise and its sets
    for (const exercise of exercises) {
      // Insert exercise log
      const exerciseLogResult = await database.runAsync(
        "INSERT INTO Exercise_Logs (workout_log_id, exercise_id, single_arm) VALUES (?, ?, ?);",
        [workoutLogId, exercise.id, exercise.singleArm ? 1 : 0]
      );
      const exerciseLogId = exerciseLogResult.lastInsertRowId;

      // Insert sets for this exercise
      for (let i = 0; i < exercise.sets.length; i++) {
        const set = exercise.sets[i];
        await database.runAsync(
          `INSERT INTO Set_Logs (
            exercise_log_id, 
            set_number, 
            reps_left, 
            reps_right, 
            reps, 
            weight
          ) VALUES (?, ?, ?, ?, ?, ?);`,
          [
            exerciseLogId,
            i + 1,
            set.repsLeft || null,
            set.repsRight || null,
            set.reps || null,
            set.weight,
          ]
        );
      }
    }

    return workoutLogId;
  } catch (error) {
    console.error("Error saving workout log:", error);
    throw error;
  }
};

// Get all workout logs
export const getWorkoutLogs = async () => {
  const database = await getDb();
  try {
    console.log("Executing getWorkoutLogs query...");

    // First, check if we have any workouts
    const workouts = await database.getAllAsync("SELECT * FROM Workouts;");
    console.log("Total workouts in database:", workouts.length);

    // Then check workout logs
    const workoutLogs = await database.getAllAsync(
      "SELECT * FROM Workout_Logs;"
    );
    console.log("Total workout logs in database:", workoutLogs.length);

    // Now get the full workout log data
    const logs = await database.getAllAsync(`
      SELECT 
        wl.id as log_id,
        wl.date,
        w.id as workout_id,
        w.workout_name
      FROM Workout_Logs wl
      JOIN Workouts w ON w.id = wl.workout_id
      ORDER BY wl.date DESC;
    `);
    console.log("Retrieved logs with workout details:", logs);
    return logs;
  } catch (error) {
    console.error("Error getting workout logs:", error);
    throw error;
  }
};

// Get details of a specific workout log
export const getWorkoutLogDetails = async (logId: number) => {
  const database = await getDb();
  try {
    // Get workout info
    const workoutInfo = await database.getFirstAsync<{
      log_id: number;
      date: string;
      workout_id: number;
      workout_name: string;
    }>(
      `
      SELECT 
        wl.id as log_id,
        wl.date,
        w.id as workout_id,
        w.workout_name
      FROM Workout_Logs wl
      JOIN Workouts w ON w.id = wl.workout_id
      WHERE wl.id = ?;
    `,
      [logId]
    );

    if (!workoutInfo) {
      throw new Error(`No workout log found with id ${logId}`);
    }

    // Get exercises
    const exercises = await database.getAllAsync<{
      exercise_log_id: number;
      exercise_id: number;
      exercise_name: string;
      single_arm: number;
      sets?: Array<{
        set_number: number;
        reps_left: number | null;
        reps_right: number | null;
        reps: number | null;
        weight: number;
      }>;
    }>(
      `
      SELECT 
        el.id as exercise_log_id,
        e.id as exercise_id,
        e.exercise_name,
        el.single_arm
      FROM Exercise_Logs el
      JOIN Exercises e ON e.id = el.exercise_id
      WHERE el.workout_log_id = ?;
    `,
      [logId]
    );

    // Get sets for each exercise
    for (const exercise of exercises) {
      const sets = await database.getAllAsync<{
        set_number: number;
        reps_left: number | null;
        reps_right: number | null;
        reps: number | null;
        weight: number;
      }>(
        `
        SELECT set_number, reps_left, reps_right, reps, weight
        FROM Set_Logs
        WHERE exercise_log_id = ?
        ORDER BY set_number;
      `,
        [exercise.exercise_log_id]
      );
      exercise.sets = sets;
    }

    return {
      ...workoutInfo,
      exercises,
    };
  } catch (error) {
    console.error("Error getting workout log details:", error);
    throw error;
  }
};

// Update an existing workout log
export const updateWorkoutLog = async (
  logId: number,
  exercises: Array<{
    id: number;
    singleArm: boolean;
    sets: Array<{
      weight: number;
      reps?: number;
      repsLeft?: number;
      repsRight?: number;
    }>;
  }>
) => {
  const database = await getDb();
  try {
    // Get all exercise logs to delete their sets
    const exerciseLogs = await database.getAllAsync<{ id: number }>(
      "SELECT id FROM Exercise_Logs WHERE workout_log_id = ?;",
      [logId]
    );

    // Delete all sets for each exercise log
    for (const exerciseLog of exerciseLogs) {
      await database.runAsync(
        "DELETE FROM Set_Logs WHERE exercise_log_id = ?;",
        [exerciseLog.id]
      );
    }

    // Delete all exercise logs for this workout
    await database.runAsync(
      "DELETE FROM Exercise_Logs WHERE workout_log_id = ?;",
      [logId]
    );

    // Insert new exercise logs and sets
    for (const exercise of exercises) {
      const exerciseLogResult = await database.runAsync(
        "INSERT INTO Exercise_Logs (workout_log_id, exercise_id, single_arm) VALUES (?, ?, ?);",
        [logId, exercise.id, exercise.singleArm ? 1 : 0]
      );
      const exerciseLogId = exerciseLogResult.lastInsertRowId;

      for (let i = 0; i < exercise.sets.length; i++) {
        const set = exercise.sets[i];
        await database.runAsync(
          `INSERT INTO Set_Logs (
            exercise_log_id, 
            set_number, 
            reps_left, 
            reps_right, 
            reps, 
            weight
          ) VALUES (?, ?, ?, ?, ?, ?);`,
          [
            exerciseLogId,
            i + 1,
            set.repsLeft || null,
            set.repsRight || null,
            set.reps || null,
            set.weight,
          ]
        );
      }
    }
  } catch (error) {
    console.error("Error updating workout log:", error);
    throw error;
  }
};

// Delete a workout log and all associated data
export const deleteWorkoutLog = async (logId: number) => {
  const database = await getDb();
  try {
    // Get all exercise logs to delete their sets
    const exerciseLogs = await database.getAllAsync<{ id: number }>(
      "SELECT id FROM Exercise_Logs WHERE workout_log_id = ?;",
      [logId]
    );

    // Delete all sets for each exercise log
    for (const exerciseLog of exerciseLogs) {
      await database.runAsync(
        "DELETE FROM Set_Logs WHERE exercise_log_id = ?;",
        [exerciseLog.id]
      );
    }

    // Delete all exercise logs for this workout
    await database.runAsync(
      "DELETE FROM Exercise_Logs WHERE workout_log_id = ?;",
      [logId]
    );

    // Delete the workout log
    await database.runAsync("DELETE FROM Workout_Logs WHERE id = ?;", [logId]);

    return true;
  } catch (error) {
    console.error("Error deleting workout log:", error);
    throw error;
  }
};

// Get the previous workout data for comparison
export const getPreviousWorkoutData = async (
  workoutId: number,
  workoutName: string,
  currentDate: string
) => {
  const database = await getDb();
  try {
    // Get the most recent workout log before the current date
    const previousWorkout = await database.getAllAsync<PreviousWorkoutRow>(
      `
      SELECT 
        wl.id as log_id,
        wl.date,
        el.exercise_id,
        el.id as exercise_log_id,
        sl.set_number,
        sl.weight,
        sl.reps,
        sl.reps_left,
        sl.reps_right
      FROM Workout_Logs wl
      JOIN Exercise_Logs el ON el.workout_log_id = wl.id
      JOIN Set_Logs sl ON sl.exercise_log_id = el.id
      WHERE wl.workout_id = ? 
      AND wl.date < ?
      ORDER BY wl.date DESC;
    `,
      [workoutId, currentDate]
    );

    // If no previous workout exists, get all exercises for this workout and create zero-value data
    if (previousWorkout.length === 0) {
      const workoutExercises = await database.getAllAsync<{
        id: number;
        single_arm: number;
      }>(`
        SELECT e.id, w.single_arm
        FROM Workout_${workoutName.replace(/\s+/g, "_")} w
        JOIN Exercises e ON e.id = w.exercise_id
      `);

      const defaultData: {
        [key: number]: Array<{
          weight: number;
          reps?: number;
          repsLeft?: number;
          repsRight?: number;
          setNumber: number;
        }>;
      } = {};

      for (const exercise of workoutExercises) {
        defaultData[exercise.id] = Array(3)
          .fill(null)
          .map((_, index) => ({
            weight: 0,
            ...(exercise.single_arm === 1
              ? { repsLeft: 0, repsRight: 0 }
              : { reps: 0 }),
            setNumber: index + 1,
          }));
      }

      return defaultData;
    }

    // Group the data by exercise
    const exerciseData: {
      [key: number]: Array<{
        weight: number;
        reps?: number;
        repsLeft?: number;
        repsRight?: number;
        setNumber: number;
      }>;
    } = {};

    for (const row of previousWorkout) {
      if (!exerciseData[row.exercise_id]) {
        exerciseData[row.exercise_id] = [];
      }
      exerciseData[row.exercise_id].push({
        weight: row.weight,
        reps: row.reps ?? undefined,
        repsLeft: row.reps_left ?? undefined,
        repsRight: row.reps_right ?? undefined,
        setNumber: row.set_number,
      });
    }

    return exerciseData;
  } catch (error) {
    console.error("Error getting previous workout data:", error);
    throw error;
  }
};
