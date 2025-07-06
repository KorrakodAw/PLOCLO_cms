"use client"; // Mark as client component if you use useTranslation here

export default function HomePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">{"greeting"}</h1>
      <p className="text-lg">This is content on the home page.</p>
    </div>
  );
}
