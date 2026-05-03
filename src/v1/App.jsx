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

const RISK = {
  low: "Baixo",
  attention: "Atenção",
  high: "Alto",
  veryHigh: "Muito alto",
};

const RISK_ORDER = {
  [RISK.low]: 1,
  [RISK.attention]: 2,
  [RISK.high]: 3,
  [RISK.veryHigh]: 4,
};

const RISK_MESSAGES = {
  [RISK.low]:
    "As condições meteorológicas da área da estação indicam baixa favorabilidade climática para esta doença nesta fase fenológica.",
  [RISK.attention]:
    "Algumas condições meteorológicas da área da estação podem favorecer esta doença. Acompanhe as próximas atualizações.",
  [RISK.high]:
    "As condições meteorológicas da área da estação indicam ambiente favorável para esta doença nesta fase fenológica.",
  [RISK.veryHigh]:
    "As condições meteorológicas da área da estação indicam ambiente muito favorável, com combinação de umidade, chuva e temperatura adequada por período prolongado.",
};

const STANDARD_DISCLAIMER =
  "Este alerta é baseado em dados meteorológicos e indica apenas favorabilidade climática. Verifique com seu agrônomo quais ações podem ser tomadas.";

const DISEASE_PHASES = {
  "Sarna da Maçã": ["Brotação", "Floração", "Início de frutificação"],
  "Mancha de Gala": ["Frutificação", "Maturação"],
  "Podridão Amarga": ["Frutificação", "Maturação", "Pós-colheita"],
};

const normalizeRisk = (risk) => {
  if (!risk) return RISK.low;
  if (RISK_ORDER[risk]) return risk;
  if (risk === "Favorável à Doença") return RISK.high;
  if (risk === "Pouco Favorável") return RISK.attention;
  if (risk === "Crítico") return RISK.veryHigh;
  return RISK.low;
};

const toNumber = (value, fallback = 0) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".");
    const match = normalized.match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : fallback;
  }
  return fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const sum = (items, getter) => items.reduce((total, item) => total + getter(item), 0);
const avg = (items, getter) => {
  const values = items.map(getter).filter((value) => Number.isFinite(value));
  return values.length ? sum(values, (value) => value) / values.length : 0;
};

const formatNumber = (value, digits = 1) => {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const buildFallbackInmetHourly = (station) => {
  const tempBase = toNumber(station?.temp_med ?? station?.temp, 16);
  const humBase = toNumber(station?.umid_rel ?? station?.hum, 75);
  const rainTotal = toNumber(station?.precipitacao ?? station?.rain, 0);
  const windBase = toNumber(station?.vento_vel ?? station?.wind, 6);
  const wetnessHint = toNumber(station?.wetness, rainTotal > 0 ? Math.min(12, rainTotal) : 0);
  const wetHours = Math.min(72, Math.max(0, Math.round(wetnessHint)));
  const rainHours = rainTotal > 0 ? Math.max(1, Math.min(24, Math.ceil(rainTotal / 3))) : 0;

  return Array.from({ length: 72 }, (_, index) => {
    const hourOfDay = index % 24;
    const hoursAgo = 71 - index;
    const isNight = hourOfDay < 7 || hourOfDay > 18;
    const isWetWindow = hoursAgo < wetHours;
    const isRainWindow = rainTotal > 0 && hoursAgo < rainHours;
    const tempCurve = isNight ? -1.2 : hourOfDay < 13 ? 0.3 : 1.4;
    const radiation = isNight ? 0 : isRainWindow || isWetWindow ? 120 : 620;
    const humidity = isWetWindow
      ? Math.max(humBase, 91)
      : isNight
        ? clamp(humBase + 8, 60, 98)
        : clamp(humBase - 12, 45, 88);

    return {
      horario: `${String(hourOfDay).padStart(2, "0")}:00`,
      temp_med: Number((tempBase + tempCurve).toFixed(1)),
      temp_max: Number((tempBase + tempCurve + 0.8).toFixed(1)),
      temp_min: Number((tempBase + tempCurve - 0.8).toFixed(1)),
      umid_rel: Math.round(humidity),
      precipitacao: isRainWindow ? Number((rainTotal / rainHours).toFixed(1)) : 0,
      press_med: station?.press_med ?? 1013,
      vento_vel: Number((windBase + (isNight ? -1 : 1)).toFixed(1)),
      vento_dir: station?.vento_dir ?? 180,
      raj_vel: Number((windBase * 1.6).toFixed(1)),
      rad_sol_global: radiation,
    };
  });
};

const getInmetHourly = (station) => {
  if (station?.inmetHourly?.length) return station.inmetHourly;
  return buildFallbackInmetHourly(station);
};

const hourLabel = (row, index) =>
  row.horario || row.hour || row.data_hora || `${String(index % 24).padStart(2, "0")}:00`;

const estimateLeafWetness = (rows) => {
  let current = null;
  let best = { hours: 0, tempSum: 0, start: "", end: "" };
  let residualDryingHours = 0;

  rows.forEach((row, index) => {
    const rain = toNumber(row.precipitacao) > 0;
    const humidity = toNumber(row.umid_rel);
    const wind = toNumber(row.vento_vel);
    const radiation = toNumber(row.rad_sol_global);
    const humidWet = humidity >= 90;
    const dewWet = humidity >= 95 && radiation <= 80 && wind <= 8;
    const slowDrying = residualDryingHours > 0 && humidity >= 85 && radiation < 260 && wind <= 12;
    const wet = rain || humidWet || dewWet || slowDrying;

    if (rain) residualDryingHours = 2;
    else if (humidWet || dewWet) residualDryingHours = Math.max(residualDryingHours, 1);
    else if (residualDryingHours > 0) residualDryingHours -= 1;

    if (wet) {
      if (!current) {
        current = { hours: 0, tempSum: 0, start: hourLabel(row, index), end: hourLabel(row, index) };
      }
      current.hours += 1;
      current.tempSum += toNumber(row.temp_med);
      current.end = hourLabel(row, index);
      if (current.hours > best.hours) best = { ...current };
    } else {
      current = null;
    }
  });

  return {
    hours: best.hours,
    tempAvg: best.hours ? best.tempSum / best.hours : 0,
    window: best.hours ? `${best.start} - ${best.end}` : "Sem janela contínua",
  };
};

const summarizeStationWeather = (station) => {
  const rows = getInmetHourly(station);
  const last24 = rows.slice(-24);
  const last48 = rows.slice(-48);
  const last72 = rows.slice(-72);
  const wetness = estimateLeafWetness(last72);
  const dayBlocks = [rows.slice(-24), rows.slice(-48, -24), rows.slice(-72, -48)].filter(
    (block) => block.length,
  );
  const persistenceDays = dayBlocks.filter((block) => {
    const wet = estimateLeafWetness(block);
    const rain = sum(block, (row) => toNumber(row.precipitacao));
    return wet.hours >= 6 || rain >= 5;
  }).length;

  return {
    source: station?.source || "INMET horário",
    rows,
    rain24: sum(last24, (row) => toNumber(row.precipitacao)),
    rain48: sum(last48, (row) => toNumber(row.precipitacao)),
    rain72: sum(last72, (row) => toNumber(row.precipitacao)),
    highHumidityHours: last24.filter((row) => toNumber(row.umid_rel) >= 90).length,
    wetnessHours: wetness.hours,
    wetTempAvg: wetness.tempAvg,
    wetWindow: wetness.window,
    tempAvg24: avg(last24, (row) => toNumber(row.temp_med)),
    windAvg24: avg(last24, (row) => toNumber(row.vento_vel)),
    radiationAvg24: avg(last24, (row) => toNumber(row.rad_sol_global)),
    persistenceDays,
  };
};

const buildAlertCause = (label, value, threshold, critical) => ({
  label,
  value,
  threshold,
  critical,
});

const buildDiseaseReasons = (diseaseKey, indicators) => {
  const wetnessLabel = `${formatNumber(indicators.wetnessHours, 0)} h`;
  const tempWetLabel = `${formatNumber(indicators.wetTempAvg)}°C`;

  if (diseaseKey === "sarna") {
    const infectionForce = indicators.wetnessHours * indicators.wetTempAvg;
    return [
      buildAlertCause(
        "Molhamento foliar estimado",
        wetnessLabel,
        "Sarna: 9 h ou mais",
        indicators.wetnessHours >= 9,
      ),
      buildAlertCause(
        "Força de infecção estimada",
        formatNumber(infectionForce, 0),
        "Molhamento × temperatura >= 140",
        infectionForce >= 140,
      ),
      buildAlertCause(
        "Temperatura no período úmido",
        tempWetLabel,
        "Faixa favorável: 10°C a 24°C",
        indicators.wetTempAvg >= 10 && indicators.wetTempAvg <= 24,
      ),
      buildAlertCause(
        "Chuva acumulada em 24 h",
        `${formatNumber(indicators.rain24)} mm`,
        "Chuva inicia/dispersa o período úmido",
        indicators.rain24 > 0,
      ),
    ];
  }

  if (diseaseKey === "gala") {
    return [
      buildAlertCause(
        "Molhamento foliar estimado",
        wetnessLabel,
        "Mancha de Gala: 10 h ou mais",
        indicators.wetnessHours >= 10,
      ),
      buildAlertCause(
        "Temperatura no período úmido",
        tempWetLabel,
        "Acima de 14,9°C",
        indicators.wetTempAvg > 14.9,
      ),
      buildAlertCause(
        "Horas com UR alta",
        `${indicators.highHumidityHours} h`,
        "UR >= 90% reforça molhamento",
        indicators.highHumidityHours >= 6,
      ),
      buildAlertCause(
        "Chuva acumulada em 24 h",
        `${formatNumber(indicators.rain24)} mm`,
        "Chuva favorece molhamento e dispersão",
        indicators.rain24 > 0,
      ),
    ];
  }

  return [
    buildAlertCause(
      "Chuva acumulada em 48 h",
      `${formatNumber(indicators.rain48)} mm`,
      "Água livre aumenta favorabilidade",
      indicators.rain48 >= 10,
    ),
    buildAlertCause(
      "Umidade relativa alta",
      `${indicators.highHumidityHours} h`,
      "UR >= 90%",
      indicators.highHumidityHours >= 6,
    ),
    buildAlertCause(
      "Temperatura média em 24 h",
      `${formatNumber(indicators.tempAvg24)}°C`,
      "Faixa quente aumenta atenção",
      indicators.tempAvg24 >= 20,
    ),
  ];
};

// Cálculos de favorabilidade climática por área de estação.
const calculateDiseaseRisk = (station) => {
  if (!station) {
    return {
      sarnaRisk: RISK.low,
      galaRisk: RISK.low,
      podridaoRisk: RISK.low,
      indicators: summarizeStationWeather(null),
      reasons: {},
    };
  }

  const indicators = summarizeStationWeather(station);
  const infectionForce = indicators.wetnessHours * indicators.wetTempAvg;
  const sarnaTempOk = indicators.wetTempAvg >= 10 && indicators.wetTempAvg <= 24;
  const galaTempOk = indicators.wetTempAvg > 14.9;

  let sarnaRisk = RISK.low;
  if (
    indicators.wetnessHours >= 14 &&
    infectionForce >= 220 &&
    sarnaTempOk &&
    indicators.rain24 >= 8
  ) {
    sarnaRisk = RISK.veryHigh;
  } else if (indicators.wetnessHours >= 9 && infectionForce >= 140 && sarnaTempOk) {
    sarnaRisk = RISK.high;
  } else if (
    (indicators.wetnessHours >= 4 && sarnaTempOk) ||
    (indicators.rain24 > 0 && indicators.highHumidityHours >= 3)
  ) {
    sarnaRisk = RISK.attention;
  }

  let galaRisk = RISK.low;
  if (
    indicators.wetnessHours >= 14 &&
    galaTempOk &&
    indicators.rain24 >= 8 &&
    indicators.highHumidityHours >= 8
  ) {
    galaRisk = RISK.veryHigh;
  } else if (indicators.wetnessHours >= 10 && galaTempOk) {
    galaRisk = RISK.high;
  } else if (
    (indicators.wetnessHours >= 6 && galaTempOk) ||
    (indicators.rain24 > 0 && indicators.highHumidityHours >= 4)
  ) {
    galaRisk = RISK.attention;
  }

  let podridaoRisk = RISK.low;
  if (indicators.rain48 >= 30 && indicators.tempAvg24 >= 24 && indicators.highHumidityHours >= 8) {
    podridaoRisk = RISK.veryHigh;
  } else if (indicators.rain48 >= 15 && indicators.tempAvg24 >= 22) {
    podridaoRisk = RISK.high;
  } else if (indicators.rain24 > 0 && indicators.tempAvg24 >= 20) {
    podridaoRisk = RISK.attention;
  }

  return {
    sarnaRisk,
    galaRisk,
    podridaoRisk,
    indicators,
    reasons: {
      "Sarna da Maçã": buildDiseaseReasons("sarna", indicators),
      "Mancha de Gala": buildDiseaseReasons("gala", indicators),
      "Podridão Amarga": buildDiseaseReasons("podridao", indicators),
    },
  };
};

const getDiseaseAssessment = (station, disease) => {
  const calculated = calculateDiseaseRisk(station);
  const name = disease?.name || "";
  const normalizedRisk = normalizeRisk(disease?.risk);

  if (name === "Sarna da Maçã") {
    return {
      risk: calculated.sarnaRisk,
      alertCause: calculated.reasons[name],
      phases: DISEASE_PHASES[name],
    };
  }
  if (name === "Mancha de Gala") {
    return {
      risk: calculated.galaRisk,
      alertCause: calculated.reasons[name],
      phases: DISEASE_PHASES[name],
    };
  }
  if (name === "Podridão Amarga") {
    return {
      risk: calculated.podridaoRisk,
      alertCause: calculated.reasons[name],
      phases: DISEASE_PHASES[name],
    };
  }

  return {
    risk: normalizedRisk,
    alertCause: disease?.alertCause || [],
    phases: DISEASE_PHASES[name] || [],
  };
};

const getFruitForDisease = (dName) => {
  const n = dName.toLowerCase();
  if (n.includes("míldio") || n.includes("uva")) return "🍇";
  if (n.includes("sigatoka") || n.includes("banana")) return "🍌";
  if (n.includes("ferrugem") || n.includes("pera")) return "🍐";
  if (n.includes("greening") || n.includes("laranja") || n.includes("pinta")) return "🍊";
  if (n.includes("abacate")) return "🥑";
  return "🍎"; // Default to Maçã for Sarna, Gala, Podridão
};

const App = () => {
  const [selectedCrop, setSelectedCrop] = useState("");
  const [selectedPhase, setSelectedPhase] = useState("");
  const [selectedDisease, setSelectedDisease] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [activeMarker, setActiveMarker] = useState(null);
  const [selectedFruitTab, setSelectedFruitTab] = useState(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [filterLayout, setFilterLayout] = useState("sidebar"); // "compact" ou "sidebar"
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  const bottomSheetRef = useRef(null);
  const headerMenuRef = useRef(null);
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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) {
        setShowHeaderMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    if (!station) return RISK.low;

    const risks = calculateDiseaseRisk(station);
    return [risks.sarnaRisk, risks.galaRisk, risks.podridaoRisk].reduce(
      (current, next) =>
        (RISK_ORDER[normalizeRisk(next)] || 0) > (RISK_ORDER[normalizeRisk(current)] || 0)
          ? normalizeRisk(next)
          : normalizeRisk(current),
      RISK.low,
    );
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
      fruits: ["🍎"],
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
          risk: "Pouco Favorável",
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
        {
          name: "Podridão Amarga",
          sci: "Glomerella cingulata",
          risk: "Não Favorável",
          action: "Sem risco imediato",
          description:
            "Doença fúngica que causa manchas escuras e deprimidas nos frutos.",
          conditions:
            "Exige temperaturas mais altas (acima de 25°C) e alta umidade.",
          alertCause: [
            {
              label: "Temperatura Média",
              value: "16.2°C",
              threshold: "Alerta: acima de 25°C",
              critical: false,
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
        source: "INMET horário",
        temp_med: 16.2,
        temp_max: 18.0,
        temp_min: 14.9,
        umid_rel: 92,
        precipitacao: 38,
        press_med: 1012,
        vento_vel: 7,
        vento_dir: 180,
        raj_vel: 12,
        rad_sol_global: 120,
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
      fruits: ["🍎"],
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
        source: "INMET horário",
        temp_med: 15.5,
        temp_max: 17.1,
        temp_min: 13.9,
        umid_rel: 91,
        precipitacao: 8,
        press_med: 1014,
        vento_vel: 10,
        vento_dir: 210,
        raj_vel: 16,
        rad_sol_global: 180,
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
      fruits: ["🍎"],
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
        source: "INMET horário",
        temp_med: 14.8,
        temp_max: 20.2,
        temp_min: 10.6,
        umid_rel: 74,
        precipitacao: 0,
        press_med: 1016,
        vento_vel: 18,
        vento_dir: 160,
        raj_vel: 29,
        rad_sol_global: 680,
        temp: "14.8°C",
        hum: "74%",
        wetness: "0 h",
        rain: "0 mm",
        wind: "18 km/h",
      },
    },
    {
      id: 4,
      lat: -27.02,
      lng: -50.92,
      name: "Est. Fraiburgo",
      city: "Fraiburgo",
      status: "Crítico",
      diseaseRisk: "Favorável à Doença",
      fase: "Frutificação",
      syncAgo: "15 minutos",
      fruits: ["🍇", "🍐", "🍌"],
      diseases: [
        {
          name: "Míldio da Uva",
          sci: "Plasmopara viticola",
          risk: "Favorável à Doença",
          action: "Atenção necessária",
          description: "Doença fúngica severa na videira.",
          conditions: "Requer períodos prolongados de folha molhada com chuva.",
          alertCause: [
            { label: "Folha molhada", value: "12 h", threshold: "Alerta: 9 h", critical: true },
            { label: "Umidade", value: "95%", threshold: "Alerta: 90%", critical: true },
            { label: "Chuva", value: "15 mm", threshold: "Qualquer chuva ativa o risco", critical: true },
          ],
        },
        {
          name: "Sigatoka Negra",
          sci: "Mycosphaerella fijiensis",
          risk: "Pouco Favorável",
          action: "",
          description: "Doença fúngica que causa lesões necróticas nas folhas da bananeira.",
          conditions: "Desenvolve-se sob molhamento prolongado.",
          alertCause: [
            { label: "Folha molhada", value: "12 h", threshold: "Alerta: 10 h", critical: true },
            { label: "Temperatura no período úmido", value: "13.0°C", threshold: "Alerta: acima de 14.9°C", critical: false },
            { label: "Umidade relativa", value: "95%", threshold: "Alerta: 90%", critical: true },
          ],
        }
      ],
      codependency: null,
      station: {
        source: "INMET horário",
        temp_med: 13.0,
        temp_max: 15.4,
        temp_min: 11.8,
        umid_rel: 95,
        precipitacao: 15,
        press_med: 1011,
        vento_vel: 12,
        vento_dir: 190,
        raj_vel: 21,
        rad_sol_global: 140,
        temp: "13.0°C",
        hum: "95%",
        wetness: "12 h",
        rain: "15 mm",
        wind: "12 km/h",
      }
    },
    {
      id: 5,
      lat: -28.50,
      lng: -50.93,
      name: "Est. Vacaria",
      city: "Vacaria",
      status: "Atenção",
      diseaseRisk: "Favorável à Doença",
      fase: "Floração",
      syncAgo: "2 minutos",
      fruits: ["🍊", "🥑"],
      diseases: [
        {
          name: "Greening da Laranja",
          sci: "Candidatus Liberibacter",
          risk: "Não Favorável",
          action: "",
          description: "Doença bacteriana devastadora em citros.",
          conditions: "Transmitida por psilídeo, favorecida por certas temperaturas.",
          alertCause: [
            { label: "Temperatura Média", value: "18°C", threshold: "Alerta: 20°C a 25°C", critical: false },
          ],
        },
        {
          name: "Podridão do Abacate",
          sci: "Phytophthora cinnamomi",
          risk: "Favorável à Doença",
          action: "Risco alto",
          description: "Doença que ataca as raízes, causando podridão.",
          conditions: "Desenvolve-se sob excesso de umidade no solo.",
          alertCause: [
            { label: "Chuva acumulada", value: "80 mm", threshold: "Alerta: 50 mm", critical: true },
            { label: "Umidade do Solo", value: "92%", threshold: "Alerta: 90%", critical: true },
          ],
        }
      ],
      codependency: null,
      station: {
        source: "INMET horário",
        temp_med: 18.0,
        temp_max: 23.2,
        temp_min: 14.3,
        umid_rel: 92,
        precipitacao: 2,
        press_med: 1015,
        vento_vel: 5,
        vento_dir: 120,
        raj_vel: 9,
        rad_sol_global: 360,
        temp: "18.0°C",
        hum: "92%",
        wetness: "11 h",
        rain: "2 mm",
        wind: "5 km/h",
      }
    },
  ];

  const riskColor = (r) => {
    const risk = normalizeRisk(r);
    if (risk === RISK.veryHigh) return C.red;
    if (risk === RISK.high) return "#f97316";
    if (risk === RISK.attention) return "#ca8a04";
    return C.greenMid;
  };
  const riskBg = (r) => {
    const risk = normalizeRisk(r);
    if (risk === RISK.veryHigh) return "#fef2f2";
    if (risk === RISK.high) return "#fff7ed";
    if (risk === RISK.attention) return "#fefce8";
    return C.greenUltra;
  };
  const riskBorder = (r) => {
    const risk = normalizeRisk(r);
    if (risk === RISK.veryHigh) return "#fecaca";
    if (risk === RISK.high) return "#fed7aa";
    if (risk === RISK.attention) return "#fef08a";
    return C.greenPale;
  };

  const handleMarkerClick = (marker) => {
    setActiveMarker(marker);
    setSelectedFruitTab(marker.fruits?.[0] || null);
    setShowBottomSheet(true);
  };

  const getMarkerIcon = (m, isActive) => {
    const worstRisk = (alerts) => {
      return alerts.reduce((current, disease) => {
        const risk = getDiseaseAssessment(m.station, disease).risk;
        return (RISK_ORDER[risk] || 0) > (RISK_ORDER[current] || 0) ? risk : current;
      }, RISK.low);
    };

    const riskColorCode = (r) =>
      normalizeRisk(r) === RISK.veryHigh ? "#ef4444"
      : normalizeRisk(r) === RISK.high ? "#f97316"
      : normalizeRisk(r) === RISK.attention ? "#f59e0b"
      : "#22c55e";

    const riskBgCode = (r) =>
      normalizeRisk(r) === RISK.veryHigh ? "#fff1f2"
      : normalizeRisk(r) === RISK.high ? "#fff7ed"
      : normalizeRisk(r) === RISK.attention ? "#fffbeb"
      : "#f0fdf4";

    const fruitsToRender = m.fruits || ["🍎"];

    const alertsByFruit = {};
    fruitsToRender.forEach(f => { alertsByFruit[f] = []; });
    m.diseases.forEach(d => {
      const fe = getFruitForDisease(d.name);
      if (alertsByFruit[fe]) alertsByFruit[fe].push(d);
      else if (fruitsToRender[0]) alertsByFruit[fruitsToRender[0]].push(d);
    });

    const scale = isActive ? 1.2 : 1;
    const chipSize = Math.round(34 * scale);
    const emojiSize = Math.round(18 * scale);
    const dotSize = Math.round(5 * scale);
    const gap = Math.round(4 * scale);

    const chipsHtml = fruitsToRender.map(f => {
      const alerts = alertsByFruit[f] || [];
      const fruitRisk = worstRisk(alerts);
      const alertsWithRisk = alerts
        .map((d) => ({ ...d, computedRisk: getDiseaseAssessment(m.station, d).risk }))
        .filter((d) => (RISK_ORDER[d.computedRisk] || 0) > RISK_ORDER[RISK.low]);

      const dotsHtml = alertsWithRisk.slice(0, 3).map(d =>
        `<div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:${riskColorCode(d.computedRisk)};flex-shrink:0;" title="${d.name}"></div>`
      ).join("");

      const dotsRow = alertsWithRisk.length > 0
        ? `<div style="display:flex;gap:2px;justify-content:center;margin-top:3px;">${dotsHtml}</div>`
        : `<div style="height:${dotSize + 3}px;"></div>`;

      return `
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div style="
            width:${chipSize}px;height:${chipSize}px;
            border-radius:${Math.round(10 * scale)}px;
            background:${riskBgCode(fruitRisk)};
            border:2px solid ${riskBorder(fruitRisk)};
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 2px 6px rgba(0,0,0,0.10);
            font-size:${emojiSize}px;line-height:1;
          ">${f}</div>
          ${dotsRow}
        </div>`;
    }).join("");

    const pulseHtml = isActive
      ? `<div style="position:absolute;inset:-5px;border-radius:18px;background:rgba(34,197,94,0.2);animation:ping 1.4s cubic-bezier(0,0,0.2,1) infinite;z-index:-1;"></div>`
      : "";

    const innerW = fruitsToRender.length * chipSize + (fruitsToRender.length - 1) * gap + 16;
    const innerH = chipSize + dotSize + 3 + 8;

    const html = `
      <div style="display:flex;flex-direction:column;align-items:center;position:relative;cursor:pointer;">
        ${pulseHtml}
        <div style="
          background:#ffffff;
          border:2px solid ${C.green};
          border-radius:16px;
          padding:6px 8px;
          display:flex;align-items:flex-start;
          gap:${gap}px;
          box-shadow:0 4px 14px rgba(0,0,0,0.15);
          position:relative;z-index:2;
        ">
          ${chipsHtml}
        </div>
        <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid ${C.green};margin-top:-1px;z-index:1;"></div>
      </div>
    `;

    return window.L.divIcon({
      className: "custom-leaflet-marker",
      html,
      iconSize: [innerW, innerH + 14],
      iconAnchor: [innerW / 2, innerH + 14],
    });
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
      const icon = getMarkerIcon(m, false);
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
      const icon = getMarkerIcon(m, isActive);
      marker.setIcon(icon);
    });
  }, [activeMarker, leafletLoaded]);

  // Map de frutas nome -> emoji
  const cropToEmoji = {
    "Maçã": "🍎",
    "Banana": "🍌",
    "Pera": "🍐",
    "Uva": "🍇",
    "Abacate": "🥑",
    "Laranja": "🍊",
  };

  // Atualiza icones quando o filtro de fruta muda
  useEffect(() => {
    if (!leafletLoaded || !window.L || !filtersApplied) return;
    const filterEmoji = cropToEmoji[selectedCrop] || null;
    markers.forEach((m) => {
      const marker = markersRef.current[m.id];
      if (!marker) return;
      const isActive = activeMarker?.id === m.id;
      // Se há filtro de fruta, adapta o marcador
      if (filterEmoji) {
        const hasFruit = (m.fruits || []).includes(filterEmoji);
        // Cria versão filtrada do marcador: só mostra a fruta filtrada (ou neutro)
        const filteredM = hasFruit
          ? { ...m, fruits: [filterEmoji] }
          : { ...m, fruits: ["\u{1F4CD}"], diseases: [] }; // pino neutro
        marker.setIcon(getMarkerIcon(filteredM, isActive));
      } else {
        marker.setIcon(getMarkerIcon(m, isActive));
      }
    });
  }, [selectedCrop, activeMarker, leafletLoaded, filtersApplied]);

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
                label: "Cultura",
                placeholder: "Selecione a cultura",
                val: selectedCrop,
                set: setSelectedCrop,
                opts: ["Maçã"],
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
                locked: false,
              },
              {
                icon: Bug,
                label: "Doença",
                placeholder: "Selecione a doença",
                val: selectedDisease,
                set: setSelectedDisease,
                opts: ["Sarna da Maçã", "Mancha de Gala", "Podridão Amarga"],
                locked: false,
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
                locked: false,
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

                {/* NOVO BOTÃO DE APLICAR FILTROS NO DESKTOP */}
                <div className="mt-6">
                  <button
                    className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
                    style={{
                      background: C.green,
                      color: C.white,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setFiltersApplied(true);
                    }}
                  >
                    <Search size={16} /> APLICAR FILTROS
                  </button>
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
                    placeholder: "Cultura",
                    val: selectedCrop,
                    set: setSelectedCrop,
                    opts: ["Maçã"],
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
                    locked: false,
                  },
                  {
                    icon: Bug,
                    placeholder: "Doença",
                    val: selectedDisease,
                    set: setSelectedDisease,
                    opts: ["Sarna da Maçã", "Mancha de Gala", "Podridão Amarga"],
                    locked: false,
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
                    locked: false,
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
            className="absolute inset-0 z-40 transition-all duration-300"
            style={{
              background: "rgba(0,0,0,0.55)",
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
                      placeholder: "Cultura",
                      val: selectedCrop,
                      set: setSelectedCrop,
                      opts: ["Maçã"],
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
                      locked: false,
                    },
                    {
                      icon: Bug,
                      placeholder: "Doença",
                      val: selectedDisease,
                      set: setSelectedDisease,
                      opts: ["Sarna da Maçã", "Mancha de Gala", "Podridão Amarga"],
                      locked: false,
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
                      locked: false,
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
                    background: C.green,
                    color: C.white,
                    cursor: "pointer",
                  }}
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
          className="absolute z-50 shadow-[0_8px_32px_rgba(0,0,0,0.18)] ease-out overflow-y-auto transition-all duration-300"
          style={{
            borderRadius: "1rem",
            ...(isDesktop
              ? {
                top: "0.75rem",
                left: "50%",
                transform: showBottomSheet
                  ? "translateX(-50%) translateY(0) scale(1)"
                  : "translateX(-50%) translateY(-12px) scale(0.98)",
                width: "480px",
                maxWidth: "calc(100% - 1.5rem)",
                height: "85vh",
                opacity: showBottomSheet ? 1 : 0,
                pointerEvents: showBottomSheet ? "auto" : "none",
              }
              : {
                bottom: "0.5rem",
                left: "0.5rem",
                right: "0.5rem",
                height: "85vh",
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

            {/* Área da estação */}
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl mb-4"
              style={{ background: C.greenUltra, border: `1px solid ${C.greenPale}` }}
            >
              <Sprout size={15} style={{ color: C.green }} />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.greenMid }}>Área da estação</p>
                <p className="text-xs font-semibold leading-tight" style={{ color: C.textDark }}>
                  Cálculo por latitude/longitude da estação ({activeMarker?.lat?.toFixed(2)}, {activeMarker?.lng?.toFixed(2)})
                </p>
              </div>
            </div>

            {activeMarker?.station && (() => {
              const { indicators } = getCalculatedRisks(activeMarker.station);
              const indicatorCards = [
                {
                  Icon: Leaf,
                  label: "Molhamento estimado",
                  value: `${formatNumber(indicators.wetnessHours, 0)} h`,
                  detail: indicators.wetWindow,
                },
                {
                  Icon: CloudRain,
                  label: "Chuva 24h",
                  value: `${formatNumber(indicators.rain24)} mm`,
                  detail: `48h: ${formatNumber(indicators.rain48)} mm`,
                },
                {
                  Icon: Droplets,
                  label: "UR alta",
                  value: `${indicators.highHumidityHours} h`,
                  detail: "UR >= 90%",
                },
                {
                  Icon: ThermometerSun,
                  label: "Temp. período úmido",
                  value: `${formatNumber(indicators.wetTempAvg)}°C`,
                  detail: `Persistência: ${indicators.persistenceDays} dia(s)`,
                },
              ];

              return (
                <div className="mb-4 p-3 rounded-2xl" style={{ background: "#F8FAFB", border: "1px solid #eef2f0" }}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: "#9ca3af" }}>
                        Fonte padrão
                      </p>
                      <p className="text-xs font-bold" style={{ color: C.textDark }}>
                        {indicators.source}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: "#9ca3af" }}>
                        Variáveis INMET
                      </p>
                      <p className="text-[10px] font-semibold" style={{ color: "#6b7280" }}>
                        temp_med · umid_rel · precipitacao · vento_vel · rad_sol_global
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {indicatorCards.map(({ Icon, label, value, detail }) => (
                      <div key={label} className="p-2.5 rounded-xl" style={{ background: C.white, border: "1px solid #eef2f0" }}>
                        <div className="flex items-center gap-2 mb-1">
                          <Icon size={13} style={{ color: C.greenMid }} />
                          <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#9ca3af" }}>
                            {label}
                          </p>
                        </div>
                        <p className="text-sm font-black" style={{ color: C.textDark }}>{value}</p>
                        <p className="text-[9px] mt-0.5" style={{ color: "#6b7280" }}>{detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Listagem de Doenças */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Bug size={13} style={{ color: "#9ca3af" }} />
                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#9ca3af" }}>
                  Favorabilidade climática por doença
                </p>
              </div>

              {/* Tabs de Frutas */}
              {activeMarker?.fruits?.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {activeMarker.fruits.map((fruitEmoji, idx) => {
                    const isSelected = selectedFruitTab === fruitEmoji;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedFruitTab(fruitEmoji)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
                        style={{
                          background: isSelected ? C.greenUltra : C.white,
                          border: `1px solid ${isSelected ? C.greenPale : "#e5e7eb"}`,
                          boxShadow: isSelected ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
                        }}
                      >
                        <span className="text-sm">{fruitEmoji}</span>
                        <span className="text-xs font-bold" style={{ color: isSelected ? C.greenMid : "#6b7280" }}>
                          {fruitEmoji === "🍎" ? "Maçã" : fruitEmoji === "🍇" ? "Uva" : fruitEmoji === "🍌" ? "Banana" : fruitEmoji === "🍐" ? "Pera" : fruitEmoji === "🍊" ? "Laranja" : fruitEmoji === "🥑" ? "Abacate" : "Cultura"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {(() => {
                const filteredDiseases = activeMarker?.diseases?.filter((d) => {
                  if (selectedDisease && d.name !== selectedDisease) return false;
                  if (!selectedFruitTab || activeMarker.fruits.length === 1) return true;
                  return getFruitForDisease(d.name) === selectedFruitTab;
                });

                if (!filteredDiseases || filteredDiseases.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl mt-4" style={{ background: "#F8FAFB", border: "1px dashed #e5e7eb" }}>
                      <p className="text-sm font-semibold text-slate-500">Nenhum alerta para esta fruta.</p>
                    </div>
                  );
                }

                return filteredDiseases.map((d, i) => {
                  const assessment = getDiseaseAssessment(activeMarker.station, d);
                  const displayRisk = assessment.risk;
                  const alertCause = assessment.alertCause?.length ? assessment.alertCause : d.alertCause;
                  const sensitivePhases = assessment.phases || [];

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
                        Nível de favorabilidade
                      </span>
                      <span
                        className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide text-white shadow-sm"
                        style={{ background: riskColor(displayRisk) }}
                      >
                        {displayRisk}
                      </span>
                    </div>

                    <div
                      className="mb-4 p-3 rounded-xl"
                      style={{ background: riskBg(displayRisk), border: `1px solid ${riskBorder(displayRisk)}` }}
                    >
                      <p className="text-[11px] leading-relaxed font-semibold" style={{ color: riskColor(displayRisk) }}>
                        {RISK_MESSAGES[normalizeRisk(displayRisk)]}
                      </p>
                    </div>

                    {sensitivePhases.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#9ca3af" }}>
                          Fases fenológicas sensíveis
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {sensitivePhases.map((phase) => (
                            <span
                              key={phase}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold"
                              style={{
                                background: C.greenUltra,
                                color: C.green,
                                border: `1px solid ${C.greenPale}`,
                              }}
                            >
                              {phase}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

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
                        Fatores meteorológicos
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {alertCause?.map((ac, j) => {
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
              });
              })()}
              <div
                className="p-3 rounded-xl"
                style={{ background: "#F8FAFB", border: "1px solid #eef2f0" }}
              >
                <p className="text-[11px] leading-relaxed font-semibold" style={{ color: "#6b7280" }}>
                  {STANDARD_DISCLAIMER}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── FILTER SHEET (mobile) ── */}
        <div
          className="fixed left-0 right-0 z-50 rounded-t-3xl shadow-[0_-10px_40px_-8px_rgba(0,0,0,0.25)] transition-all duration-500 ease-out md:hidden"
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
                  placeholder: "Cultura",
                  val: selectedCrop,
                  set: setSelectedCrop,
                  opts: ["Maçã"],
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
                  locked: false,
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
                  ],
                  locked: false,
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
                  locked: false,
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
                background: C.green,
                color: C.white,
                cursor: "pointer",
              }}
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

        {/* Menu suspenso flutuante — desktop, após filtros aplicados */}
        {filtersApplied && !showBottomSheet && filterLayout !== "sidebar" && (
          <button
            className="absolute left-5 top-5 z-30 hidden md:flex flex-col gap-1.5 px-3 py-3 rounded-xl shadow-md transition-all hover:scale-105"
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
            }}
            title="Filtros"
            onClick={() => setFilterLayout("sidebar")}
          >
            <span className="block w-5 h-0.5 rounded-full" style={{ background: C.green }} />
            <span className="block w-5 h-0.5 rounded-full" style={{ background: C.green }} />
            <span className="block w-5 h-0.5 rounded-full" style={{ background: C.green }} />
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
