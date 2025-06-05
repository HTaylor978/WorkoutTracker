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
    muscles: ["Upper Chest", "Mid/Lower Chest", "Front Delt", "Tricep"],
  },
  {
    name: "Bicep Curls",
    muscles: ["Bicep", "Forearm Flexors"],
  },
  {
    name: "Squats",
    muscles: ["Quads", "Hamstrings", "Glutes", "Adductors"],
  },
  {
    name: "Deadlift",
    muscles: ["Upper Back", "Lats", "Hamstrings", "Glutes", "Traps"],
  },
  {
    name: "Pull-ups",
    muscles: ["Lats", "Bicep", "Rear Delt", "Upper Back"],
  },
  {
    name: "Shoulder Press",
    muscles: ["Front Delt", "Side Delt", "Tricep"],
  },
  {
    name: "Tricep Pushdown",
    muscles: ["Tricep"],
  },
  {
    name: "Lat Pulldown",
    muscles: ["Lats", "Bicep", "Upper Back"],
  },
];

const presetMuscles = [
  "Neck",
  "Upper Chest",
  "Mid/Lower Chest",
  "Abs",
  "Obliques",
  "Front Delt",
  "Side Delt",
  "Rear Delt",
  "Bicep",
  "Tricep",
  "Forearm Flexors",
  "Forearm Extensors",
  "Traps",
  "Upper Back",
  "Lats",
  "Quads",
  "Adductors",
  "Abductors",
  "Glutes",
  "Hamstrings",
  "Calves",
  "Tibialis",
];

const loadPresetData = async () => {
  const database = await getDb();

  try {
    // First, check and load muscles
    console.log("Loading preset muscles...");
    for (const muscleName of presetMuscles) {
      try {
        // Check if muscle already exists
        const existingMuscle = await database.getFirstAsync<{ id: number }>(
          "SELECT id FROM Muscles WHERE muscle_name = ?;",
          [muscleName]
        );

        if (!existingMuscle) {
          await database.runAsync(
            "INSERT INTO Muscles (muscle_name) VALUES (?);",
            [muscleName]
          );
        }
      } catch (error) {
        console.error(`Error inserting muscle ${muscleName}:`, error);
      }
    }

    // Then check and load preset exercises
    console.log("Loading preset exercises...");
    for (const exercise of presetExercises) {
      try {
        // Check if exercise already exists
        const existingExercise = await database.getFirstAsync<{ id: number }>(
          "SELECT id FROM Exercises WHERE exercise_name = ?;",
          [exercise.name]
        );

        let exerciseId;
        if (!existingExercise) {
          // Add exercise
          const result = await database.runAsync(
            "INSERT INTO Exercises (exercise_name) VALUES (?);",
            [exercise.name]
          );
          exerciseId = result.lastInsertRowId;
        } else {
          exerciseId = existingExercise.id;
        }

        // Add muscles and create exercise-muscle relationships
        for (const muscleName of exercise.muscles) {
          // Get muscle id
          const muscleResult = await database.getFirstAsync<DbMuscle>(
            "SELECT id FROM Muscles WHERE muscle_name = ?;",
            [muscleName]
          );

          if (muscleResult) {
            // Create exercise-muscle relationship
            await database.runAsync(
              "INSERT INTO Exercise_Muscles (exercise_id, muscle_id) VALUES (?, ?);",
              [exerciseId, muscleResult.id]
            );
          }
        }
      } catch (error) {
        console.error(`Error processing exercise ${exercise.name}:`, error);
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

    // Enable foreign keys and write access
    await db.execAsync("PRAGMA foreign_keys = ON;");
    await db.execAsync("PRAGMA journal_mode = WAL;");
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

      // Create the Exercise_Muscles table with the new structure
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS Exercise_Muscles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          exercise_id INTEGER,
          muscle_id INTEGER,
          FOREIGN KEY (exercise_id) REFERENCES Exercises(id),
          FOREIGN KEY (muscle_id) REFERENCES Muscles(id)
        );`
      );

      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS Workout_Logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workout_id INTEGER,
          workout_name TEXT NOT NULL,
          date TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT
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
export const getMuscles = async () => {
  const database = await getDb();
  const muscles = await database.getAllAsync(
    "SELECT * FROM Muscles ORDER BY muscle_name;"
  );
  return muscles;
};

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
  }>,
  workoutName: string,
  startTime: string
) => {
  const database = await getDb();

  try {
    // Insert workout log and get its ID
    const workoutLogResult = await database.runAsync(
      "INSERT INTO Workout_Logs (workout_id, workout_name, date, start_time, end_time) VALUES (?, ?, ?, ?, ?);",
      [
        workoutId,
        workoutName,
        new Date().toISOString(),
        startTime,
        new Date().toISOString(), // End time is now
      ]
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

    // Get all workout logs
    const logs = await database.getAllAsync(`
      SELECT 
        wl.id as log_id,
        wl.date,
        wl.workout_id,
        wl.workout_name,
        wl.start_time,
        wl.end_time
      FROM Workout_Logs wl
      ORDER BY wl.date DESC;
    `);
    console.log("Retrieved logs:", logs);
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
      start_time: string;
      end_time: string;
    }>(
      `
      SELECT 
        wl.id as log_id,
        wl.date,
        wl.workout_id,
        wl.workout_name,
        wl.start_time,
        wl.end_time
      FROM Workout_Logs wl
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
  }>,
  workoutName: string
) => {
  const database = await getDb();
  try {
    // Get the existing workout log to preserve the end time
    const existingLog = await database.getFirstAsync<{
      end_time: string;
    }>("SELECT end_time FROM Workout_Logs WHERE id = ?;", [logId]);

    // Update the workout name but keep the existing end time
    await database.runAsync(
      "UPDATE Workout_Logs SET workout_name = ? WHERE id = ?;",
      [workoutName, logId]
    );

    // Delete all sets for each exercise log
    const exerciseLogs = await database.getAllAsync<{ id: number }>(
      "SELECT id FROM Exercise_Logs WHERE workout_log_id = ?;",
      [logId]
    );

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

    // If no previous workout exists for this workout_id
    if (previousWorkout.length === 0) {
      // For quick workouts (workoutId === 0) or when no previous data exists for this workout,
      // try to find the most recent data for each exercise from any workout
      if (workoutId === 0) {
        const exerciseData: {
          [key: number]: Array<{
            weight: number;
            reps?: number;
            repsLeft?: number;
            repsRight?: number;
            setNumber: number;
          }>;
        } = {};

        // Get the most recent workout data for each exercise
        const recentExerciseData =
          await database.getAllAsync<PreviousWorkoutRow>(
            `
          WITH RankedWorkouts AS (
            SELECT 
              wl.id as log_id,
              wl.date,
              el.exercise_id,
              el.id as exercise_log_id,
              sl.set_number,
              sl.weight,
              sl.reps,
              sl.reps_left,
              sl.reps_right,
              ROW_NUMBER() OVER (PARTITION BY el.exercise_id ORDER BY wl.date DESC) as rn
            FROM Workout_Logs wl
            JOIN Exercise_Logs el ON el.workout_log_id = wl.id
            JOIN Set_Logs sl ON sl.exercise_log_id = el.id
            WHERE wl.date < ?
          )
          SELECT * FROM RankedWorkouts WHERE rn = 1;
        `,
            [currentDate]
          );

        // Group the data by exercise
        for (const row of recentExerciseData) {
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
      }

      // For template workouts, get exercises from the template
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

// Get previous data for a specific exercise
export const getPreviousExerciseData = async (
  exerciseId: number,
  currentDate: string
) => {
  const database = await getDb();
  try {
    // Get all workout data for this exercise
    const exerciseSets = await database.getAllAsync<{
      set_number: number;
      weight: number;
      reps: number | null;
      reps_left: number | null;
      reps_right: number | null;
      single_arm: number;
      date: string;
    }>(
      `
      SELECT 
        sl.set_number,
        sl.weight,
        sl.reps,
        sl.reps_left,
        sl.reps_right,
        el.single_arm,
        wl.date
      FROM Workout_Logs wl
      JOIN Exercise_Logs el ON el.workout_log_id = wl.id
      JOIN Set_Logs sl ON sl.exercise_log_id = el.id
      WHERE el.exercise_id = ? AND wl.date < ?
      ORDER BY wl.date DESC;
    `,
      [exerciseId, currentDate]
    );

    if (exerciseSets.length === 0) {
      return [];
    }

    return exerciseSets.map((set) => ({
      date: set.date,
      weight: set.weight,
      ...(set.single_arm === 1
        ? { repsLeft: set.reps_left || 0, repsRight: set.reps_right || 0 }
        : { reps: set.reps || 0 }),
      setNumber: set.set_number,
    }));
  } catch (error) {
    console.error("Error getting previous exercise data:", error);
    throw error;
  }
};

// Add test workouts for stats visualization
export const addTestWorkouts = async () => {
  const database = await getDb();
  try {
    // Get the Bench Press exercise ID
    const benchPress = await database.getFirstAsync<{ id: number }>(
      "SELECT id FROM Exercises WHERE exercise_name = 'Bench Press';"
    );

    if (!benchPress) {
      throw new Error("Bench Press exercise not found");
    }

    // Create dates for workouts, starting from 7 days ago
    const baseDate = new Date();
    baseDate.setHours(10, 0, 0, 0); // Set to 10 AM

    // First phase: 4-5 workouts at 100kg with increasing reps
    const phase1Workouts = 4 + Math.floor(Math.random() * 2); // 4 or 5 workouts
    let startReps = 6;

    for (let i = 0; i < phase1Workouts; i++) {
      const workoutDate = new Date(baseDate);
      workoutDate.setDate(workoutDate.getDate() - (7 - i)); // Space workouts 1 day apart

      // Random number of sets (2-3)
      const numSets = 2 + Math.floor(Math.random() * 2);

      // Create workout log
      const workoutLogResult = await database.runAsync(
        "INSERT INTO Workout_Logs (workout_id, workout_name, date, start_time, end_time) VALUES (?, ?, ?, ?, ?);",
        [
          0, // Quick workout
          "Test Workout",
          workoutDate.toISOString(),
          workoutDate.toISOString(),
          new Date(workoutDate.getTime() + 3600000).toISOString(), // 1 hour later
        ]
      );

      // Add exercise log
      const exerciseLogResult = await database.runAsync(
        "INSERT INTO Exercise_Logs (workout_log_id, exercise_id, single_arm) VALUES (?, ?, ?);",
        [workoutLogResult.lastInsertRowId, benchPress.id, 0]
      );

      // Add sets with increasing reps
      for (let setNum = 1; setNum <= numSets; setNum++) {
        await database.runAsync(
          "INSERT INTO Set_Logs (exercise_log_id, set_number, reps, weight) VALUES (?, ?, ?, ?);",
          [exerciseLogResult.lastInsertRowId, setNum, startReps + i, 100]
        );
      }
    }

    // Second phase: 2-3 workouts at 110kg with reset and increasing reps
    const phase2Workouts = 2 + Math.floor(Math.random() * 2); // 2 or 3 workouts
    startReps = 4; // Reset reps for higher weight

    for (let i = 0; i < phase2Workouts; i++) {
      const workoutDate = new Date(baseDate);
      workoutDate.setDate(workoutDate.getDate() - (7 - phase1Workouts - i));

      // Random number of sets (2-3)
      const numSets = 2 + Math.floor(Math.random() * 2);

      // Create workout log
      const workoutLogResult = await database.runAsync(
        "INSERT INTO Workout_Logs (workout_id, workout_name, date, start_time, end_time) VALUES (?, ?, ?, ?, ?);",
        [
          0,
          "Test Workout",
          workoutDate.toISOString(),
          workoutDate.toISOString(),
          new Date(workoutDate.getTime() + 3600000).toISOString(),
        ]
      );

      // Add exercise log
      const exerciseLogResult = await database.runAsync(
        "INSERT INTO Exercise_Logs (workout_log_id, exercise_id, single_arm) VALUES (?, ?, ?);",
        [workoutLogResult.lastInsertRowId, benchPress.id, 0]
      );

      // Add sets with increasing reps
      for (let setNum = 1; setNum <= numSets; setNum++) {
        await database.runAsync(
          "INSERT INTO Set_Logs (exercise_log_id, set_number, reps, weight) VALUES (?, ?, ?, ?);",
          [exerciseLogResult.lastInsertRowId, setNum, startReps + i, 110]
        );
      }
    }

    return true;
  } catch (error) {
    console.error("Error adding test workouts:", error);
    throw error;
  }
};
