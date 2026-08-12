"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 text-6xl">📴</div>
      <h1 className="mb-2 text-2xl font-bold">Sin conexión</h1>
      <p className="text-muted-foreground">
        Parece que no tienes conexión a internet.
        <br />
        Tus datos guardados siguen disponibles en las pantallas que ya visitaste.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-black active:bg-emerald-600 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}
