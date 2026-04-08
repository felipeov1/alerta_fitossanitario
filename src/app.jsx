import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  ChevronDown,
  MapPin,
  Leaf,
  Sprout,
  Bug,
  TrendingUp,
  Droplets,
  ThermometerSun,
  X,
  Wind,
  CloudRain,
  AlertTriangle,
  LocateFixed,
  Plus,
  Minus,
} from "lucide-react";

// Palette
const C = {
  green: "#1e6b45",
  greenMid: "#2e8b57",
  greenPale: "#a8d5ba",
  greenUltra: "#e8f5e9",
  blue: "#1976d2",
  red: "#d32f2f",
  textDark: "#111c15",
  background: "#F0F4F1",
  panelBg: "#F5FAF7",
  border: "#dee2e6",
  white: "#FFFFFF",
};

const App = () => {
  const [selectedCrop, setSelectedCrop] = useState("");
  const [selectedPhase, setSelectedPhase] = useState("");
  const [selectedDisease, setSelectedDisease] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [activeMarker, setActiveMarker] = useState(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [filtersApplied, setFiltersApplied] = useState(false);

  useEffect(() => {
    const check = () => {
      const newIsDesktop = window.innerWidth >= 768;
      setIsDesktop(newIsDesktop);
      // Fechar modais quando muda o tamanho da tela
      setShowBottomSheet(false);
      setShowFilterSheet(false);
      setActiveMarker(null);
    };
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  const markers = [
    {
      id: 1,
      lat: -25.47,
      lng: -49.72,
      name: "Estação Lapa",
      status: "Crítico",
      diseaseRisk: "Favorável à Doença",
      fase: "Frutificação, frutos com 20 a 30 mm",
      syncAgo: "12 minutos",
      diseases: [
        {
          name: "Sarna da Maçã",
          sci: "Venturia inaequalis",
          risk: "Favorável à Doença",
          action: "Aplicar fungicida imediatamente",
        },
        {
          name: "Mancha de Gala",
          sci: "Colletotrichum spp.",
          risk: "Favorável à Doença",
          action: "Atenção para a cultivar Gala, risco de desfolha",
        },
      ],
      alertCause: [
        {
          label: "Horas de folha molhada com chuva",
          value: "14 h",
          threshold:
            "Sarna a partir de 9 horas\nMancha de Gala a partir de 10 horas",
          critical: true,
        },
        {
          label: "Temperatura média no período úmido",
          value: "16.2°C",
          threshold: "Acima de 14.9°C favorece a Mancha de Gala",
          critical: true,
        },
        {
          label: "Umidade relativa do ar",
          value: "92%",
          threshold: "Acima de 90% a folha é considerada molhada",
          critical: true,
        },
        {
          label: "Chuva acumulada enquanto folha molhada",
          value: "38 mm",
          threshold: "Qualquer chuva durante molhamento ativa o risco",
          critical: true,
        },
      ],
      codependency: [
        "A folha ficou molhada com chuva por 14 horas seguidas, o suficiente para disparar tanto a Sarna quanto a Mancha de Gala.",
        "Quando a Sarna já está ativa (mais de 10 h de molhamento), a Mancha de Gala é quase sempre ativada ao mesmo tempo se a temperatura estiver acima de 14.9°C.",
        "As duas doenças compartilham as mesmas condições climáticas. Combater uma sem considerar a outra pode deixar o pomar exposto.",
      ],
      station: {
        temp: "16.2°C",
        hum: "92%",
        wetness: "14 h",
        rain: "38 mm",
        wind: "7 km/h",
        dewPoint: "13°C",
      },
    },
    {
      id: 2,
      lat: -26.47,
      lng: -51.99,
      name: "Estação Palmas",
      status: "Atenção",
      diseaseRisk: "Pouco Favorável",
      fase: "Floração plena",
      syncAgo: "8 minutos",
      diseases: [
        {
          name: "Sarna da Maçã",
          sci: "Venturia inaequalis",
          risk: "Pouco Favorável",
          action: "Monitorar: ainda 1 hora abaixo do nível de alerta",
        },
        {
          name: "Mancha de Gala",
          sci: "Colletotrichum spp.",
          risk: "Não Favorável",
          action: "Sem ação necessária no momento",
        },
      ],
      alertCause: [
        {
          label: "Horas de folha molhada com chuva",
          value: "8 h",
          threshold:
            "Sarna a partir de 9 horas\nMancha de Gala a partir de 10 horas",
          critical: true,
        },
        {
          label: "Temperatura média no período úmido",
          value: "15.5°C",
          threshold: "Acima de 14.9°C favorece a Mancha de Gala",
          critical: false,
        },
        {
          label: "Umidade relativa do ar",
          value: "91%",
          threshold: "Acima de 90% a folha é considerada molhada",
          critical: true,
        },
        {
          label: "Chuva acumulada enquanto folha molhada",
          value: "21 mm",
          threshold: "Qualquer chuva durante molhamento ativa o risco",
          critical: true,
        },
      ],
      codependency: [
        "Falta apenas 1 hora de molhamento com chuva para a Sarna atingir nível de alerta.",
        "Se o molhamento continuar, a Mancha de Gala também será ativada ao mesmo tempo, pois a temperatura já está acima do limite (15.5°C é maior que 14.9°C).",
        "Uma única hora adicional de chuva pode elevar as duas doenças para Favorável à Doença simultaneamente.",
      ],
      station: {
        temp: "15.5°C",
        hum: "91%",
        wetness: "8 h",
        rain: "21 mm",
        wind: "10 km/h",
        dewPoint: "11°C",
      },
    },
    {
      id: 3,
      lat: -25.67,
      lng: -50.3,
      name: "Est. São João do Triunfo",
      status: "Saudável",
      diseaseRisk: "Não Favorável",
      fase: "Brotação, ponteira verde",
      syncAgo: "5 minutos",
      diseases: [
        {
          name: "Sarna da Maçã",
          sci: "Venturia inaequalis",
          risk: "Não Favorável",
          action: "Sem ação necessária",
        },
        {
          name: "Mancha de Gala",
          sci: "Colletotrichum spp.",
          risk: "Não Favorável",
          action: "Sem ação necessária",
        },
      ],
      alertCause: [
        {
          label: "Horas de folha molhada com chuva",
          value: "0 h",
          threshold:
            "Sarna a partir de 9 horas\nMancha de Gala a partir de 10 horas",
          critical: false,
        },
        {
          label: "Temperatura média no período úmido",
          value: "Sem dados",
          threshold: "Acima de 14.9°C favorece a Mancha de Gala",
          critical: false,
        },
        {
          label: "Umidade relativa do ar",
          value: "74%",
          threshold: "Acima de 90% a folha é considerada molhada",
          critical: false,
        },
        {
          label: "Chuva acumulada enquanto folha molhada",
          value: "0 mm",
          threshold: "Qualquer chuva durante molhamento ativa o risco",
          critical: false,
        },
      ],
      codependency: [
        "Sem chuva e com umidade abaixo de 90%, a folha não está molhada, nenhuma doença pode ser ativada.",
        "Enquanto não houver molhamento com chuva ao mesmo tempo, o risco permanece zero para ambas as doenças.",
      ],
      station: {
        temp: "14.8°C",
        hum: "74%",
        wetness: "0 h",
        rain: "0 mm",
        wind: "18 km/h",
        dewPoint: "7°C",
      },
    },
  ];

  const riskColor = (r) =>
    r === "Favorável à Doença"
      ? C.red
      : r === "Pouco Favorável"
        ? "#ca8a04"
        : C.greenMid;
  const riskBg = (r) =>
    r === "Favorável à Doença"
      ? "#fef2f2"
      : r === "Pouco Favorável"
        ? "#fefce8"
        : C.greenUltra;
  const riskBorder = (r) =>
    r === "Favorável à Doença"
      ? "#fecaca"
      : r === "Pouco Favorável"
        ? "#fef08a"
        : C.greenPale;

  const handleMarkerClick = (marker) => {
    setActiveMarker(marker);
    setShowBottomSheet(true);
  };

  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return;
    const L = window.L;
    // Centered on Paraná state, zoom 7 shows the full state
    const map = L.map(mapRef.current, { zoomControl: true }).setView(
      [-24.5, -51.5],
      8,
    );
    mapInstanceRef.current = map;

    // Colorful OSM tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    markers.forEach((m) => {
      const icon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `<div style="background-color:${C.white};border:2.5px solid ${C.green};border-radius:50% 50% 50% 0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(30,107,69,0.35);transform:rotate(-45deg);"><svg style="transform:rotate(45deg)" width="16" height="16" viewBox="0 0 24 24" fill="${C.green}" stroke="none"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3.5" fill="${C.greenPale}"/></svg></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });
      const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
      marker.on("click", () => handleMarkerClick(m));
      markersRef.current[m.id] = marker;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = {};
    };
  }, [leafletLoaded]);

  useEffect(() => {
    if (!leafletLoaded || !window.L) return;
    // Não mostrar markers na primeira vez (antes de filtrar)
    if (isDesktop && !filtersApplied) return;

    const L = window.L;
    markers.forEach((m) => {
      const marker = markersRef.current[m.id];
      if (!marker) return;
      const isActive = activeMarker?.id === m.id;
      const icon = L.divIcon({
        className: "custom-leaflet-marker",
        html: isActive
          ? `<div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;">
               <div style="position:absolute;inset:0;border-radius:50%;background:rgba(30,107,69,0.2);animation:ping 1.2s cubic-bezier(0,0,0.2,1) infinite;"></div>
               <div style="background-color:${C.green};border:3px solid ${C.white};border-radius:50% 50% 50% 0;width:42px;height:42px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(30,107,69,0.6);transform:rotate(-45deg);">
                 <svg style="transform:rotate(45deg)" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3.5" fill="${C.greenPale}"/></svg>
               </div>
             </div>`
          : `<div style="background-color:${C.white};border:2.5px solid ${C.green};border-radius:50% 50% 50% 0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(30,107,69,0.35);transform:rotate(-45deg);"><svg style="transform:rotate(45deg)" width="16" height="16" viewBox="0 0 24 24" fill="${C.green}" stroke="none"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3.5" fill="${C.greenPale}"/></svg></div>`,
        iconSize: isActive ? [52, 52] : [36, 36],
        iconAnchor: isActive ? [26, 48] : [18, 36],
      });
      marker.setIcon(icon);
    });
  }, [activeMarker, leafletLoaded]);

  return (
    <div
      className="flex flex-col h-screen font-sans overflow-hidden"
      style={{ background: C.background, color: C.textDark, height: "100dvh" }}
    >
      {/* ── HEADER ── */}
      <header
        className="z-50 shadow-md sticky top-0"
        style={{ background: C.green }}
      >
        <div className="px-3 md:px-6 py-3 flex items-center justify-between md:justify-center gap-3 relative min-h-12">
          {/* Logo + Title */}
          <div className="flex items-center shrink-0 md:absolute md:left-6 gap-2 md:gap-3">
            <img
              src="/images/image.webp"
              alt="IDR-Paraná"
              className="h-8 md:h-10 w-auto object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
            />
            <div
              className="border-l"
              style={{
                borderColor: "rgba(255, 255, 255, 0.3)",
                paddingLeft: "8px",
              }}
            >
              <p
                className="text-[10px] md:text-xs font-semibold text-white"
                style={{ letterSpacing: "0.5px" }}
              >
                SISTEMA
              </p>
              <p
                className="text-[10px] md:text-xs text-white opacity-90"
                style={{ letterSpacing: "0.5px" }}
              >
                Alerta Fitossanitário
              </p>
            </div>
          </div>

          {/* Filters + Filtrar button grouped together - only show after first filter */}
          {filtersApplied && (
            <div className="flex-1 max-w-4xl hidden md:flex items-center gap-2">
              {[
                {
                  icon: Sprout,
                  placeholder: "Fruta",
                  val: selectedCrop,
                  set: setSelectedCrop,
                  opts: ["Maçã", "Pêra", "Pêssego", "Uva", "Ameixa"],
                  locked: false,
                },
                {
                  icon: TrendingUp,
                  placeholder: "Fase",
                  val: selectedPhase,
                  set: setSelectedPhase,
                  opts: [
                    "Dormência",
                    "Brotação",
                    "Floração",
                    "Frutificação",
                    "Colheita",
                  ],
                  locked: !selectedCrop,
                },
                {
                  icon: Bug,
                  placeholder: "Doença",
                  val: selectedDisease,
                  set: setSelectedDisease,
                  opts: [
                    "Sarna da Maçã",
                    "Mancha de Gala",
                    "Podridão Amarga",
                    "Míldio",
                  ],
                  locked: !selectedCrop,
                },
                {
                  icon: MapPin,
                  placeholder: "Município",
                  val: selectedCity,
                  set: setSelectedCity,
                  opts: [
                    "Lapa",
                    "Fraiburgo",
                    "Vacaria",
                    "São Joaquim",
                    "Londrina",
                  ],
                  locked: !selectedCrop,
                },
              ].map((f, i) => (
                <div key={i} className="relative flex-1">
                  <f.icon
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: f.locked ? "#c4c4c4" : C.greenMid }}
                  />
                  <select
                    disabled={f.locked}
                    className="w-full pl-9 pr-7 py-2 appearance-none rounded-lg text-xs font-semibold outline-none transition-all"
                    style={{
                      background: f.locked ? "#f3f4f6" : C.white,
                      border: `1px solid ${f.locked ? "#e5e7eb" : C.border}`,
                      color: f.val ? C.textDark : "#9ca3af",
                      cursor: f.locked ? "not-allowed" : "pointer",
                      opacity: f.locked ? 0.6 : 1,
                    }}
                    value={f.val}
                    onChange={(e) => f.set(e.target.value)}
                  >
                    <option value="">{f.placeholder}</option>
                    {f.opts.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: f.locked ? "#c4c4c4" : C.greenMid }}
                  />
                </div>
              ))}
              <button
                className="shrink-0 px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-md transition-all"
                style={{ background: C.white, color: C.green }}
                onClick={() => setFiltersApplied(true)}
              >
                <Search size={15} /> FILTRAR
              </button>
            </div>
          )}

          {/* Spacer to maintain header height when no filters */}
          {!filtersApplied && (
            <div className="flex-1 max-w-4xl hidden md:flex"></div>
          )}

          {/* Sair */}
          <button
            className="md:hidden px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shrink-0"
            style={{
              background: C.white,
              color: C.green,
              border: `1px solid ${C.border}`,
            }}
          >
            <X size={15} /> SAIR
          </button>
        </div>
      </header>

      {/* ── MAP AREA ── */}
      <main className="flex-1 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ isolation: "isolate", zIndex: 0 }}
        >
          <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
        </div>

        {/* Backdrop for first-access modal */}
        {isDesktop && !filtersApplied && (
          <div
            className="absolute inset-0 z-10 transition-opacity duration-300"
            style={{ background: "rgba(0, 0, 0, 0.5)" }}
          />
        )}

        {/* Desktop first-access modal with filters */}
        {isDesktop && !filtersApplied && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-auto transition-opacity duration-300">
            <div
              className="p-8 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 transform transition-all duration-300"
              style={{ background: C.white, border: `1px solid ${C.border}` }}
            >
              <div className="text-center mb-6">
                <Sprout
                  size={40}
                  style={{ color: C.green, margin: "0 auto 16px" }}
                />
                <p className="font-bold text-lg" style={{ color: C.textDark }}>
                  Defina os filtros para visualizar os dados
                </p>
                <p className="text-sm mt-2" style={{ color: "#6b7280" }}>
                  Selecione as opções abaixo e clique em Filtrar
                </p>
              </div>

              {/* Filter fields grid */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  {
                    icon: Sprout,
                    placeholder: "Fruta",
                    val: selectedCrop,
                    set: setSelectedCrop,
                    opts: ["Maçã", "Pêra", "Pêssego", "Uva", "Ameixa"],
                    locked: false,
                  },
                  {
                    icon: TrendingUp,
                    placeholder: "Fase",
                    val: selectedPhase,
                    set: setSelectedPhase,
                    opts: [
                      "Dormência",
                      "Brotação",
                      "Floração",
                      "Frutificação",
                      "Colheita",
                    ],
                    locked: !selectedCrop,
                  },
                  {
                    icon: Bug,
                    placeholder: "Doença",
                    val: selectedDisease,
                    set: setSelectedDisease,
                    opts: [
                      "Sarna da Maçã",
                      "Mancha de Gala",
                      "Podridão Amarga",
                      "Míldio",
                    ],
                    locked: !selectedCrop,
                  },
                  {
                    icon: MapPin,
                    placeholder: "Município",
                    val: selectedCity,
                    set: setSelectedCity,
                    opts: [
                      "Lapa",
                      "Fraiburgo",
                      "Vacaria",
                      "São Joaquim",
                      "Londrina",
                    ],
                    locked: !selectedCrop,
                  },
                ].map((f, i) => (
                  <div key={i} className="relative">
                    <label
                      className="block text-xs font-semibold mb-1.5"
                      style={{ color: C.green }}
                    >
                      {f.placeholder}
                    </label>
                    <div className="relative">
                      <f.icon
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: f.locked ? "#c4c4c4" : C.greenMid }}
                      />
                      <select
                        disabled={f.locked}
                        className="w-full pl-9 pr-7 py-2.5 appearance-none rounded-lg text-sm font-medium outline-none transition-all"
                        style={{
                          background: f.locked ? "#f3f4f6" : C.white,
                          border: `1px solid ${f.locked ? "#e5e7eb" : C.border}`,
                          color: f.val ? C.textDark : "#9ca3af",
                          cursor: f.locked ? "not-allowed" : "pointer",
                          opacity: f.locked ? 0.6 : 1,
                        }}
                        value={f.val}
                        onChange={(e) => f.set(e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {f.opts.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={13}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: f.locked ? "#c4c4c4" : C.greenMid }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  className="flex-1 px-6 py-3 rounded-lg font-bold text-sm transition-all"
                  style={{
                    background: C.white,
                    color: C.green,
                    border: `1px solid ${C.green}`,
                  }}
                  onClick={() => {
                    setSelectedCrop("");
                    setSelectedPhase("");
                    setSelectedDisease("");
                    setSelectedCity("");
                  }}
                >
                  LIMPAR
                </button>
                <button
                  className="flex-1 px-6 py-3 rounded-lg font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md transition-all"
                  style={{ background: C.green }}
                  onClick={() => setFiltersApplied(true)}
                >
                  <Search size={16} /> FILTRAR
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Backdrop geral */}
        {(showBottomSheet || showFilterSheet) && (
          <div
            className="absolute inset-0 z-10 transition-all duration-300"
            style={{
              background: showFilterSheet ? "rgba(0,0,0,0.45)" : "transparent",
            }}
            onClick={() => {
              setShowBottomSheet(false);
              setShowFilterSheet(false);
            }}
          />
        )}

        {/* Modal primeiro acesso — mobile */}
        {!isDesktop && !filtersApplied && (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center p-6 md:hidden"
            style={{ background: "rgba(0,0,0,0.55)" }}
          >
            <div
              className="w-full rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: C.white }}
            >
              <div
                className="px-6 pt-6 pb-2 flex items-center gap-3"
                style={{ borderBottom: `1px solid ${C.border}` }}
              >
                <div
                  className="p-2 rounded-xl"
                  style={{ background: C.greenUltra }}
                >
                  <Sprout size={20} style={{ color: C.green }} />
                </div>
                <div>
                  <h3
                    className="font-bold text-base leading-tight"
                    style={{ color: C.textDark }}
                  >
                    Defina os filtros
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                    Para visualizar os dados do mapa
                  </p>
                </div>
              </div>
              <div className="px-6 pt-4 pb-6">
                <div className="flex flex-col gap-3">
                  {[
                    {
                      icon: Sprout,
                      placeholder: "Fruta",
                      val: selectedCrop,
                      set: setSelectedCrop,
                      opts: ["Maçã", "Pêra", "Pêssego", "Uva", "Ameixa"],
                      locked: false,
                    },
                    {
                      icon: TrendingUp,
                      placeholder: "Fase",
                      val: selectedPhase,
                      set: setSelectedPhase,
                      opts: [
                        "Dormência",
                        "Brotação",
                        "Floração",
                        "Frutificação",
                        "Colheita",
                      ],
                      locked: !selectedCrop,
                    },
                    {
                      icon: Bug,
                      placeholder: "Doença",
                      val: selectedDisease,
                      set: setSelectedDisease,
                      opts: [
                        "Sarna da Maçã",
                        "Mancha de Gala",
                        "Podridão Amarga",
                        "Míldio",
                      ],
                      locked: !selectedCrop,
                    },
                    {
                      icon: MapPin,
                      placeholder: "Município",
                      val: selectedCity,
                      set: setSelectedCity,
                      opts: [
                        "Lapa",
                        "Fraiburgo",
                        "Vacaria",
                        "São Joaquim",
                        "Londrina",
                      ],
                      locked: !selectedCrop,
                    },
                  ].map((f, i) => (
                    <div key={i} className="relative">
                      <f.icon
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: f.locked ? "#c4c4c4" : C.greenMid }}
                      />
                      <select
                        disabled={f.locked}
                        className="w-full pl-9 pr-7 py-3 appearance-none rounded-xl text-sm font-semibold outline-none"
                        style={{
                          background: f.locked ? "#f3f4f6" : C.background,
                          border: `1px solid ${f.locked ? "#e5e7eb" : C.border}`,
                          color: f.val ? C.textDark : "#9ca3af",
                          opacity: f.locked ? 0.6 : 1,
                          cursor: f.locked ? "not-allowed" : "pointer",
                        }}
                        value={f.val}
                        onChange={(e) => f.set(e.target.value)}
                      >
                        <option value="">{f.placeholder}</option>
                        {f.opts.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={13}
                        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: f.locked ? "#c4c4c4" : C.greenMid }}
                      />
                    </div>
                  ))}
                </div>
                <button
                  className="w-full mt-5 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md"
                  style={{
                    background: selectedCrop ? C.green : "#9ca3af",
                    color: C.white,
                    cursor: selectedCrop ? "pointer" : "not-allowed",
                  }}
                  disabled={!selectedCrop}
                  onClick={() => setFiltersApplied(true)}
                >
                  <Search size={16} /> VER MAPA
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── BOTTOM SHEET ── */}
        <div
          className="absolute z-20 shadow-[0_8px_32px_rgba(0,0,0,0.18)] ease-out overflow-y-auto transition-all duration-300"
          style={{
            borderRadius: "1rem",
            ...(isDesktop
              ? {
                  top: "0.75rem",
                  left: "0.75rem",
                  right: "0.75rem",
                  maxHeight: "calc(100% - 1.5rem)",
                  opacity: showBottomSheet ? 1 : 0,
                  transform: showBottomSheet
                    ? "translateY(0) scale(1)"
                    : "translateY(-12px) scale(0.98)",
                  pointerEvents: showBottomSheet ? "auto" : "none",
                }
              : {
                  bottom: "0.5rem",
                  left: "0.5rem",
                  right: "0.5rem",
                  maxHeight: "calc(100% - 1rem)",
                  transform: showBottomSheet
                    ? "translateY(0)"
                    : "translateY(calc(100% + 1rem))",
                }),
            background: C.white,
          }}
        >
          {/* Handle mobile only */}
          <div
            className="md:hidden w-14 h-1.5 rounded-full mx-auto mt-4 mb-2"
            style={{ background: C.border }}
          />
          {/* Desktop close button — top-right para não sobrepor o conteúdo */}
          {isDesktop && (
            <button
              onClick={() => {
                setShowBottomSheet(false);
                setActiveMarker(null);
              }}
              className="absolute top-3 right-3 z-10 p-2 rounded-xl"
              style={{ background: C.background, color: "#9ca3af" }}
            >
              <X size={18} />
            </button>
          )}

          <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pb-8 pt-3">
            {/* ── Header ── */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="p-2.5 rounded-xl shrink-0"
                  style={{
                    background: riskBg(activeMarker?.diseaseRisk),
                  }}
                >
                  <MapPin
                    size={22}
                    style={{
                      color: riskColor(activeMarker?.diseaseRisk),
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <h2
                    className="text-base font-bold tracking-tight leading-tight"
                    style={{ color: C.textDark }}
                  >
                    {activeMarker?.name}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBottomSheet(false);
                  setActiveMarker(null);
                }}
                className="md:hidden p-2 rounded-xl shrink-0 ml-2"
                style={{ background: C.background, color: "#9ca3af" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Fase + Doença ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div
                className="p-3 rounded-2xl flex items-center gap-3"
                style={{
                  background: C.panelBg,
                  border: `1px solid ${C.border}`,
                }}
              >
                <div
                  className="p-2 rounded-xl shrink-0"
                  style={{ background: C.greenUltra, color: C.green }}
                >
                  <Sprout size={18} />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "#9ca3af" }}
                  >
                    Fase Fenológica
                  </p>
                  <p
                    className="text-sm font-bold mt-0.5 leading-tight"
                    style={{ color: C.textDark }}
                  >
                    {activeMarker?.fase}
                  </p>
                </div>
              </div>
              <div
                className="p-3 rounded-2xl"
                style={{
                  background: C.panelBg,
                  border: `1px solid ${C.border}`,
                }}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <Bug
                    size={14}
                    style={{ color: riskColor(activeMarker?.diseaseRisk) }}
                  />
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "#9ca3af" }}
                  >
                    Doenças Monitoradas
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {activeMarker?.diseases?.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-2 p-2 rounded-xl"
                      style={{
                        background: C.white,
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      <div className="min-w-0">
                        <p
                          className="text-xs font-bold leading-tight"
                          style={{ color: C.textDark }}
                        >
                          {d.name}
                        </p>
                        <p
                          className="text-[10px] italic"
                          style={{ color: "#6b7280" }}
                        >
                          {d.sci}
                        </p>
                        <p
                          className="text-[10px] mt-1"
                          style={{ color: "#4b5563" }}
                        >
                          {d.action}
                        </p>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide text-white shrink-0 mt-0.5"
                        style={{ background: riskColor(d.risk) }}
                      >
                        {d.risk}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Causa do Alerta ── */}
            <div
              className="p-3 rounded-2xl mb-3"
              style={{ background: C.panelBg, border: `1px solid ${C.border}` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle
                  size={13}
                  style={{ color: riskColor(activeMarker?.diseaseRisk) }}
                />
                <p
                  className="text-[10px] font-black uppercase tracking-wider"
                  style={{ color: C.textDark }}
                >
                  Causa do Alerta
                </p>
              </div>
              {/* Mobile: lista horizontal compacta | Desktop: grid de cards */}
              <div className="flex flex-col gap-2 sm:hidden">
                {activeMarker?.alertCause?.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{
                      background: v.critical
                        ? riskBg(activeMarker.diseaseRisk)
                        : C.white,
                      border: `1px solid ${v.critical ? riskBorder(activeMarker.diseaseRisk) : C.border}`,
                    }}
                  >
                    <div className="min-w-0 mr-3">
                      <p
                        className="text-xs font-semibold"
                        style={{ color: C.textDark }}
                      >
                        {v.label}
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: "#9ca3af", whiteSpace: "pre-line" }}
                      >
                        {v.threshold}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className="text-base font-black"
                        style={{
                          color: v.critical
                            ? riskColor(activeMarker.diseaseRisk)
                            : C.textDark,
                        }}
                      >
                        {v.value}
                      </p>
                      <div className="flex items-center justify-end gap-1">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background: v.critical
                              ? riskColor(activeMarker.diseaseRisk)
                              : C.greenMid,
                          }}
                        />
                        <span
                          className="text-[9px] font-bold"
                          style={{
                            color: v.critical
                              ? riskColor(activeMarker.diseaseRisk)
                              : C.greenMid,
                          }}
                        >
                          {v.critical ? "Acima" : "Normal"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                {activeMarker?.alertCause?.map((v, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl"
                    style={{
                      background: v.critical
                        ? riskBg(activeMarker.diseaseRisk)
                        : C.white,
                      border: `1px solid ${v.critical ? riskBorder(activeMarker.diseaseRisk) : C.border}`,
                    }}
                  >
                    <p
                      className="text-[9px] font-bold uppercase tracking-wide mb-1"
                      style={{ color: "#9ca3af" }}
                    >
                      {v.label}
                    </p>
                    <p
                      className="text-lg font-black"
                      style={{
                        color: v.critical
                          ? riskColor(activeMarker.diseaseRisk)
                          : C.textDark,
                      }}
                    >
                      {v.value}
                    </p>
                    <p
                      className="text-[10px] mt-0.5"
                      style={{ color: "#9ca3af", whiteSpace: "pre-line" }}
                    >
                      {v.threshold}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: v.critical
                            ? riskColor(activeMarker.diseaseRisk)
                            : C.greenMid,
                        }}
                      />
                      <span
                        className="text-[9px] font-bold"
                        style={{
                          color: v.critical
                            ? riskColor(activeMarker.diseaseRisk)
                            : C.greenMid,
                        }}
                      >
                        {v.critical ? "Acima do limiar" : "Normal"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Codependência ── */}
            <div
              className="p-3 rounded-2xl mb-3"
              style={{ background: C.panelBg, border: `1px solid ${C.border}` }}
            >
              <p
                className="text-[10px] font-black uppercase tracking-wider mb-2.5"
                style={{ color: C.textDark }}
              >
                Condições Agravantes
              </p>
              <div className="flex flex-col gap-2">
                {activeMarker?.codependency?.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{
                        background: riskColor(activeMarker.diseaseRisk),
                      }}
                    />
                    <p
                      className="text-xs leading-snug"
                      style={{ color: "#4b5563" }}
                    >
                      {c}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Dados da Estação ── */}
            <div
              className="p-3 rounded-2xl mb-4"
              style={{ background: C.panelBg, border: `1px solid ${C.border}` }}
            >
              <p
                className="text-[10px] font-black uppercase tracking-wider mb-2.5"
                style={{ color: C.textDark }}
              >
                Dados da Estação
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  {
                    icon: ThermometerSun,
                    label: "Temperatura",
                    val: activeMarker?.station?.temp,
                    bg: "#fff7ed",
                    color: "#f97316",
                  },
                  {
                    icon: Droplets,
                    label: "Umidade",
                    val: activeMarker?.station?.hum,
                    bg: "#eff6ff",
                    color: C.blue,
                  },
                  {
                    icon: Wind,
                    label: "Folha Molhada",
                    val: activeMarker?.station?.wetness,
                    bg: C.greenUltra,
                    color: C.greenMid,
                  },
                  {
                    icon: CloudRain,
                    label: "Chuva (7d)",
                    val: activeMarker?.station?.rain,
                    bg: "#eff6ff",
                    color: C.blue,
                  },
                  {
                    icon: Wind,
                    label: "Vento",
                    val: activeMarker?.station?.wind,
                    bg: C.background,
                    color: "#6b7280",
                  },
                  {
                    icon: Droplets,
                    label: "Pto. Orvalho",
                    val: activeMarker?.station?.dewPoint,
                    bg: C.greenUltra,
                    color: C.greenMid,
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl sm:flex-col sm:items-center sm:text-center sm:p-3"
                    style={{
                      background: C.white,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div
                      className="p-1.5 rounded-lg shrink-0 sm:mb-1"
                      style={{ background: s.bg, color: s.color }}
                    >
                      <s.icon size={14} />
                    </div>
                    <div className="sm:text-center">
                      <p
                        className="text-[9px] font-bold uppercase tracking-wide leading-tight"
                        style={{ color: "#9ca3af" }}
                      >
                        {s.label}
                      </p>
                      <p
                        className="text-sm font-black mt-0.5"
                        style={{ color: C.textDark }}
                      >
                        {s.val}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── FILTER SHEET (mobile) ── */}
        <div
          className="fixed left-0 right-0 z-20 rounded-t-3xl shadow-[0_-10px_40px_-8px_rgba(0,0,0,0.25)] transition-all duration-500 ease-out md:hidden"
          style={{
            bottom: 0,
            top: "auto",
            maxHeight: "85vh",
            transform: showFilterSheet ? "translateY(0)" : "translateY(100%)",
            background: C.white,
          }}
        >
          <div
            className="w-14 h-1.5 rounded-full mx-auto mt-3 mb-1"
            style={{ background: C.border }}
          />
          <div
            className="px-5 pb-8 pt-2 overflow-y-auto"
            style={{ maxHeight: "calc(85vh - 40px)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold" style={{ color: C.textDark }}>
                Filtros
              </h3>
              <button
                onClick={() => setShowFilterSheet(false)}
                className="p-1.5 rounded-lg"
                style={{ background: C.background, color: "#9ca3af" }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {[
                {
                  icon: Sprout,
                  placeholder: "Fruta",
                  val: selectedCrop,
                  set: setSelectedCrop,
                  opts: ["Maçã", "Pêra", "Pêssego", "Uva", "Ameixa"],
                  locked: false,
                },
                {
                  icon: TrendingUp,
                  placeholder: "Fase",
                  val: selectedPhase,
                  set: setSelectedPhase,
                  opts: [
                    "Dormência",
                    "Brotação",
                    "Floração",
                    "Frutificação",
                    "Colheita",
                  ],
                  locked: !selectedCrop,
                },
                {
                  icon: Bug,
                  placeholder: "Doença",
                  val: selectedDisease,
                  set: setSelectedDisease,
                  opts: [
                    "Sarna da Maçã",
                    "Mancha de Gala",
                    "Podridão Amarga",
                    "Míldio",
                  ],
                  locked: !selectedCrop,
                },
                {
                  icon: MapPin,
                  placeholder: "Município",
                  val: selectedCity,
                  set: setSelectedCity,
                  opts: [
                    "Lapa",
                    "Fraiburgo",
                    "Vacaria",
                    "São Joaquim",
                    "Londrina",
                  ],
                  locked: !selectedCrop,
                },
              ].map((f, i) => (
                <div key={i} className="relative">
                  <f.icon
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: f.locked ? "#c4c4c4" : C.greenMid }}
                  />
                  <select
                    disabled={f.locked}
                    className="w-full pl-9 pr-7 py-3 appearance-none rounded-xl text-sm font-semibold outline-none"
                    style={{
                      background: f.locked ? "#f3f4f6" : C.background,
                      border: `1px solid ${f.locked ? "#e5e7eb" : C.border}`,
                      color: f.val ? C.textDark : "#9ca3af",
                      opacity: f.locked ? 0.6 : 1,
                      cursor: f.locked ? "not-allowed" : "pointer",
                    }}
                    value={f.val}
                    onChange={(e) => f.set(e.target.value)}
                  >
                    <option value="">{f.placeholder}</option>
                    {f.opts.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: f.locked ? "#c4c4c4" : C.greenMid }}
                  />
                </div>
              ))}
            </div>
            <button
              className="w-full mt-5 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md"
              style={{
                background: selectedCrop ? C.green : "#9ca3af",
                color: C.white,
                cursor: selectedCrop ? "pointer" : "not-allowed",
              }}
              disabled={!selectedCrop}
              onClick={() => {
                setShowFilterSheet(false);
                setFiltersApplied(true);
              }}
            >
              <Search size={16} /> APLICAR FILTROS
            </button>
          </div>
        </div>

        {/* Floating filter button (mobile only) - Fixed position */}
        {!showFilterSheet && (
          <button
            className="fixed right-4 bottom-6 z-20 md:hidden flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm shadow-xl transition-all"
            style={{ background: C.green, color: C.white }}
            onClick={() => setShowFilterSheet(true)}
          >
            <Search size={16} /> FILTROS
          </button>
        )}

        {/* Map controls */}
        {!showBottomSheet && (
          <div className="absolute right-5 top-5 z-20 flex flex-col gap-2">
            {/* Centralizar */}
            <button
              title="Centralizar no Paraná"
              onClick={() => mapInstanceRef.current?.setView([-24.5, -51.5], 8)}
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-all hover:scale-105"
              style={{
                background: C.white,
                color: C.green,
                border: `1px solid ${C.border}`,
              }}
            >
              <LocateFixed size={18} />
            </button>
            {/* Zoom in */}
            <button
              title="Mais zoom"
              onClick={() => mapInstanceRef.current?.zoomIn()}
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-all hover:scale-105"
              style={{
                background: C.white,
                color: C.green,
                border: `1px solid ${C.border}`,
              }}
            >
              <Plus size={18} />
            </button>
            {/* Zoom out */}
            <button
              title="Menos zoom"
              onClick={() => mapInstanceRef.current?.zoomOut()}
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-all hover:scale-105"
              style={{
                background: C.white,
                color: C.green,
                border: `1px solid ${C.border}`,
              }}
            >
              <Minus size={18} />
            </button>
          </div>
        )}

        {/* Legend panel */}
        {!showBottomSheet && (
          <div className="absolute left-6 bottom-6 z-10 animate-in fade-in duration-500">
            <div
              className="p-4 rounded-xl shadow-lg w-56"
              style={{
                background: "rgba(245,250,247,0.92)",
                backdropFilter: "blur(8px)",
                border: `1px solid ${C.border}`,
              }}
            >
              <h3
                className="text-[10px] font-bold uppercase tracking-wider mb-3"
                style={{ color: "#6b7280" }}
              >
                Sensores Ativos
              </h3>
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: C.greenMid }}
                />
                <span
                  className="text-xs font-semibold"
                  style={{ color: C.textDark }}
                >
                  Monitoramento em Tempo Real
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
