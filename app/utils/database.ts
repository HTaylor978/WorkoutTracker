import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

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
  }
  return db;
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
