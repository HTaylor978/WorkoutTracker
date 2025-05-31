import { Stack } from "expo-router";
import { useEffect } from "react";
import { initDatabase } from "./utils/database";

export default function RootLayout() {
  // Initialize database when the app starts
  useEffect(() => {
    const init = async () => {
      try {
        console.log("Starting database initialization...");
        await initDatabase();
        console.log("Database initialized successfully");
      } catch (error) {
        console.error("Error initializing database:", error);
      }
    };

    init();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="workout"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
