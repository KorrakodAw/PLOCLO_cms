"use client";
import Login from "../components/LoginForm";

// Mark as client component if you use useTranslation here

export default function HomePage() {
  return (
    <div className="align-middle justify-center text-center">
      <h1 className="text-3xl font-bold mb-4">Please Login first</h1>
      <Login />
    </div>
  );
}
