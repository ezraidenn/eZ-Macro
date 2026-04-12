export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 text-6xl">📴</div>
      <h1 className="mb-2 text-2xl font-bold">Sin conexión</h1>
      <p className="text-muted-foreground">
        Parece que no tienes conexión a internet.
        <br />
        Algunas funciones pueden no estar disponibles.
      </p>
    </div>
  );
}
