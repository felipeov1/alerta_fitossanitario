import { Sprout } from "lucide-react";

const C = {
  green: "#1e6b45",
  greenMid: "#2e8b57",
  greenPale: "#a8d5ba",
  greenUltra: "#e8f5e9",
  background: "#F0F4F1",
  white: "#FFFFFF",
  textDark: "#111c15",
  border: "#dee2e6",
};

export default function Home() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen font-sans"
      style={{ background: C.background }}
    >
      <div
        className="p-10 rounded-3xl shadow-xl flex flex-col items-center gap-8 w-full max-w-sm"
        style={{ background: C.white, border: `1px solid ${C.border}` }}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-4 rounded-2xl" style={{ background: C.greenUltra }}>
            <Sprout size={36} style={{ color: C.green }} />
          </div>
          <h1 className="text-xl font-black" style={{ color: C.textDark }}>
            Sistema de Alerta Fitossanitário
          </h1>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Selecione a versão para visualizar
          </p>
        </div>

        {/* Versões */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => window.open("/v1", "_blank")}
            className="w-full py-4 px-5 rounded-xl font-bold text-base transition-all hover:opacity-90 flex flex-col items-center gap-0.5"
            style={{ background: C.green, color: C.white }}
          >
            <span className="text-base font-black">Versão 1 — Alerta Diário</span>
            <span className="text-xs font-medium opacity-75">/v1</span>
          </button>

          <button
            onClick={() => window.open("/v2", "_blank")}
            className="w-full py-4 px-5 rounded-xl font-bold text-base transition-all hover:opacity-90 flex flex-col items-center gap-0.5"
            style={{
              background: C.white,
              color: C.green,
              border: `2px solid ${C.green}`,
            }}
          >
            <span className="text-base font-black">Versão 2 — Alerta Previsão</span>
            <span className="text-xs font-medium opacity-60">/v2</span>
          </button>
        </div>
      </div>
    </div>
  );
}
