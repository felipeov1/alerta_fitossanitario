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

// Cálculos de risco baseado na lógica de Fitopatologia
const calculateDiseaseRisk = (station) => {
  if (!station) {
    return { sarnaRisk: "Não Favorável", galaRisk: "Não Favorável" };
  }

  // Mapeia os nomes corretos das propriedades
  const ur = station.hum;
  const chuva = station.rain;
  const tmed = station.temp;

  // Validações
  if (ur === undefined || chuva === undefined || tmed === undefined) {
    return { sarnaRisk: "Não Favorável", galaRisk: "Não Favorável" };
  }

  // Extrai números das strings (ex: "92%" -> 92, "38 mm" -> 38, "16.2°C" -> 16.2)
  const urValue =
    typeof ur === "string" ? parseFloat(ur.match(/\d+\.?\d*/)?.[0] || 0) : ur;
  const chuvaValue =
    typeof chuva === "string"
      ? parseFloat(chuva.match(/\d+\.?\d*/)?.[0] || 0)
      : chuva;
  const tmedValue =
    typeof tmed === "string"
      ? parseFloat(tmed.match(/\d+(?:\.\d+)?/)?.[0] || 0)
      : tmed;

  console.log("Station calc:", {
    ur,
    chuva,
    tmed,
    urValue,
    chuvaValue,
    tmedValue,
  });

  // PMF (Período de Molhamento Foliar): 1 se UR > 90%, senão 0
  const pmf = urValue > 90 ? 1 : 0;

  // PMF com Chuva: 1 se teve molhamento E chuva
  const pmfChuva = pmf === 1 && chuvaValue > 0 ? 1 : 0;

  // PMF em Horas (simulado com base em chuva e umidade)
  // Se houve chuva com UR alta, acumula horas (cada mm de chuva = ~1h de molhamento)
  const pmfHs = pmfChuva > 0 ? chuvaValue : 0;

  // Temperatura média acumulada durante molhamento
  const tmedAc = pmfChuva > 0 ? tmedValue : 0;

  console.log("Calculations:", {
    pmf,
    pmfChuva,
    pmfHs,
    tmedAc,
    product: pmfHs * tmedAc,
  });

  // SARNA: Precisa pmfChuva E horas E temperatura
  let sarnaRisk = "Não Favorável";
  if (pmfChuva < 1) {
    sarnaRisk = "Não Favorável";
  } else if (pmfHs < 9) {
    sarnaRisk = "Pouco Favorável";
  } else if (pmfHs < 900) {
    // Verifica se (pmfHs × tmedAc) >= 140
    if (pmfHs * tmedAc >= 140) {
      sarnaRisk = "Favorável à Doença";
    } else {
      sarnaRisk = "Pouco Favorável";
    }
  }

  console.log("Disease Risk:", { sarnaRisk });

  // MANCHA DE GALA: Precisa de pmfHs >= 10 E tmedAc > 14.9
  let galaRisk = "Não Favorável";
  if (pmfHs >= 10 && tmedAc > 14.9) {
    galaRisk = "Favorável à Doença";
  }

  return { sarnaRisk, galaRisk };
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
  const [filterLayout, setFilterLayout] = useState("compact"); // "compact" ou "sidebar"

  const bottomSheetRef = useRef(null);
  const touchStartY = useRef(null);

  // Lógica de "Arrastar para baixo" (Swipe to close)
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (!touchStartY.current) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    // Se o usuário arrastou mais de 60px para baixo E o scroll do modal estiver no topo
    if (diff > 60 && (!bottomSheetRef.current || bottomSheetRef.current.scrollTop <= 0)) {
      setShowBottomSheet(false);
      setActiveMarker(null);
      touchStartY.current = null; // Reseta para não disparar múltiplas vezes
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

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

  // Calcula os riscos de doenças com base nos dados da estação
  const getCalculatedRisks = (station) => {
    const risks = calculateDiseaseRisk(station);
    return risks;
  };

  // Calcula o risco máximo da estação (o mais grave entre as doenças)
  const getMaxRisk = (station) => {
    if (!station) return "Não Favorável";

    const risks = calculateDiseaseRisk(station);
    const riskOrder = {
      "Favorável à Doença": 3,
      "Pouco Favorável": 2,
      "Não Favorável": 1,
    };
    const maxRisk = Math.max(
      riskOrder[risks.sarnaRisk] || 0,
      riskOrder[risks.galaRisk] || 0,
    );
    // Retorna o risco correspondente ao valor máximo
    if (maxRisk === 3) return "Favorável à Doença";
    if (maxRisk === 2) return "Pouco Favorável";
    return "Não Favorável";
  };

  const markers = [
    {
      id: 1,
      lat: -25.47,
      lng: -49.72,
      name: "Estação Lapa",
      city: "Lapa",
      status: "Crítico",
      diseaseRisk: "Favorável à Doença",
      fase: "Frutificação, frutos com 20 a 30 mm",
      syncAgo: "12 minutos",
      diseases: [
        {
          name: "Sarna da Maçã",
          sci: "Venturia inaequalis",
          risk: "Favorável à Doença",
          description:
            "Doença fúngica que causa manchas escuras e lesões na superfície dos frutos e folhas, reduzindo a qualidade comercial e afetando a produtividade.",
          conditions:
            "Requer períodos prolongados de folha molhada com chuva, umidade relativa acima de 90% e temperaturas moderadas.",
          alertCause: [
            {
              label: "Folha molhada com chuva",
              value: "38 h",
              threshold: "Alerta: 9 horas",
              critical: true,
            },
            {
              label: "Umidade relativa",
              value: "92%",
              threshold: "Alerta: acima de 90%",
              critical: true,
            },
            {
              label: "Chuva acumulada",
              value: "38 mm",
              threshold: "Qualquer chuva ativa o risco",
              critical: true,
            },
          ],
        },
        {
          name: "Mancha de Gala",
          sci: "Colletotrichum spp.",
          risk: "Favorável à Doença",
          action: "Atenção para a cultivar Gala, risco de desfolha",
          description:
            "Doença fúngica que causa lesões necróticas nas folhas, levando ao ressecamento prematuro e desfolha significativa, comprometendo a produção.",
          conditions:
            "Desenvolve-se sob molhamento prolongado, temperaturas entre 15-20°C e alta umidade relativa.",
          alertCause: [
            {
              label: "Folha molhada com chuva",
              value: "38 h",
              threshold: "Alerta: 10 horas",
              critical: true,
            },
            {
              label: "Temperatura no período úmido",
              value: "16.2°C",
              threshold: "Alerta: acima de 14.9°C",
              critical: true,
            },
            {
              label: "Umidade relativa",
              value: "92%",
              threshold: "Alerta: acima de 90%",
              critical: true,
            },
          ],
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
        wetness: "38 h",
        rain: "38 mm",
        wind: "7 km/h",
      },
    },
    {
      id: 2,
      lat: -26.47,
      lng: -51.99,
      name: "Estação Palmas",
      city: "Palmas",
      status: "Atenção",
      diseaseRisk: "Pouco Favorável",
      fase: "Floração plena",
      syncAgo: "8 minutos",
      diseases: [
        {
          name: "Sarna da Maçã",
          sci: "Venturia inaequalis",
          risk: "Pouco Favorável",
          action: "",
          description:
            "Doença fúngica que causa manchas escuras e lesões na superfície dos frutos e folhas, reduzindo a qualidade comercial e afetando a produtividade.",
          conditions:
            "Requer períodos prolongados de folha molhada com chuva, umidade relativa acima de 90% e temperaturas moderadas.",
          alertCause: [
            {
              label: "Folha molhada com chuva",
              value: "8 h",
              threshold: "Alerta: 9 horas",
              critical: false,
            },
            {
              label: "Umidade relativa",
              value: "91%",
              threshold: "Alerta: acima de 90%",
              critical: true,
            },
            {
              label: "Chuva acumulada",
              value: "21 mm",
              threshold: "Qualquer chuva ativa o risco",
              critical: false,
            },
          ],
        },
        {
          name: "Mancha de Gala",
          sci: "Colletotrichum spp.",
          risk: "Pouco Favorável",
          action: "",
          description:
            "Doença fúngica que causa lesões necróticas nas folhas, levando ao ressecamento prematuro e desfolha significativa, comprometendo a produção.",
          conditions:
            "Desenvolve-se sob molhamento prolongado, temperaturas entre 15-20°C e alta umidade relativa.",
          alertCause: [
            {
              label: "Folha molhada com chuva",
              value: "8 h",
              threshold: "Alerta: 10 horas",
              critical: false,
            },
            {
              label: "Temperatura no período úmido",
              value: "15.5°C",
              threshold: "Alerta: acima de 14.9°C",
              critical: false,
            },
            {
              label: "Umidade relativa",
              value: "91%",
              threshold: "Alerta: acima de 90%",
              critical: false,
            },
          ],
        },
      ],
      codependency: [
        "Se o molhamento continuar, a Mancha de Gala também será ativada ao mesmo tempo, pois a temperatura já está acima do limite (15.5°C é maior que 14.9°C).",
        "Uma única hora adicional de chuva pode elevar as duas doenças para Favorável à Doença simultaneamente.",
      ],
      station: {
        temp: "15.5°C",
        hum: "91%",
        wetness: "8 h",
        rain: "8 mm",
        wind: "10 km/h",
      },
    },
    {
      id: 3,
      lat: -25.67,
      lng: -50.3,
      name: "Est. São João do Triunfo",
      city: "São João do Triunfo",
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
          description:
            "Doença fúngica que causa manchas escuras e lesões na superfície dos frutos e folhas, reduzindo a qualidade comercial e afetando a produtividade.",
          conditions:
            "Requer períodos prolongados de folha molhada com chuva, umidade relativa acima de 90% e temperaturas moderadas.",
          alertCause: [
            {
              label: "Folha molhada com chuva",
              value: "0 h",
              threshold: "Alerta: 9 horas",
              critical: false,
            },
            {
              label: "Umidade relativa",
              value: "74%",
              threshold: "Alerta: acima de 90%",
              critical: false,
            },
            {
              label: "Chuva acumulada",
              value: "0 mm",
              threshold: "Qualquer chuva ativa o risco",
              critical: false,
            },
          ],
        },
        {
          name: "Mancha de Gala",
          sci: "Colletotrichum spp.",
          risk: "Não Provável",
          action: "Sem ação necessária",
          description:
            "Doença fúngica que causa lesões necróticas nas folhas, levando ao ressecamento prematuro e desfolha significativa, comprometendo a produção.",
          conditions:
            "Desenvolve-se sob molhamento prolongado, temperaturas entre 15-20°C e alta umidade relativa.",
          alertCause: [
            {
              label: "Folha molhada com chuva",
              value: "0 h",
              threshold: "Alerta: 10 horas",
              critical: false,
            },
            {
              label: "Temperatura no período úmido",
              value: "14.8°C",
              threshold: "Alerta: acima de 14.9°C",
              critical: false,
            },
            {
              label: "Umidade relativa",
              value: "74%",
              threshold: "Alerta: acima de 90%",
              critical: false,
            },
          ],
        },
      ],
      codependency: null,
      station: {
        temp: "14.8°C",
        hum: "74%",
        wetness: "0 h",
        rain: "0 mm",
        wind: "18 km/h",
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
    // Centered on Paraná state - zoom 6 para mobile, 7 para desktop (mais vista geral)
    const zoomLevel = isDesktop ? 7 : 6;
    const map = L.map(mapRef.current, { zoomControl: false }).setView(
      [-24.5, -51.5],
      zoomLevel,
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
    // Não mostrar markers na primeira vez (antes de filtrar) - tanto desktop quanto mobile
    if (!filtersApplied) return;

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
        <div className="px-3 md:px-6 py-3 md:py-0 flex items-center justify-between gap-3 min-h-12 md:min-h-18">
          {/* Logo + Title */}
          <div className="flex items-center shrink-0 gap-2 md:gap-3">
            <img
              src="/images/image.webp"
              alt="IDR-Paraná"
              className="h-8 md:h-10 w-auto object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
            />
            <div
              className="border-l"
              style={{
                borderColor: "rgba(255,255,255,0.3)",
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

          {/* Filtros — desktop apenas */}
          {filtersApplied &&
            (() => {
              const filters = [
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
              ];

              // VERSÃO COMPACT (original)
              if (filterLayout === "compact") {
                return (
                  <div className="hidden md:flex items-center justify-center flex-1 min-w-0 py-3">
                    <div className="flex items-center gap-3 w-full max-w-2xl min-w-0">
                      {/* Grid 2×2 responsivo */}
                      <div className="flex-1 grid grid-cols-2 gap-x-2 gap-y-1.5 min-w-0">
                        {filters.map((f, i) => (
                          <div key={i} className="relative min-w-0">
                            <f.icon
                              size={13}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                              style={{
                                color: f.locked ? "#c4c4c4" : C.greenMid,
                              }}
                            />
                            <select
                              disabled={f.locked}
                              className="w-full min-w-0 pl-8 pr-6 py-1.5 appearance-none rounded-lg text-xs font-semibold outline-none transition-all truncate"
                              style={{
                                background: f.locked
                                  ? "rgba(255,255,255,0.15)"
                                  : C.white,
                                border: `1px solid ${f.locked ? "rgba(255,255,255,0.2)" : C.border}`,
                                color: f.val ? C.textDark : "#9ca3af",
                                cursor: f.locked ? "not-allowed" : "pointer",
                                opacity: f.locked ? 0.55 : 1,
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
                              size={11}
                              className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                              style={{
                                color: f.locked ? "#c4c4c4" : C.greenMid,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      {/* Botão de alternância */}
                      <button
                        title="Alternar layout de filtros"
                        onClick={() => setFilterLayout("sidebar")}
                        className="shrink-0 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all"
                        style={{
                          background: "rgba(255,255,255,0.2)",
                          color: C.white,
                          border: `1px solid rgba(255,255,255,0.3)`,
                        }}
                      >
                        ≡
                      </button>
                    </div>
                  </div>
                );
              }
            })()}

          {/* Spacer quando sem filtros */}
          {!filtersApplied && (
            <div className="flex-1 max-w-3xl hidden md:flex" />
          )}
        </div>
      </header>

      {/* ── MAP AREA ── */}
      <main className="flex-1 relative overflow-hidden">
        {/* SIDEBAR FILTRO — Versão melhorada, apenas desktop e quando layout=sidebar */}
        {filtersApplied &&
          filterLayout === "sidebar" &&
          isDesktop &&
          (() => {
            const filters = [
              {
                icon: Sprout,
                label: "Fruta",
                placeholder: "Selecione a fruta",
                val: selectedCrop,
                set: setSelectedCrop,
                opts: ["Maçã", "Pêra", "Pêssego", "Uva", "Ameixa"],
                locked: false,
              },
              {
                icon: TrendingUp,
                label: "Fase",
                placeholder: "Selecione a fase",
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
                label: "Doença",
                placeholder: "Selecione a doença",
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
                label: "Município",
                placeholder: "Selecione o município",
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
            ];

            return (
              <div
                className="absolute left-6 top-6 z-30 hidden md:flex flex-col p-6 rounded-2xl shadow-lg backdrop-blur-sm animate-in"
                style={{
                  background: "rgba(255,255,255,0.95)",
                  border: `1px solid ${C.border}`,
                  width: "300px",
                  maxHeight: "calc(100vh - 48px)",
                  overflowY: "auto",
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3
                      className="text-sm font-bold"
                      style={{ color: C.textDark }}
                    >
                      Filtros
                    </h3>
                    <p className="text-xs mt-1" style={{ color: "#6b7280" }}>
                      Personalize sua busca
                    </p>
                  </div>
                  <button
                    title="Voltar para layout compacto"
                    onClick={() => setFilterLayout("compact")}
                    className="p-2 rounded-lg transition-all hover:bg-slate-100"
                    style={{ color: C.green }}
                  >
                    ≡
                  </button>
                </div>

                {/* Filtros em coluna */}
                <div className="space-y-4">
                  {filters.map((f, i) => (
                    <div key={i}>
                      <label
                        className="text-xs font-semibold uppercase tracking-wider"
                        style={{ color: C.textDark }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <f.icon
                            size={14}
                            style={{
                              color: f.locked ? "#c4c4c4" : C.greenMid,
                            }}
                          />
                          {f.label}
                        </div>
                      </label>
                      <select
                        disabled={f.locked}
                        className="w-full px-3 py-2.5 appearance-none rounded-lg text-sm font-medium outline-none transition-all"
                        style={{
                          background: f.locked ? "#f3f4f6" : C.white,
                          border: `1.5px solid ${f.locked ? "#e5e7eb" : C.border}`,
                          color: f.val ? C.textDark : "#9ca3af",
                          cursor: f.locked ? "not-allowed" : "pointer",
                          opacity: f.locked ? 0.55 : 1,
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
                    </div>
                  ))}
                </div>

                {/* Status */}
                <div
                  className="mt-6 pt-4 text-xs rounded-lg p-3"
                  style={{
                    background: C.greenUltra,
                    border: `1px solid ${C.greenPale}`,
                    color: C.green,
                  }}
                >
                  <p className="font-semibold mb-1">Filtros Selecionados</p>
                  <p className="opacity-75">
                    {selectedCrop ? `${selectedCrop}` : "Selecione uma fruta"}
                    {selectedPhase ? ` • ${selectedPhase}` : ""}
                    {selectedDisease ? ` • ${selectedDisease}` : ""}
                    {selectedCity ? ` • ${selectedCity}` : ""}
                  </p>
                </div>
              </div>
            );
          })()}

        <div
          className="absolute inset-0"
          style={{ isolation: "isolate", zIndex: 0 }}
        >
          <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
        </div>

        {/* Backdrop for first-access modal */}
        {isDesktop && !filtersApplied && (
          <div
            className="absolute inset-0 z-40 transition-opacity duration-300"
            style={{ background: "rgba(0, 0, 0, 0.5)" }}
          />
        )}

        {/* Desktop first-access modal with filters */}
        {isDesktop && !filtersApplied && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto transition-opacity duration-300">
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
              setActiveMarker(null);
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
  ref={bottomSheetRef}
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
  className="absolute z-20 shadow-[0_8px_32px_rgba(0,0,0,0.18)] ease-out overflow-y-auto transition-all duration-300"
  style={{
    borderRadius: "1rem",
    ...(isDesktop
      ? {
          top: "0.75rem",
          left: "50%",
          transform: showBottomSheet
            ? "translateX(-50%) translateY(0) scale(1)"
            : "translateX(-50%) translateY(-12px) scale(0.98)",
          width: "fit-content",
          minWidth: "420px",
          maxWidth: "calc(100% - 1.5rem)",
          maxHeight: "calc(100% - 1.5rem)",
          opacity: showBottomSheet ? 1 : 0,
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
  {/* Handle mobile (A "barrinha" de puxar) */}
  <div className="md:hidden w-14 h-1.5 rounded-full mx-auto mt-4 mb-2" style={{ background: C.border }} />
  
  
  {isDesktop && (
    <button
      onClick={() => { setShowBottomSheet(false); setActiveMarker(null); }}
      className="absolute top-3 right-3 z-10 p-2 rounded-xl"
      style={{ background: C.background, color: "#9ca3af" }}
    >
      <X size={18} />
    </button>
  )}

  <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pb-8 pt-3">
    {/* Header: Estação */}
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="p-2.5 rounded-xl shrink-0"
          style={{ background: riskBg(getMaxRisk(activeMarker?.station)) }}
        >
          <MapPin size={22} style={{ color: riskColor(getMaxRisk(activeMarker?.station)) }} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#9ca3af" }}>Estação</p>
          <h2 className="text-base font-bold tracking-tight leading-tight" style={{ color: C.textDark }}>
            {activeMarker?.name}
          </h2>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin size={11} style={{ color: "#9ca3af" }} />
            <p className="text-[11px]" style={{ color: "#6b7280" }}>{activeMarker?.city}</p>
          </div>
        </div>
      </div>
    </div>

    {/* Fase Fenológica */}
    <div
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl mb-4"
      style={{ background: C.greenUltra, border: `1px solid ${C.greenPale}` }}
    >
      <Sprout size={15} style={{ color: C.green }} />
      <div>
        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.greenMid }}>Fase Fenológica</p>
        <p className="text-xs font-semibold leading-tight" style={{ color: C.textDark }}>{activeMarker?.fase}</p>
      </div>
    </div>

    {/* Listagem de Doenças */}
<div className="space-y-4">
  <div className="flex items-center gap-2 px-1">
    <Bug size={13} style={{ color: "#9ca3af" }} />
    <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#9ca3af" }}>
      Monitoramento de Riscos
    </p>
  </div>

  {activeMarker?.diseases?.map((d, i) => {
    const calculated = getCalculatedRisks(activeMarker.station);
    const displayRisk = d.name === "Sarna da Maçã" ? calculated.sarnaRisk : calculated.galaRisk;

    return (
      <div
        key={i}
        className="p-3 rounded-2xl overflow-hidden relative"
        style={{
          background: C.white,
          border: `1px solid ${riskBorder(displayRisk)}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}
      >
        {/* Header: Nome da Doença */}
        <div className="mb-3">
          <p className="text-base font-black leading-tight" style={{ color: C.textDark }}>{d.name}</p>
          <p className="text-[11px] italic mt-0.5" style={{ color: "#6b7280" }}>{d.sci}</p>
        </div>

        {/* BARRA DE DESTAQUE DO RISCO */}
        <div 
          className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-4"
          style={{ 
            background: riskBg(displayRisk),
            border: `1px solid ${riskBorder(displayRisk)}`
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: riskColor(displayRisk) }}>
            Status de Risco
          </span>
          <span
            className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide text-white shadow-sm"
            style={{ background: riskColor(displayRisk) }}
          >
            {displayRisk}
          </span>
        </div>

        {/* Card: Sobre e Condições */}
        <div 
          className="mb-4 p-3 rounded-xl space-y-2.5"
          style={{ background: "#F8FAFB", border: "1px solid #F1F3F5" }}
        >
          <p className="text-[11px] leading-relaxed" style={{ color: "#4B5563" }}>
            <span className="font-bold text-slate-700 block mb-0.5">Sobre: </span>
            {d.description}
          </p>
          <div className="h-px w-full bg-slate-200 opacity-50 my-2"></div>
          <p className="text-[11px] leading-relaxed" style={{ color: "#4B5563" }}>
            <span className="font-bold text-slate-700 block mb-0.5">Condições: </span>
            {d.conditions}
          </p>
        </div>

        {/* Causas do Alerta (Dados integrados) */}
        <div className="space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#9ca3af" }}>
            Fatores de Risco Atuais
          </p>
          <div className="grid grid-cols-1 gap-2">
            {d.alertCause?.map((ac, j) => {
              const Icon = ac.label.includes("Umidade") ? Droplets : 
                           ac.label.includes("Temperatura") ? ThermometerSun : 
                           ac.label.includes("Chuva") ? CloudRain : Wind;

              return (
                <div
                  key={j}
                  className="flex items-center justify-between p-3 rounded-xl transition-all"
                  style={{
                    background: ac.critical ? riskBg(displayRisk) : "#f9fafb",
                    border: `1px solid ${ac.critical ? riskBorder(displayRisk) : "#f3f4f6"}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg" 
                      style={{ 
                        background: C.white, 
                        color: ac.critical ? riskColor(displayRisk) : "#9ca3af",
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold" style={{ color: C.textDark }}>{ac.label}</p>
                      <p className="text-[10px]" style={{ color: "#9ca3af" }}>{ac.threshold}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p 
                      className="text-base font-black" 
                      style={{ color: ac.critical ? riskColor(displayRisk) : C.textDark }}
                    >
                      {ac.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  })}
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

        {/* Floating filter button (mobile only) - Fixed position, hidden until filters applied */}
        {!showFilterSheet && !showBottomSheet && filtersApplied && (
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
