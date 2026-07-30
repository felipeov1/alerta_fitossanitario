import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
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
  BookOpen,
  Info,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Copy,
  Check,
  Sparkles,
  ArrowLeft,
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

const normalizeText = (text = "") =>
  text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const getFruitForDisease = (dName) => {
  if (!dName) return null;
  const n = normalizeText(dName);
  if (n.includes("mildio") || n.includes("uva") || n.includes("videira")) return "🍇";
  if (n.includes("sigatoka") || n.includes("banana")) return "🍌";
  if (n.includes("podridao parda") || n.includes("pessego")) return "🍑";
  if (n.includes("greening") || n.includes("laranja") || n.includes("pinta") || n.includes("citrico") || n.includes("citrus")) return "🍊";
  if (n.includes("abacate") || n.includes("antracnose")) return "🥑";
  if (n.includes("entomosporiose") || n.includes("pera")) return "🍐";
  if (n.includes("sarna") || n.includes("gala") || n.includes("maca") || n.includes("podridao amarga")) return "🍎";
  return null;
};

// Cálculos de risco baseado na lógica de Fitopatologia
const calculateDiseaseRisk = (station) => {
  if (!station) {
    return {
      sarnaRisk: "Não Favorável",
      galaRisk: "Não Favorável",
      sarnaReason: "Faltam dados climáticos da estação.",
      galaReason: "Faltam dados climáticos da estação."
    };
  }

  // Mapeia os nomes corretos das propriedades
  const ur = station.hum;
  const chuva = station.rain;
  const tmed = station.temp;

  // Validações
  if (ur === undefined || chuva === undefined || tmed === undefined) {
    return {
      sarnaRisk: "Não Favorável",
      galaRisk: "Não Favorável",
      sarnaReason: "Dados climáticos incompletos.",
      galaReason: "Dados climáticos incompletos."
    };
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

  // PMF (Período de Molhamento Foliar): 1 se UR > 90% (estrito), senão 0
  const pmf = urValue > 90 ? 1 : 0;

  // PMF com Chuva: 1 se houver folha molhada E chuva acumulada > 0
  const pmfChuva = pmf === 1 && chuvaValue > 0 ? 1 : 0;

  // Horas de molhamento: usa o campo wetness do objeto se disponível, senão chuva como proxy
  const wetnessRaw = station.wetness;
  const wetnessHours = wetnessRaw
    ? parseFloat(wetnessRaw.match(/\d+\.?\d*/)?.[0] || 0)
    : 0;
  const pmfHs = pmfChuva > 0 ? (wetnessHours > 0 ? wetnessHours : chuvaValue) : 0;

  // Temperatura média acumulada durante o período de molhamento
  const tmedAc = pmfChuva > 0 ? tmedValue : 0;

  // SARNA
  let sarnaRisk = "Não Favorável";
  let sarnaReason = "";
  if (pmfChuva < 1) {
    sarnaRisk = "Não Favorável";
    sarnaReason = "Ausência de molhamento foliar prolongado ou chuva insuficiente.";
  } else if (pmfHs < 9) {
    sarnaRisk = "Pouco Favorável";
  } else if (pmfHs >= 900) {
    sarnaRisk = "Não Favorável";
    sarnaReason = "Horas de molhamento excedem o limite comum de infecção.";
  } else if (pmfHs * tmedAc >= 140) {
    sarnaRisk = "Favorável à Doença";
  } else {
    sarnaRisk = "Não Favorável"; // >= 9h mas força insuficiente
    sarnaReason = "A combinação de horas de molhamento e temperatura foi insuficiente para a infecção.";
  }

  // MANCHA DE GALA
  let galaRisk = "Não Favorável";
  let galaReason = "";
  if (pmfHs >= 10 && tmedAc > 14.9) {
    galaRisk = "Favorável à Doença";
  } else {
    galaReason = "São necessárias pelo menos 10h de molhamento e temperatura média acima de 14,9°C.";
  }

  return { sarnaRisk, galaRisk, sarnaReason, galaReason };
};

// Manual da prevenção por cultura
const PREVENTION_MANUALS = {
  "Maçã": {
    emoji: "🍎",
    scientificName: "Malus domestica",
    description: "Diretrizes técnicas para prevenção de sarna e mancha de gala em pomares de macieira.",
    diseases: [
      {
        id: "sarna",
        name: "Sarna da Maçã",
        sci: "Venturia inaequalis",
        color: "#dc2626",
        bgColor: "#fef2f2",
        borderColor: "#fecaca",
        badgeBg: "#fee2e2",
        badgeText: "#991b1b",
        conditions: [
          { label: "Temperatura ideal", val: "10°C – 24°C", iconName: "temp" },
          { label: "Molhamento foliar", val: "≥ 9h contínuas (UR > 90%)", iconName: "wet" },
          { label: "Chuva acumulada", val: "> 25 mm / 48h", iconName: "rain" }
        ],
        tips: [
          {
            category: "Aplicação Química",
            tag: "Preventivo",
            iconType: "shield",
            text: "Aplique fungicida preventivo antes de períodos com previsão de chuva e temperatura mantida entre 10–24°C."
          },
          {
            category: "Monitoramento",
            tag: "Umidade Foliar",
            iconType: "droplet",
            text: "Monitore o molhamento foliar — o risco crítico se inicia após 9 horas contínuas de folha molhada com umidade acima de 90%."
          },
          {
            category: "Vistoria de Pomar",
            tag: "Inspeção Visual",
            iconType: "search",
            text: "Inspecione os frutos e folhas jovens regularmente por manchas escuras ou lesões aveludadas na superfície."
          },
          {
            category: "Reaplicação",
            tag: "Volume de Chuva",
            iconType: "rain",
            text: "Repita a aplicação do fungicida caso ocorra mais de 25 mm de chuva acumulada em um intervalo de 48 horas."
          },
          {
            category: "Manejo Cultural",
            tag: "Aeração de Copa",
            iconType: "sprout",
            text: "Realize podas de aeração para melhorar a ventilação e acelerar a secagem do molhamento foliar no canopy."
          }
        ]
      },
      {
        id: "gala",
        name: "Mancha de Gala",
        sci: "Colletotrichum spp.",
        color: "#d97706",
        bgColor: "#fffbeb",
        borderColor: "#fde68a",
        badgeBg: "#fef3c7",
        badgeText: "#92400e",
        conditions: [
          { label: "Temperatura limite", val: "> 14,9°C", iconName: "temp" },
          { label: "Molhamento crítico", val: "≥ 10h com calor", iconName: "wet" },
          { label: "Risco epidemiológico", val: "Alta Precipitação", iconName: "rain" }
        ],
        tips: [
          {
            category: "Ação Imediata",
            tag: "Alerta Térmico",
            iconType: "shield",
            text: "Temperatura acima de 14,9°C durante o molhamento foliar exige ação preventiva imediata no pomar."
          },
          {
            category: "Aplicação Química",
            tag: "Específico",
            iconType: "shield",
            text: "Aplique fungicidas específicos para Colletotrichum antecedendo janelas de chuva previstas pelos modelos."
          },
          {
            category: "Vigilância",
            tag: "Cultivar Gala",
            iconType: "search",
            text: "Monitore atentamente as folhas da cultivar Gala após cada evento significativo de precipitação."
          },
          {
            category: "Manejo de Irrigação",
            tag: "Prática Cultural",
            iconType: "droplet",
            text: "Evite irrigação por aspersão em dias com previsão de molhamento foliar prolongado."
          },
          {
            category: "Condição Crítica",
            tag: "Alerta Severo",
            iconType: "trending",
            text: "O risco se torna epidemiologicamente crítico com 10 horas ou mais de molhamento foliar e temperatura acima de 14,9°C."
          }
        ]
      }
    ],
    general: [
      {
        title: "Registro Climatológico Diário",
        desc: "Registre e acompanhe as condições climáticas diariamente para identificar padrões microclimáticos e anteceder o risco de surtos."
      },
      {
        title: "Manejo Integrado de Pragas (MIP)",
        desc: "Combine métodos preventivos culturais (poda, roçada e drenagem) com intervenções químicas direcionadas para maximizar a eficácia."
      },
      {
        title: "Validação de Alertas",
        desc: "Consulte sempre os alertas fitossanitários do sistema IDR-Paraná antes de definir o cronograma de aplicação de fungicidas."
      }
    ]
  },
  "Uva": {
    emoji: "🍇",
    scientificName: "Vitis vinifera / labrusca",
    description: "Diretrizes para controle e prevenção de Míldio e Oídio em parreirais.",
    diseases: [
      {
        id: "mildio",
        name: "Míldio da Videira",
        sci: "Plasmopara viticola",
        color: "#7c3aed",
        bgColor: "#f5f3ff",
        borderColor: "#ddd6fe",
        badgeBg: "#ede9fe",
        badgeText: "#5b21b6",
        conditions: [
          { label: "Temperatura ideal", val: "20°C – 25°C", iconName: "temp" },
          { label: "Molhamento", val: "≥ 2h contínuas", iconName: "wet" },
          { label: "Regra dos 10", val: "10mm chuva & broto 10cm", iconName: "rain" }
        ],
        tips: [
          {
            category: "Prevenção",
            tag: "Regra 10-10-10",
            iconType: "shield",
            text: "Inicie o monitoramento preventivo quando houver brotos com 10cm, chuva de 10mm e temperatura média de 10°C."
          },
          {
            category: "Aplicação Química",
            tag: "Fungicida Protetor",
            iconType: "shield",
            text: "Aplique fungicidas de contato antes de eventos de chuva para barrar a germinação dos zoósporos."
          },
          {
            category: "Manejo Cultural",
            tag: "Desfolha de Copa",
            iconType: "sprout",
            text: "Efetue a desfolha ao redor dos cachos para aumentar a ventilação e incidência de luz solar."
          }
        ]
      }
    ],
    general: [
      {
        title: "Drenagem do Solo",
        desc: "Garanta boa drenagem nas entrelinhas do parreiral para evitar o acúmulo prolongado de umidade no solo."
      },
      {
        title: "Aeração de Cachos",
        desc: "Mantenha o sistema de condução adequadamente ajustado para permitir rápido secamento após orvalhos."
      }
    ]
  }
};

const App = () => {
  const [selectedCrop, setSelectedCrop] = useState("");
  const [selectedPhase, setSelectedPhase] = useState("");
  const [selectedDisease, setSelectedDisease] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedFruitTab, setSelectedFruitTab] = useState(null);
  const [activeMarker, setActiveMarker] = useState(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [filtersApplied, setFiltersApplied] = useState(true);
  const [filterLayout, setFilterLayout] = useState("sidebar"); // "compact" ou "sidebar"
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [selectedForecastDay, setSelectedForecastDay] = useState(0);
  const [selectedDiseaseTab, setSelectedDiseaseTab] = useState("all");
  const [stationPhase, setStationPhase] = useState("");
  const [showPreventionModal, setShowPreventionModal] = useState(false);
  const [selectedManualCrop, setSelectedManualCrop] = useState("");
  const [manualSearchQuery, setManualSearchQuery] = useState("");
  const [manualActiveTab, setManualActiveTab] = useState("all");
  const [copiedTipIndex, setCopiedTipIndex] = useState(null);
  const [showAlertLegend, setShowAlertLegend] = useState(false);
  const [showHintBanner, setShowHintBanner] = useState(true);
  const [diseaseWetScenario, setDiseaseWetScenario] = useState({ sarna: "wet", gala: "wet" });

  const openManualForDisease = (dName) => {
    const norm = normalizeText(dName);
    let crop = "Maçã";
    let diseaseId = "all";

    if (norm.includes("sarna")) {
      crop = "Maçã";
      diseaseId = "sarna";
    } else if (norm.includes("gala") || norm.includes("mancha")) {
      crop = "Maçã";
      diseaseId = "gala";
    } else if (norm.includes("mildio") || norm.includes("uva") || norm.includes("videira")) {
      crop = "Uva";
      diseaseId = "mildio";
    } else if (norm.includes("citrus") || norm.includes("pinta")) {
      crop = "Citrus";
      diseaseId = "pinta-preta";
    }

    setSelectedManualCrop(crop);
    setManualActiveTab(diseaseId);
    setManualSearchQuery("");
    setShowPreventionModal(true);
  };

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
  const clusterGroupRef = useRef(null);
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
      id: 1, lat: -23.10, lng: -50.36, name: "Estação Bandeirantes", city: "Bandeirantes", status: "Normal", diseaseRisk: "Não Favorável", fase: "Crescimento", syncAgo: "10 minutos", fruits: ["🍎", "🍇"],
      diseases: [
        { name: "Sarna da Maçã", risk: "Não Favorável", alertCause: [] },
        { name: "Míldio da Videira", risk: "Não Favorável", alertCause: [] }
      ],
      codependency: [],
      station: { temp: "22.5°C", hum: "65%", wetness: "0 h", rain: "0 mm", wind: "12 km/h" },
      forecast: [{ day: "Hoje", date: "14/04", temp: "22°C", hum: "65%", rain: "0mm", wetness: "0 h", sarnaRisk: "Não Favorável", galaRisk: "Não Favorável" }],
      prevention: { sarna: ["Monitoramento básico de rotina."], gala: ["Monitoramento básico de rotina."] }
    },
    {
      id: 2, lat: -22.99, lng: -51.19, name: "Estação Bela Vista do Paraíso", city: "Bela Vista do Paraíso", status: "Atenção", diseaseRisk: "Pouco Favorável", fase: "Floração", syncAgo: "15 minutos", fruits: ["🍎"],
      diseases: [{ name: "Sarna da Maçã", risk: "Pouco Favorável", alertCause: [{ label: "Chuva", value: "10 mm", threshold: "0 mm", critical: true }] }],
      codependency: [],
      station: { temp: "20.1°C", hum: "85%", wetness: "5 h", rain: "10 mm", wind: "8 km/h" },
      forecast: [{ day: "Hoje", date: "14/04", temp: "20°C", hum: "85%", rain: "10mm", wetness: "5 h", sarnaRisk: "Pouco Favorável", galaRisk: "Não Favorável" }],
      prevention: { sarna: ["Cuidado preventivo com fungicidas leves."], gala: ["Risco baixo no momento."] }
    },
    {
      id: 3, lat: -26.07, lng: -53.05, name: "Estação Francisco Beltrão", city: "Francisco Beltrão", status: "Normal", diseaseRisk: "Não Favorável", fase: "Dormência", syncAgo: "5 minutos", fruits: ["🍇"],
      diseases: [{ name: "Míldio da Videira", risk: "Não Favorável", alertCause: [] }],
      codependency: [],
      station: { temp: "25.0°C", hum: "50%", wetness: "0 h", rain: "0 mm", wind: "10 km/h" },
      forecast: [{ day: "Hoje", date: "14/04", temp: "25°C", hum: "50%", rain: "0mm", wetness: "0 h", sarnaRisk: "Não Favorável", galaRisk: "Não Favorável" }],
      prevention: { sarna: ["Tempo seco."], gala: ["Tempo seco."] }
    },
    {
      id: 4, lat: -25.39, lng: -51.46, name: "Estação Guarapuava", city: "Guarapuava", status: "Crítico", diseaseRisk: "Favorável à Doença", fase: "Crescimento vegetativo", syncAgo: "2 minutos", fruits: ["🍎"],
      diseases: [
        { name: "Sarna da Maçã", sci: "Venturia inaequalis", risk: "Favorável à Doença", alertCause: [{ label: "Umidade relativa", value: "95%", threshold: "90%", critical: true }, { label: "Chuva", value: "45 mm", threshold: "Qualquer chuva", critical: true }] },
        { name: "Mancha de Gala", risk: "Pouco Favorável", alertCause: [{ label: "Umidade", value: "95%", threshold: "90%", critical: true }] }
      ],
      codependency: ["Sarna crítica, Mancha de Gala em estágio inicial."],
      station: { temp: "14.2°C", hum: "95%", wetness: "15 h", rain: "45 mm", wind: "15 km/h" },
      forecast: [{ day: "Hoje", date: "14/04", temp: "14°C", hum: "95%", rain: "45mm", wetness: "15 h", sarnaRisk: "Favorável à Doença", galaRisk: "Pouco Favorável" }],
      prevention: { sarna: ["Ação imediata requerida, aplique fungicida protetor."], gala: ["Monitorar evolução nos próximos dias chuvosos."] }
    },
    {
      id: 5, lat: -25.47, lng: -50.65, name: "Estação Irati", city: "Irati", status: "Normal", diseaseRisk: "Não Favorável", fase: "Colheita", syncAgo: "8 minutos", fruits: ["🍎", "🍑"],
      diseases: [
        { name: "Sarna da Maçã", risk: "Não Favorável", alertCause: [] },
        { name: "Podridão Parda", risk: "Não Favorável", alertCause: [] }
      ],
      codependency: [],
      station: { temp: "18.0°C", hum: "60%", wetness: "1 h", rain: "0 mm", wind: "12 km/h" },
      forecast: [{ day: "Hoje", date: "14/04", temp: "18°C", hum: "60%", rain: "0mm", wetness: "1 h", sarnaRisk: "Não Favorável", galaRisk: "Não Favorável" }],
      prevention: { sarna: ["Sem risco atual."], gala: ["Sem risco atual."] }
    },
    {
      id: 6, lat: -23.31, lng: -51.16, name: "Estação Londrina", city: "Londrina", status: "Atenção", diseaseRisk: "Pouco Favorável", fase: "Crescimento de frutos", syncAgo: "12 minutos", fruits: ["🍎", "🍇"],
      diseases: [
        { name: "Sarna da Maçã", risk: "Pouco Favorável", alertCause: [{ label: "Umidade", value: "88%", threshold: "90%", critical: false }] },
        { name: "Míldio da Videira", risk: "Pouco Favorável", alertCause: [{ label: "Umidade", value: "88%", threshold: "90%", critical: false }] }
      ],
      codependency: [],
      station: { temp: "19.5°C", hum: "88%", wetness: "7 h", rain: "5 mm", wind: "8 km/h" },
      forecast: [{ day: "Hoje", date: "14/04", temp: "19°C", hum: "88%", rain: "5mm", wetness: "7 h", sarnaRisk: "Pouco Favorável", galaRisk: "Pouco Favorável" }],
      prevention: { sarna: ["Risco moderado, observe a umidade noturna."], gala: ["Risco moderado."] }
    },
    {
      id: 7, lat: -25.47, lng: -48.83, name: "Estação Morretes", city: "Morretes", status: "Crítico", diseaseRisk: "Favorável à Doença", fase: "Crescimento vegetativo", syncAgo: "1 minuto", fruits: ["🍌"],
      diseases: [{ name: "Sigatoka Negra", risk: "Favorável à Doença", alertCause: [{ label: "Chuva", value: "60 mm", threshold: "10 mm", critical: true }] }],
      codependency: ["Alta umidade da serra do mar favorece doenças fúngicas."],
      station: { temp: "24.1°C", hum: "98%", wetness: "24 h", rain: "60 mm", wind: "5 km/h" },
      forecast: [{ day: "Hoje", date: "14/04", temp: "24°C", hum: "98%", rain: "60mm", wetness: "24 h", sarnaRisk: "Não Favorável", galaRisk: "Não Favorável" }],
      prevention: { sarna: ["Não aplicável para banana."], gala: ["Não aplicável para banana."] }
    },
    {
      id: 8, lat: -26.47, lng: -51.99, name: "Estação Palmas", city: "Palmas", status: "Crítico", diseaseRisk: "Favorável à Doença", fase: "Frutificação", syncAgo: "25 minutos", fruits: ["🍎"],
      diseases: [
        { name: "Sarna da Maçã", risk: "Favorável à Doença", alertCause: [{ label: "Folha molhada", value: "38 h", threshold: "9 h", critical: true }] },
        { name: "Mancha de Gala", risk: "Favorável à Doença", alertCause: [{ label: "Temperatura", value: "16.2°C", threshold: "14.9°C", critical: true }] }
      ],
      codependency: ["A folha ficou molhada por 38h, ativando tanto Sarna quanto Mancha de Gala."],
      station: { temp: "16.2°C", hum: "92%", wetness: "38 h", rain: "38 mm", wind: "7 km/h" },
      forecast: [{ day: "Hoje", date: "14/04", temp: "16°C", hum: "92%", rain: "38mm", wetness: "11 h", sarnaRisk: "Favorável à Doença", galaRisk: "Favorável à Doença" }],
      prevention: { sarna: ["Inspecione frutos e aplique fungicida imediatamente."], gala: ["Ação imediata para cultivar Gala."] }
    },
    {
      id: 9, lat: -25.71, lng: -53.76, name: "Estação Planalto", city: "Planalto", status: "Normal", diseaseRisk: "Não Favorável", fase: "Colheita", syncAgo: "30 minutos", fruits: ["🍎"],
      diseases: [{ name: "Sarna da Maçã", risk: "Não Favorável", alertCause: [] }],
      codependency: [],
      station: { temp: "26.0°C", hum: "45%", wetness: "0 h", rain: "0 mm", wind: "10 km/h" },
      forecast: [{ day: "Hoje", date: "14/04", temp: "26°C", hum: "45%", rain: "0mm", wetness: "0 h", sarnaRisk: "Não Favorável", galaRisk: "Não Favorável" }],
      prevention: { sarna: ["Tempo seco."], gala: ["Tempo seco."] }
    },
    {
      id: 10, lat: -25.09, lng: -50.16, name: "Estação Ponta Grossa", city: "Ponta Grossa", status: "Atenção", diseaseRisk: "Pouco Favorável", fase: "Dormência", syncAgo: "5 minutos", fruits: ["🍑"],
      diseases: [{ name: "Podridão Parda", risk: "Pouco Favorável", alertCause: [{ label: "Chuva", value: "5 mm", threshold: "0 mm", critical: true }] }],
      codependency: [],
      station: { temp: "18.5°C", hum: "80%", wetness: "4 h", rain: "5 mm", wind: "12 km/h" },
      forecast: [{ day: "Hoje", date: "14/04", temp: "18°C", hum: "80%", rain: "5mm", wetness: "4 h", sarnaRisk: "Não Favorável", galaRisk: "Não Favorável" }],
      prevention: { sarna: ["Risco moderado."], gala: ["Risco moderado."] }
    },
    {
      id: 11, lat: -25.05, lng: -53.63, name: "Estação Santa Tereza do Oeste", city: "Santa Tereza do Oeste", status: "Normal", diseaseRisk: "Não Favorável", fase: "Dormência", syncAgo: "14 minutos", fruits: ["🍎"],
      diseases: [{ name: "Sarna da Maçã", risk: "Não Favorável", alertCause: [] }],
      codependency: [],
      station: { temp: "24.5°C", hum: "55%", wetness: "0 h", rain: "0 mm", wind: "8 km/h" },
      forecast: [{ day: "Hoje", date: "14/04", temp: "24°C", hum: "55%", rain: "0mm", wetness: "0 h", sarnaRisk: "Não Favorável", galaRisk: "Não Favorável" }],
      prevention: { sarna: ["Nenhum risco."], gala: ["Nenhum risco."] }
    },
    {
      id: 12, lat: -24.32, lng: -50.61, name: "Estação Telêmaco Borba", city: "Telêmaco Borba", status: "Atenção", diseaseRisk: "Pouco Favorável", fase: "Crescimento", syncAgo: "20 minutos", fruits: ["🍎", "🍇"],
      diseases: [
        { name: "Sarna da Maçã", risk: "Pouco Favorável", alertCause: [{ label: "Umidade relativa", value: "89%", threshold: "90%", critical: false }] },
        { name: "Míldio da Videira", risk: "Pouco Favorável", alertCause: [{ label: "Umidade relativa", value: "89%", threshold: "90%", critical: false }] }
      ],
      codependency: [],
      station: { temp: "21.0°C", hum: "89%", wetness: "6 h", rain: "8 mm", wind: "9 km/h" },
      forecast: [{ day: "Hoje", date: "14/04", temp: "21°C", hum: "89%", rain: "8mm", wetness: "6 h", sarnaRisk: "Pouco Favorável", galaRisk: "Não Favorável" }],
      prevention: { sarna: ["Pode evoluir caso a chuva continue."], gala: ["Baixo risco."] }
    },
    {
      id: 13, lat: -23.73, lng: -53.48, name: "Estação Xambrê", city: "Xambrê", status: "Normal", diseaseRisk: "Não Favorável", fase: "Colheita", syncAgo: "9 minutos", fruits: ["🍇"],
      diseases: [{ name: "Míldio da Videira", risk: "Não Favorável", alertCause: [] }],
      codependency: [],
      station: { temp: "27.0°C", hum: "40%", wetness: "0 h", rain: "0 mm", wind: "14 km/h" },
      forecast: [{ day: "Hoje", date: "14/04", temp: "27°C", hum: "40%", rain: "0mm", wetness: "0 h", sarnaRisk: "Não Favorável", galaRisk: "Não Favorável" }],
      prevention: { sarna: ["Atenção à qualidade da uva pós-colheita."], gala: ["Nenhum risco no campo."] }
    }
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

  const getMarkerForecast = (marker) => {
    if (!marker) return [];

    const baseTemp = parseFloat(marker.station?.temp || "20");
    const baseHum = parseFloat(marker.station?.hum || "70");
    const baseRain = parseFloat(marker.station?.rain || "0");
    const baseWet = parseFloat(marker.station?.wetness || "0");

    const daysConfig = [
      { day: "Hoje", date: "29/07", tempMod: 0, humMod: 0, rainMod: 0, wetMod: 0 },
      { day: "Amanhã", date: "30/07", tempMod: -2, humMod: 10, rainMod: baseRain > 0 ? 10 : 5, wetMod: baseWet > 0 ? 3 : 1 },
      { day: "Quinta", date: "31/07", tempMod: -4, humMod: 15, rainMod: baseRain > 0 ? 25 : 0, wetMod: baseWet > 0 ? 6 : 0 },
      { day: "Sexta", date: "01/08", tempMod: 1, humMod: -10, rainMod: 0, wetMod: 0 },
      { day: "Sábado", date: "02/08", tempMod: 3, humMod: -15, rainMod: 0, wetMod: 0 },
    ];

    return daysConfig.map((cfg) => {
      const tempVal = Math.round(baseTemp + cfg.tempMod);
      const humVal = Math.min(100, Math.max(30, Math.round(baseHum + cfg.humMod)));
      const rainVal = Math.max(0, Math.round(baseRain + cfg.rainMod));
      const wetVal = Math.max(0, Math.round(baseWet + cfg.wetMod));

      const dayStation = { temp: `${tempVal}°C`, hum: `${humVal}%`, rain: `${rainVal} mm`, wetness: `${wetVal} h` };
      const calc = calculateDiseaseRisk(dayStation);

      return {
        day: cfg.day,
        date: cfg.date,
        temp: `${tempVal}°C`,
        hum: `${humVal}%`,
        rain: `${rainVal} mm`,
        wetness: `${wetVal} h`,
        sarnaRisk: calc.sarnaRisk,
        galaRisk: calc.galaRisk
      };
    });
  };

  const getMaxForecastRisk = (marker) => {
    const list = getMarkerForecast(marker);
    if (!list || list.length === 0) return "Não Favorável";
    const order = { "Favorável à Doença": 3, "Pouco Favorável": 2, "Não Favorável": 1 };
    let max = 0;
    list.forEach((d) => {
      max = Math.max(max, order[d.sarnaRisk] || 0, order[d.galaRisk] || 0);
    });
    if (max === 3) return "Favorável à Doença";
    if (max === 2) return "Pouco Favorável";
    return "Não Favorável";
  };

  const getCropEmoji = (cropName) => {
    if (cropName === "Maçã") return "🍎";
    if (cropName === "Uva") return "🍇";
    if (cropName === "Banana") return "🍌";
    if (cropName === "Pêssego") return "🍑";
    return null;
  };

  const getMarkerFruits = (marker) => {
    if (!marker) return [];
    const fruits = marker.fruits || [];
    const diseaseFruits = (marker.diseases || [])
      .map((disease) => getFruitForDisease(disease.name))
      .filter(Boolean);
    const allFruits = Array.from(new Set([...fruits, ...diseaseFruits]));

    if (selectedCrop) {
      const activeEmoji = getCropEmoji(selectedCrop);
      if (activeEmoji && allFruits.includes(activeEmoji)) {
        return [activeEmoji];
      }
    }

    return allFruits;
  };

  const handleClearFilters = () => {
    setSelectedCrop("");
    setSelectedPhase("");
    setSelectedDisease("");
    setSelectedCity("");
    setSelectedFruitTab(null);
    setSelectedDiseaseTab("all");
    setFiltersApplied(true);
  };

  const handleMarkerClick = (marker, targetFruit = null) => {
    const markerFruits = getMarkerFruits(marker);
    const firstFruitWithDisease = markerFruits.find((fruit) =>
      marker.diseases?.some((disease) => getFruitForDisease(disease.name) === fruit),
    );
    setActiveMarker(marker);
    setSelectedFruitTab(targetFruit || firstFruitWithDisease || markerFruits[0] || null);
    setSelectedDiseaseTab("all");
    setStationPhase(marker?.fase || "Floração");
    setShowBottomSheet(true);
    setSelectedForecastDay(0);
  };

  useEffect(() => {
    window.handleFruitClick = (stationId, fruitEmoji, e) => {
      if (e) e.stopPropagation();
      const m = markers.find((item) => item.id === Number(stationId));
      if (m) {
        handleMarkerClick(m, fruitEmoji);
      }
    };
  }, [markers]);

  const getDiseaseRisk = (disease, station) => {
    if (!disease) return "Não Favorável";
    if (disease.name === "Sarna da Maçã" || disease.name === "Mancha de Gala") {
      const calculated = calculateDiseaseRisk(station);
      if (disease.name === "Sarna da Maçã") return calculated.sarnaRisk;
      return calculated.galaRisk;
    }
    return disease.risk || "Não Favorável";
  };

  const getMarkerIcon = (m, isActive) => {
    const worstRisk = (alerts) => {
      if (alerts.some((d) => getDiseaseRisk(d, m.station) === "Favorável à Doença")) return "Favorável à Doença";
      if (alerts.some((d) => getDiseaseRisk(d, m.station) === "Pouco Favorável")) return "Pouco Favorável";
      return "Não Favorável";
    };

    const riskColorCode = (r) =>
      r === "Favorável à Doença" ? "#ef4444"
        : r === "Pouco Favorável" ? "#f59e0b"
          : "#10b981";

    const riskBgCode = (r) =>
      r === "Favorável à Doença" ? "#fef2f2"
        : r === "Pouco Favorável" ? "#fffbeb"
          : "#ecfdf5";

    const riskBorderCode = (r) =>
      r === "Favorável à Doença" ? "#fca5a5"
        : r === "Pouco Favorável" ? "#fde68a"
          : "#a7f3d0";

    const markerFruits = getMarkerFruits(m);
    const fruitsToRender = markerFruits.length > 0 ? markerFruits : ["📍"];

    const alertsByFruit = {};
    fruitsToRender.forEach((f) => { alertsByFruit[f] = []; });
    m.diseases?.forEach((d) => {
      const fe = getFruitForDisease(d.name);
      if (fe && alertsByFruit[fe]) alertsByFruit[fe].push(d);
    });

    const scale = isActive ? 1.08 : 1;

    const fruitBlocks = fruitsToRender.map((f) => {
      const alerts = alertsByFruit[f] || [];
      const fruitWorstRisk = alerts.length > 0 ? worstRisk(alerts) : "Não Favorável";
      const fruitBg = riskBgCode(fruitWorstRisk);
      const fruitBorder = riskBorderCode(fruitWorstRisk);
      const isSelected = isActive && selectedFruitTab === f;

      // LED dots for each disease of this fruit
      const diseaseDots = alerts.map((d) => {
        const dRisk = getDiseaseRisk(d, m.station);
        const color = riskColorCode(dRisk);
        return `<span title="Doença: ${d.name} (${dRisk})" style="
          width:6px;height:6px;border-radius:50%;
          background:${color};box-shadow:0 0 4px ${color};
          display:inline-block;flex-shrink:0;
        "></span>`;
      }).join("");

      const dotsRow = alerts.length > 0
        ? `<div style="display:flex;gap:3px;align-items:center;justify-content:center;margin-top:2px;">${diseaseDots}</div>`
        : `<div style="display:flex;gap:3px;align-items:center;justify-content:center;margin-top:2px;"><span style="width:5px;height:5px;border-radius:50%;background:#10b981;"></span></div>`;

      return `
        <button
          type="button"
          onclick="window.handleFruitClick(${m.id}, '${f}', event)"
          ontouchstart="event.stopPropagation();this.style.transform='scale(0.92)';"
          ontouchend="this.style.transform='${isSelected ? "scale(1.08)" : "scale(1)"}';"
          title="Ver alertas de ${f} em ${m.city}"
          style="
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            min-width:36px;min-height:40px;
            background:#ffffff;
            border:${isSelected ? "2px solid #1e6b45" : "1.5px solid #e2e8f0"};
            border-radius:12px;padding:4px 6px;
            box-shadow:${isSelected ? "0 4px 12px rgba(30,107,69,0.35)" : "0 1px 4px rgba(0,0,0,0.06)"};
            cursor:pointer;transition:transform 0.1s ease;
            transform:${isSelected ? "scale(1.08)" : "scale(1)"};
            outline:none;position:relative;margin:0;
            touch-action:manipulation;-webkit-tap-highlight-color:transparent;
          "
        >
          <span style="font-size:17px;line-height:1;pointer-events:none;">${f}</span>
          ${dotsRow}
        </button>
      `;
    }).join("");

    const html = `
      <div style="display:flex;flex-direction:column;align-items:center;position:relative;transform:scale(${scale});transform-origin:bottom center;touch-action:manipulation;">
        <div style="
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border: 1.5px solid ${isActive ? C.green : "rgba(226, 232, 240, 0.9)"};
          border-radius: 16px; padding: 5px 8px 6px 8px;
          box-shadow: 0 10px 25px -4px rgba(15, 23, 42, 0.18);
          display: flex; flex-direction: column; gap: 4px; align-items: center;
          min-width: 80px; position: relative;
        ">
          <!-- Header: Station City Name -->
          <div
            onclick="window.handleFruitClick(${m.id}, null, event)"
            ontouchstart="event.stopPropagation();"
            style="display:flex;align-items:center;justify-content:center;width:100%;cursor:pointer;padding-bottom:1px;"
          >
            <span style="font-size:10px;font-weight:900;color:${C.green};letter-spacing:-0.2px;white-space:nowrap;pointer-events:none;">${m.city || m.name}</span>
          </div>

          <!-- Fruit Buttons Container -->
          <div style="display:flex;align-items:center;gap:5px;">
            ${fruitBlocks}
          </div>
        </div>

        <!-- Pointer Needle -->
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${isActive ? C.green : "#ffffff"};"></div>
      </div>
    `;
    const width = fruitsToRender.length * 42 + 40;
    const height = 64;

    return window.L.divIcon({
      className: "custom-leaflet-marker",
      html,
      iconSize: [width, height],
      iconAnchor: [width / 2, height],
    });
  };

  useEffect(() => {
    if (window.L && window.L.markerClusterGroup) {
      setLeafletLoaded(true);
      return;
    }

    const loadStyle = (href) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    };

    const loadScript = (src) => new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      document.head.appendChild(script);
    });

    loadStyle("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
    loadStyle("https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css");
    loadStyle("https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css");

    loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js").then(() => {
      loadScript("https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js").then(() => {
        setLeafletLoaded(true);
      });
    });
  }, []);

  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return;
    const L = window.L;
    // Centered on Paraná state - ajustado conforme a posição do print do usuário
    const zoomLevel = isDesktop ? 8 : 6;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      minZoom: 6
    }).setView(
      [-24.4, -52.3],
      zoomLevel,
    );
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 45,
      iconCreateFunction: function (cluster) {
        const count = cluster.getChildCount();
        const size = count < 10 ? 32 : count < 50 ? 40 : 48;
        return L.divIcon({
          html: `<div style="background-color: ${C.green}; color: white; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: bold; font-size: ${size === 32 ? 14 : 16}px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2.5px solid white;">${count}</div>`,
          className: 'custom-cluster-icon',
          iconSize: L.point(size, size)
        });
      }
    });
    clusterGroupRef.current = clusterGroup;

    map.addLayer(clusterGroup);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = {};
      clusterGroupRef.current = null;
    };
  }, [leafletLoaded]);

  const getFilteredMarkers = () => {
    return markers.filter((m) => {
      // 1. Fruta
      if (selectedCrop) {
        const markerFruits = getMarkerFruits(m);
        const fruitNames = markerFruits.map((emoji) => {
          if (emoji === "🍎") return "Maçã";
          if (emoji === "🍇") return "Uva";
          if (emoji === "🍌") return "Banana";
          if (emoji === "🍊") return "Citrus";
          if (emoji === "🍑") return "Pêssego";
          return "";
        });
        if (!fruitNames.includes(selectedCrop)) return false;
      }

      // 2. Fase
      if (selectedPhase) {
        const normPhase = normalizeText(selectedPhase);
        const markerPhase = normalizeText(m.fase || "");
        if (!markerPhase.includes(normPhase)) return false;
      }

      // 3. Doença
      if (selectedDisease) {
        const normDis = normalizeText(selectedDisease);
        const targetFruit = getFruitForDisease(selectedDisease);
        const hasExplicit = m.diseases?.some((d) => normalizeText(d.name).includes(normDis));
        const hasFruit = targetFruit && getMarkerFruits(m).includes(targetFruit);
        if (!hasExplicit && !hasFruit) return false;
      }

      // 4. Município / Estação
      if (selectedCity) {
        const normCity = normalizeText(selectedCity);
        const markerCity = normalizeText(m.city || m.name || "");
        if (!markerCity.includes(normCity)) return false;
      }

      return true;
    });
  };

  const getFilterOptions = () => {
    // Filter base markers by city if selected
    const cityBaseMarkers = markers.filter((m) => {
      if (selectedCity) {
        const normCity = normalizeText(selectedCity);
        const markerCity = normalizeText(m.city || m.name || "");
        if (!markerCity.includes(normCity)) return false;
      }
      return true;
    });

    // 1. Available Crops (based on city filter or all)
    const availableFruitEmojis = new Set();
    cityBaseMarkers.forEach((m) => {
      getMarkerFruits(m).forEach((f) => availableFruitEmojis.add(f));
    });

    const cropOpts = [];
    if (availableFruitEmojis.has("🍎")) cropOpts.push("Maçã");
    if (availableFruitEmojis.has("🍇")) cropOpts.push("Uva");
    if (availableFruitEmojis.has("🍌")) cropOpts.push("Banana");
    if (availableFruitEmojis.has("🍑")) cropOpts.push("Pêssego");

    // 2. Matching markers based on selected Crop and City
    const cropMatchingMarkers = cityBaseMarkers.filter((m) => {
      if (!selectedCrop) return true;
      const markerFruits = getMarkerFruits(m);
      const fruitNames = markerFruits.map((emoji) => {
        if (emoji === "🍎") return "Maçã";
        if (emoji === "🍇") return "Uva";
        if (emoji === "🍌") return "Banana";
        if (emoji === "🍑") return "Pêssego";
        return "";
      });
      return fruitNames.includes(selectedCrop);
    });

    // 3. Relational Diseases for selected Crop / City
    let diseaseOpts = [];
    if (selectedCrop === "Maçã") {
      diseaseOpts = ["Sarna da Maçã", "Mancha de Gala"];
    } else if (selectedCrop === "Uva") {
      diseaseOpts = ["Míldio da Videira"];
    } else if (selectedCrop === "Banana") {
      diseaseOpts = ["Sigatoka Negra"];
    } else if (selectedCrop === "Pêssego") {
      diseaseOpts = ["Podridão Parda"];
    } else {
      const dSet = new Set();
      cropMatchingMarkers.forEach((m) => {
        m.diseases?.forEach((d) => dSet.add(d.name));
        const fruits = getMarkerFruits(m);
        if (fruits.includes("🍎")) { dSet.add("Sarna da Maçã"); dSet.add("Mancha de Gala"); }
        if (fruits.includes("🍇")) dSet.add("Míldio da Videira");
        if (fruits.includes("🍌")) dSet.add("Sigatoka Negra");
        if (fruits.includes("🍑")) dSet.add("Podridão Parda");
      });
      diseaseOpts = Array.from(dSet);
    }

    // 4. Relational Phenological Phases
    const phaseSet = new Set();
    cropMatchingMarkers.forEach((m) => {
      if (m.fase) phaseSet.add(m.fase);
    });
    const phaseOpts = Array.from(phaseSet);

    // 5. Relational Cities based strictly on selected Crop & Disease
    const cityMatchingMarkers = markers.filter((m) => {
      if (selectedCrop) {
        const markerFruits = getMarkerFruits(m);
        const fruitNames = markerFruits.map((emoji) => {
          if (emoji === "🍎") return "Maçã";
          if (emoji === "🍇") return "Uva";
          if (emoji === "🍌") return "Banana";
          if (emoji === "🍑") return "Pêssego";
          return "";
        });
        if (!fruitNames.includes(selectedCrop)) return false;
      }
      if (selectedDisease) {
        const normDis = normalizeText(selectedDisease);
        const hasExplicit = m.diseases?.some((d) => normalizeText(d.name).includes(normDis));
        const targetFruit = getFruitForDisease(selectedDisease);
        const hasFruit = targetFruit && getMarkerFruits(m).includes(targetFruit);
        return hasExplicit || hasFruit;
      }
      return true;
    });

    const cityOpts = Array.from(new Set(cityMatchingMarkers.map((m) => m.city || m.name)));

    return { cropOpts, phaseOpts, diseaseOpts, cityOpts };
  };

  useEffect(() => {
    if (!leafletLoaded || !window.L || !clusterGroupRef.current) return;

    const L = window.L;
    const clusterGroup = clusterGroupRef.current;
    clusterGroup.clearLayers();
    markersRef.current = {};

    const currentFiltered = getFilteredMarkers();

    currentFiltered.forEach((m) => {
      const isActive = activeMarker?.id === m.id;
      const icon = getMarkerIcon(m, isActive);
      const marker = L.marker([m.lat, m.lng], { icon });
      marker.on("click", () => handleMarkerClick(m));
      markersRef.current[m.id] = marker;
      clusterGroup.addLayer(marker);
    });

    if (activeMarker && !currentFiltered.some((m) => m.id === activeMarker.id)) {
      setActiveMarker(null);
      setShowBottomSheet(false);
    }
  }, [activeMarker, leafletLoaded, filtersApplied, selectedCrop, selectedPhase, selectedDisease, selectedCity]);

  return (
    <div
      className="flex flex-col h-screen font-sans overflow-hidden"
      style={{ background: C.background, color: C.textDark, height: "100dvh" }}
    >
      {/* ── HEADER ── */}
      <header className="z-50 shadow-lg sticky top-0 relative bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white border-b border-emerald-800/50 overflow-hidden">
        {/* Subtle background glow accents for depth */}
        <div className="absolute -top-10 left-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-1/4 w-64 h-24 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 px-3 md:px-6 py-2.5 md:py-3 flex items-center justify-between gap-3 min-h-14 md:min-h-16">
          {/* Logo + Title */}
          <div className="flex items-center shrink-0 gap-2.5 md:gap-3.5">
            <img
              src="/images/image.webp"
              alt="IDR-Paraná"
              className="h-8 md:h-10 w-auto object-contain drop-shadow-sm"
              style={{ filter: "brightness(0) invert(1)" }}
            />
            <div className="border-l border-emerald-700/60 pl-2.5 md:pl-3.5 flex flex-col justify-center">
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400 leading-none mb-0.5">
                SISTEMA IDR-PARANÁ
              </span>
              <p className="text-xs md:text-sm font-black tracking-tight text-white leading-tight">
                Alerta Fitossanitário
              </p>
            </div>
          </div>

          {/* Action Button: Manual de Prevenção */}
          <button
            onClick={() => {
              setSelectedManualCrop(""); // Sempre abre no menu de seleção
              setShowPreventionModal(true);
            }}
            className="group relative flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-bold text-xs md:text-sm text-white bg-white/10 hover:bg-white/20 backdrop-blur-md shadow-md hover:shadow-emerald-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-white/20 overflow-hidden cursor-pointer"
          >
            {/* Gloss / Shine animation overlay */}
            <div className="absolute inset-0 w-1/2 h-full bg-white/15 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out pointer-events-none" />

            <div className="flex items-center justify-center p-1 rounded-lg bg-emerald-500/20 text-emerald-300 group-hover:bg-white group-hover:text-emerald-950 transition-colors shadow-inner shrink-0 border border-emerald-400/30">
              <BookOpen size={16} className="transition-transform group-hover:rotate-6" />
            </div>

            <span className="hidden sm:inline tracking-tight font-extrabold text-white">Manual de Prevenção</span>
            <span className="sm:hidden font-extrabold text-white">Manual</span>

            <span className="hidden md:inline-flex items-center px-2 py-0.5 text-[9px] uppercase tracking-wider font-extrabold rounded-md bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
              Guia
            </span>
          </button>
        </div>
      </header>

      {/* ── MAP AREA ── */}
      <main className="flex-1 relative overflow-hidden">
        {/* SIDEBAR FILTRO — Versão melhorada, apenas desktop e quando layout=sidebar */}
        {filtersApplied &&
          filterLayout === "sidebar" &&
          isDesktop &&
          (() => {
            const { cropOpts, phaseOpts, diseaseOpts, cityOpts } = getFilterOptions();

            const filters = [
              {
                icon: Sprout,
                label: "Fruta",
                placeholder: "Todas as Frutas",
                val: selectedCrop,
                set: (v) => {
                  setSelectedCrop(v);
                  setSelectedDisease("");
                  setSelectedCity("");
                },
                opts: cropOpts,
              },
              {
                icon: TrendingUp,
                label: "Fase Fenológica",
                placeholder: "Todas as Fases",
                val: selectedPhase,
                set: setSelectedPhase,
                opts: phaseOpts,
              },
              {
                icon: Bug,
                label: "Doença",
                placeholder: "Todas as Doenças",
                val: selectedDisease,
                set: (v) => {
                  setSelectedDisease(v);
                  setSelectedCity("");
                },
                opts: diseaseOpts,
              },
              {
                icon: MapPin,
                label: "Município / Estação",
                placeholder: "Todos os Municípios",
                val: selectedCity,
                set: setSelectedCity,
                opts: cityOpts,
              },
            ];

            return (
              <div
                className="absolute left-6 top-6 z-30 hidden md:flex flex-col p-6 rounded-2xl shadow-lg backdrop-blur-sm animate-in"
                style={{
                  background: "rgba(255,255,255,0.70)",
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
                      Filtragem em tempo real
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
                              color: C.greenMid,
                            }}
                          />
                          {f.label}
                        </div>
                      </label>
                      <select
                        className="w-full px-3 py-2.5 appearance-none rounded-lg text-sm font-medium outline-none transition-all cursor-pointer"
                        style={{
                          background: C.white,
                          border: `1.5px solid ${C.border}`,
                          color: f.val ? C.textDark : "#9ca3af",
                        }}
                        value={f.val}
                        onChange={(e) => {
                          f.set(e.target.value);
                          setFiltersApplied(true);
                        }}
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

                {/* BOTÃO DE LIMPAR FILTROS NO DESKTOP */}
                {(selectedCrop || selectedPhase || selectedDisease || selectedCity) && (
                  <div className="mt-6">
                    <button
                      className="w-full py-2.5 rounded-xl font-extrabold text-xs text-slate-700 hover:bg-slate-200/80 transition-all border border-slate-300 shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      onClick={handleClearFilters}
                    >
                      <X size={14} /> LIMPAR FILTROS
                    </button>
                  </div>
                )}

              </div>
            );
          })()}

        {/* Botão Flutuante de Filtros no Canto Superior Esquerdo (Mobile) */}
        {!showBottomSheet && !showFilterSheet && (
          <button
            onClick={() => setShowFilterSheet(true)}
            className="absolute top-4 left-4 z-20 flex md:hidden items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl font-bold text-xs transition-all pointer-events-auto hover:scale-105 active:scale-95"
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              color: C.green,
              border: `1.5px solid rgba(226, 232, 240, 0.9)`,
              boxShadow: "0 10px 25px -4px rgba(15, 23, 42, 0.15)",
            }}
          >
            <Search size={15} style={{ color: C.green }} />
            <span>Filtros</span>
          </button>
        )}

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
                  onClick={() => {
                    setFiltersApplied(true);
                    setFilterLayout("sidebar");
                    setShowFilterSheet(false);
                  }}
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
                      placeholder: "Fruta",
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
                    setFiltersApplied(true);
                    setShowFilterSheet(false);
                  }}
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
                width: "680px",
                minWidth: "640px",
                maxWidth: "calc(100vw - 2rem)",
                maxHeight: "calc(100vh - 1.5rem)",
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
                  style={{ background: riskBg(getMaxForecastRisk(activeMarker)) }}
                >
                  <MapPin size={22} style={{ color: riskColor(getMaxForecastRisk(activeMarker)) }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.green }}>Estação</p>
                  <h2 className="text-lg font-extrabold tracking-tight leading-tight" style={{ color: C.green }}>
                    {activeMarker?.name}
                  </h2>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={11} style={{ color: "#9ca3af" }} />
                    <p className="text-[11px]" style={{ color: "#6b7280" }}>{activeMarker?.city}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Fase Fenológica Header Card */}
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl mb-4"
              style={{ background: C.greenUltra, border: `1px solid ${C.greenPale}` }}
            >
              <Sprout size={15} style={{ color: C.green }} />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: C.greenMid }}>Fase Fenológica Selecionada</p>
                <p className="text-xs font-semibold leading-tight" style={{ color: C.textDark }}>{stationPhase || activeMarker?.fase}</p>
              </div>
            </div>

            {/* ── PREVISÃO 5 DIAS ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-700">
                    <TrendingUp size={14} />
                  </div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Previsão Agrometeorológica (5 Dias)
                  </p>
                </div>
                <span className="text-[10px] font-bold text-slate-400">
                  Selecione o dia para simular o risco
                </span>
              </div>

              {/* Tira de 5 dias */}
              {(() => {
                const forecastList = getMarkerForecast(activeMarker);
                return (
                  <div className="grid grid-cols-5 gap-2 p-1.5 w-full">
                    {forecastList.map((f, i) => {
                      const sel = selectedForecastDay === i;
                      const dayStation = { temp: f.temp, hum: f.hum, wetness: f.wetness, rain: f.rain };
                      const calc = calculateDiseaseRisk(dayStation);

                      const stationDiseases = activeMarker?.diseases || [{ name: "Sarna da Maçã" }];
                      const diseaseDots = stationDiseases.map((d) => {
                        let risk = d.risk;
                        if (d.name === "Sarna da Maçã") risk = calc.sarnaRisk;
                        else if (d.name === "Mancha de Gala") risk = calc.galaRisk;
                        return { name: d.name, risk };
                      });

                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedForecastDay(i)}
                          className={`w-full h-[98px] flex flex-col items-center justify-between py-2 px-1 rounded-2xl transition-all cursor-pointer relative ${
                            sel
                              ? "bg-white border-2 border-emerald-600 shadow-md scale-[1.02]"
                              : "bg-slate-50 border-2 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex flex-col items-center leading-none">
                            <span className={`text-xs font-black truncate w-full text-center ${sel ? "text-emerald-800" : "text-slate-700"}`}>
                              {f.day}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 mt-0.5">{f.date}</span>
                          </div>

                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex items-center gap-1">
                              <ThermometerSun size={11} className="text-amber-500" />
                              <span className="text-[10px] font-extrabold text-slate-800">{f.temp}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CloudRain size={11} className="text-blue-500" />
                              <span className="text-[10px] font-extrabold text-slate-800">{f.rain}</span>
                            </div>
                          </div>

                          {/* Disease LED Dots Row (igual aos balões das estações do mapa) */}
                          <div className="flex items-center justify-center gap-1 pb-0.5">
                            {diseaseDots.map((dot, idx) => (
                              <span
                                key={idx}
                                title={`${dot.name}: ${dot.risk}`}
                                className={`w-2 h-2 rounded-full transition-all ${
                                  dot.risk === "Favorável à Doença"
                                    ? "bg-red-500 shadow-[0_0_6px_#ef4444] animate-pulse"
                                    : dot.risk === "Pouco Favorável"
                                    ? "bg-amber-500 shadow-[0_0_4px_#f59e0b]"
                                    : "bg-emerald-500 shadow-[0_0_4px_#10b981]"
                                }`}
                              />
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Detalhe do dia selecionado */}
              {(() => {
                const forecastList = getMarkerForecast(activeMarker);
                const f = forecastList[selectedForecastDay] || forecastList[0];
                if (!f) return null;

                const metricCards = [
                  { Icon: ThermometerSun, label: "Temp.", value: f.temp },
                  { Icon: Droplets, label: "UR", value: f.hum },
                  { Icon: CloudRain, label: "Chuva", value: f.rain },
                  { Icon: Leaf, label: "Molhamento", value: f.wetness || "0 h" },
                ];

                return (
                  <div
                    className="rounded-2xl p-3 space-y-3"
                    style={{ background: "#F8FAFB", border: "1px solid #F1F3F5" }}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {metricCards.map(({ Icon, label, value }) => (
                        <div
                          key={label}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl h-[54px] min-w-0"
                          style={{ background: C.white, border: "1px solid #edf2f0" }}
                        >
                          <Icon size={16} style={{ color: C.greenMid }} className="shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#9ca3af" }}>
                              {label}
                            </p>
                            <p className="text-xs font-black truncate" style={{ color: C.textDark }}>
                              {value}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Menu por Cultura, Fase e Doença */}
            <div className="space-y-3 mt-6 pt-4 border-t border-slate-200/80">
              <div className="flex items-center justify-between px-1 mb-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 shrink-0">
                    <Bug size={15} />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Menu por Cultura, Fase e Doença
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400">
                  Filtre Cultura, Fase e Enfermidade
                </span>
              </div>

              {/* Passo 1: Menu por Cultura */}
              {(() => {
                const markerFruits = getMarkerFruits(activeMarker);
                if (markerFruits.length === 0) return null;

                return (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-1">
                      1. Selecione a Cultura:
                    </p>
                    <div className="p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
                      {markerFruits.map((fruitEmoji, idx) => {
                        const isSelected = markerFruits.length === 1 || selectedFruitTab === fruitEmoji;
                        const getFruitName = (emoji) => {
                          if (emoji === "🍎") return "Maçã";
                          if (emoji === "🍇") return "Uva";
                          if (emoji === "🍌") return "Banana";
                          if (emoji === "🍐") return "Pera";
                          if (emoji === "🍊") return "Laranja";
                          if (emoji === "🥑") return "Abacate";
                          if (emoji === "🍑") return "Pêssego";
                          return "Cultura";
                        };

                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (markerFruits.length > 1) {
                                setSelectedFruitTab(fruitEmoji);
                                setSelectedDiseaseTab("all");
                              }
                            }}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold text-xs transition-all cursor-pointer whitespace-nowrap ${
                              isSelected
                                ? "bg-emerald-800 text-white shadow-md scale-[1.02]"
                                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 hover:border-emerald-300"
                            }`}
                          >
                            <span className="text-base">{fruitEmoji}</span>
                            <span>{getFruitName(fruitEmoji)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Passo 2: Menu para Selecionar a Fase Fenológica da Cultura */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Sprout size={12} className="text-emerald-700" />
                    2. Selecione a Fase Fenológica:
                  </p>
                  <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                    Fase: {stationPhase || activeMarker?.fase || "Floração"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-0.5 scrollbar-none">
                  {["Dormência", "Brotação", "Floração", "Frutificação", "Colheita"].map((phaseOpt) => {
                    const isPhaseSel = (stationPhase || activeMarker?.fase) === phaseOpt;
                    return (
                      <button
                        key={phaseOpt}
                        onClick={() => setStationPhase(phaseOpt)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                          isPhaseSel
                            ? "bg-emerald-800 text-white shadow-xs scale-[1.02]"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80"
                        }`}
                      >
                        <Sprout size={12} className={isPhaseSel ? "text-emerald-200" : "text-slate-400"} />
                        <span>{phaseOpt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Passo 3: Menu por Doença */}
              {(() => {
                const markerFruits = getMarkerFruits(activeMarker);
                const activeFruit = selectedFruitTab || markerFruits[0];
                const cropDiseases = activeMarker?.diseases?.filter((d) => {
                  return getFruitForDisease(d.name) === activeFruit;
                }) || [];

                if (cropDiseases.length <= 1) return null;

                return (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-1">
                      3. Selecione a Doença:
                    </p>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-0.5 scrollbar-none">
                      <button
                        onClick={() => setSelectedDiseaseTab("all")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                          selectedDiseaseTab === "all"
                            ? "bg-slate-800 text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80"
                        }`}
                      >
                        Todas as Doenças ({cropDiseases.length})
                      </button>
                      {cropDiseases.map((d, di) => (
                        <button
                          key={di}
                          onClick={() => setSelectedDiseaseTab(d.name)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                            selectedDiseaseTab === d.name
                              ? "bg-slate-800 text-white shadow-xs"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80"
                          }`}
                        >
                          {d.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const markerFruits = getMarkerFruits(activeMarker);
                const activeFruit = selectedFruitTab || markerFruits[0];
                let filteredDiseasesRaw = activeMarker?.diseases?.filter((d) => {
                  const matchesCrop = getFruitForDisease(d.name) === activeFruit;
                  const matchesDisease = selectedDiseaseTab === "all" || d.name === selectedDiseaseTab;
                  return matchesCrop && matchesDisease;
                }) || [];

                if (filteredDiseasesRaw.length === 0) {
                  const getFallbackForEmoji = (emoji) => {
                    if (emoji === "🍇") return [{ name: "Míldio da Videira", sci: "Plasmopara viticola", risk: "Não Favorável", alertCause: [] }];
                    if (emoji === "🍌") return [{ name: "Sigatoka Negra", sci: "Mycosphaerella fijiensis", risk: "Não Favorável", alertCause: [] }];
                    if (emoji === "🍑") return [{ name: "Podridão Parda", sci: "Monilinia fructicola", risk: "Não Favorável", alertCause: [] }];
                    if (emoji === "🍊") return [{ name: "Cancro Cítrico", sci: "Xanthomonas citri", risk: "Não Favorável", alertCause: [] }];
                    if (emoji === "🍐") return [{ name: "Entomosporiose", sci: "Diplocarpon mespili", risk: "Não Favorável", alertCause: [] }];
                    if (emoji === "🥑") return [{ name: "Antracnose", sci: "Colletotrichum gloeosporioides", risk: "Não Favorável", alertCause: [] }];
                    return [{ name: "Sarna da Maçã", sci: "Venturia inaequalis", risk: "Não Favorável", alertCause: [] }];
                  };

                  const fallbacks = getFallbackForEmoji(activeFruit);
                  filteredDiseasesRaw = fallbacks.filter((d) => selectedDiseaseTab === "all" || d.name === selectedDiseaseTab);
                }

                const forecastList = getMarkerForecast(activeMarker);
                const selectedDayForecast = forecastList[selectedForecastDay] || forecastList[0];
                const currentStationData = selectedDayForecast ? {
                  temp: selectedDayForecast.temp,
                  hum: selectedDayForecast.hum,
                  wetness: selectedDayForecast.wetness,
                  rain: selectedDayForecast.rain,
                  wind: activeMarker?.station?.wind || "10 km/h"
                } : activeMarker?.station;

                const calculated = getCalculatedRisks(currentStationData);
                const processedDiseases = filteredDiseasesRaw.map((d) => {
                  let displayRisk = d.risk;
                  let reason = "";

                  if (d.name === "Sarna da Maçã") {
                    displayRisk = calculated.sarnaRisk;
                    reason = calculated.sarnaReason;
                  } else if (d.name === "Mancha de Gala") {
                    displayRisk = calculated.galaRisk;
                    reason = calculated.galaReason;
                  }

                  if (!reason && displayRisk === "Não Favorável") {
                    reason = "As variáveis climáticas atuais (temperatura, chuva e molhamento) não atingiram os limiares mínimos para a infecção.";
                  }

                  let sobreText = d.description;
                  let condicoesText = d.conditions;

                  if (!sobreText) {
                    if (d.name === "Sarna da Maçã") sobreText = "A Sarna da Maçã é uma doença fúngica grave que causa manchas escuras e aveludadas nas folhas e frutos.";
                    else if (d.name === "Mancha de Gala") sobreText = "A Mancha de Gala afeta principalmente a cultivar Gala, causando lesões nos frutos que depreciam seu valor comercial.";
                    else if (d.name === "Míldio da Videira") sobreText = "Doença severa que ataca partes verdes da videira, causando manchas de óleo nas folhas e bolores brancos.";
                    else if (d.name === "Sigatoka Negra") sobreText = "A principal doença da bananeira, causando estrias e necrose nas folhas, o que reduz drasticamente a produção.";
                    else sobreText = `Monitoramento contínuo de risco para a doença ${d.name}.`;
                  }

                  if (!condicoesText) {
                    if (d.name === "Sarna da Maçã") condicoesText = "Requer períodos prolongados de molhamento foliar combinados com temperaturas favoráveis para a infecção.";
                    else if (d.name === "Mancha de Gala") condicoesText = "Ocorre de forma mais severa quando o molhamento foliar excede 10 horas com temperatura média acima de 14,9°C.";
                    else if (d.name === "Míldio da Videira") condicoesText = "A infecção é favorecida por alta umidade, chuvas frequentes e temperaturas amenas a quentes.";
                    else if (d.name === "Sigatoka Negra") condicoesText = "Condições de alta umidade, chuvas abundantes e temperaturas elevadas aceleram significativamente a infecção.";
                    else condicoesText = "Depende da combinação de fatores climáticos como temperatura, umidade e chuvas.";
                  }

                  return { ...d, displayRisk, reason, sobreText, condicoesText };
                });

                return (
                  <div className="max-h-[380px] sm:max-h-[420px] overflow-y-auto pr-1 space-y-4 scrollbar-thin">
                    {processedDiseases.map((d, i) => (
                      <div
                        key={`disease-${i}`}
                        className="p-3.5 rounded-2xl overflow-hidden relative"
                        style={{
                          background: C.white,
                          border: `1px solid ${riskBorder(d.displayRisk)}`,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                        }}
                      >
                        {/* Header: Nome da Doença */}
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-base font-black leading-tight md:whitespace-nowrap truncate" style={{ color: C.textDark }}>{d.name}</p>
                            {d.sci && <p className="text-[11px] italic mt-0.5 md:whitespace-nowrap truncate" style={{ color: "#6b7280" }}>{d.sci}</p>}
                          </div>
                          <span className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                            <Sprout size={12} className="text-emerald-600" />
                            Fase: {stationPhase || activeMarker?.fase || "Floração"}
                          </span>
                        </div>

                        {/* BARRA DE DESTAQUE DO RISCO */}
                        <div
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-4"
                          style={{
                            background: riskBg(d.displayRisk),
                            border: `1px solid ${riskBorder(d.displayRisk)}`
                          }}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: riskColor(d.displayRisk) }}>
                            Status de Risco
                          </span>
                          <span
                            className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide text-white shadow-sm"
                            style={{ background: riskColor(d.displayRisk) }}
                          >
                            {d.displayRisk}
                          </span>
                        </div>

                        {/* Card: Sobre e Condições */}
                        <div
                          className="mb-4 p-3.5 rounded-xl space-y-2.5"
                          style={{ background: "#F8FAFB", border: "1px solid #F1F3F5" }}
                        >
                          <p className="text-[11px] leading-relaxed min-h-[36px]" style={{ color: "#4B5563" }}>
                            <span className="font-bold text-slate-700 block mb-0.5">Sobre: </span>
                            {d.sobreText}
                          </p>
                          <div className="h-px w-full bg-slate-200 opacity-50 my-2"></div>
                          <p className="text-[11px] leading-relaxed min-h-[38px]" style={{ color: "#4B5563" }}>
                            <span className="font-bold text-slate-700 block mb-0.5">
                              {d.displayRisk === "Não Favorável" ? "Diagnóstico:" : "Condições:"}
                            </span>
                            {d.reason || d.condicoesText}
                          </p>
                        </div>

                        {/* Causas do Alerta (Apenas se risco não for Não Favorável) */}
                        {d.displayRisk !== "Não Favorável" && d.alertCause && d.alertCause.length > 0 && (
                          <div className="space-y-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#9ca3af" }}>
                              Motivo do Alerta
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                              {d.alertCause.map((ac, j) => {
                                const Icon = ac.label.includes("Umidade") ? Droplets :
                                  ac.label.includes("Temperatura") ? ThermometerSun :
                                    ac.label.includes("Chuva") ? CloudRain : Wind;

                                return (
                                  <div
                                    key={j}
                                    className="flex items-center justify-between p-3 rounded-xl transition-all"
                                    style={{
                                      background: ac.critical ? riskBg(d.displayRisk) : "#f9fafb",
                                      border: `1px solid ${ac.critical ? riskBorder(d.displayRisk) : "#f3f4f6"}`,
                                    }}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="p-2 rounded-lg"
                                        style={{
                                          background: C.white,
                                          color: ac.critical ? riskColor(d.displayRisk) : "#9ca3af",
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
                                        style={{ color: ac.critical ? riskColor(d.displayRisk) : C.textDark }}
                                      >
                                        {ac.value}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Botão de Prevenção: Apenas se risco for ativamente favorável ou atenção */}
                        {d.displayRisk !== "Não Favorável" && (
                          <button
                            onClick={() => openManualForDisease(d.name)}
                            className="w-full mt-3 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/60 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200/80 flex items-center justify-between gap-2 text-emerald-950 group cursor-pointer transition-all shadow-2xs hover:shadow-sm"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="p-1.5 rounded-lg bg-emerald-700 text-white shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                                <ShieldCheck size={14} />
                              </div>
                              <span className="text-xs font-black text-emerald-950">
                                Como se precaver deste risco?
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-black text-emerald-700 group-hover:text-emerald-900 shrink-0">
                              <span>Ver Guia</span>
                              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>


          </div>
        </div>

        {/* ── FILTER DROPDOWN CARD (Mobile) - Desdobra a partir do topo ── */}
        {showFilterSheet && !isDesktop && (
          <div className="absolute top-4 left-4 right-4 z-50 animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto">
            <div
              className="p-5 rounded-3xl shadow-2xl overflow-hidden"
              style={{
                background: "rgba(255, 255, 255, 0.98)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1.5px solid rgba(226, 232, 240, 0.95)",
                boxShadow: "0 20px 45px -10px rgba(15, 23, 42, 0.25)",
              }}
            >
              {/* Cabeçalho dos Filtros */}
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                    <Search size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                      Filtros Fitossanitários
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Personalize a visualização no mapa
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFilterSheet(false)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all"
                  title="Fechar filtros"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Selects em coluna */}
              <div className="space-y-3.5 max-h-[55vh] overflow-y-auto pr-1">
                {(() => {
                  const { cropOpts, phaseOpts, diseaseOpts, cityOpts } = getFilterOptions();

                  return [
                    {
                      icon: Sprout,
                      placeholder: "Todas as Frutas",
                      val: selectedCrop,
                      set: (v) => {
                        setSelectedCrop(v);
                        setSelectedDisease("");
                        setSelectedCity("");
                      },
                      opts: cropOpts,
                    },
                    {
                      icon: TrendingUp,
                      placeholder: "Todas as Fases",
                      val: selectedPhase,
                      set: setSelectedPhase,
                      opts: phaseOpts,
                    },
                    {
                      icon: Bug,
                      placeholder: "Todas as Doenças",
                      val: selectedDisease,
                      set: (v) => {
                        setSelectedDisease(v);
                        setSelectedCity("");
                      },
                      opts: diseaseOpts,
                    },
                    {
                      icon: MapPin,
                      placeholder: "Todos os Municípios",
                      val: selectedCity,
                      set: setSelectedCity,
                      opts: cityOpts,
                    },
                  ].map((f, i) => (
                    <div key={i} className="relative">
                      <f.icon
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: C.greenMid }}
                      />
                      <select
                        className="w-full pl-10 pr-8 py-3 appearance-none rounded-xl text-xs font-bold outline-none transition-all cursor-pointer"
                        style={{
                          background: "#ffffff",
                          border: `1.5px solid ${C.border}`,
                          color: f.val ? C.textDark : "#9ca3af",
                        }}
                        value={f.val}
                        onChange={(e) => {
                          f.set(e.target.value);
                          setFiltersApplied(true);
                        }}
                      >
                        <option value="">{f.placeholder}</option>
                        {f.opts.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-700"
                      />
                    </div>
                  ));
                })()}
              </div>

              {/* Botão de Limpar Filtros (Mobile) */}
              <div className="flex items-center gap-2.5 mt-4 pt-3 border-t border-slate-100">
                <button
                  className="w-full py-3 rounded-xl font-extrabold text-xs text-slate-700 hover:bg-slate-100 transition-all border border-slate-200 shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  onClick={handleClearFilters}
                >
                  <X size={14} /> LIMPAR FILTROS
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Menu suspenso flutuante — desktop, após filtros aplicados */}
        {filtersApplied && !showBottomSheet && filterLayout !== "sidebar" && (
          <button
            className="absolute top-5 left-5 z-30 hidden md:flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
            style={{
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              color: C.green,
              border: `1.5px solid rgba(226, 232, 240, 0.9)`,
              boxShadow: "0 10px 25px -4px rgba(15, 23, 42, 0.15)",
            }}
            title="Filtros"
            onClick={() => setFilterLayout("sidebar")}
          >
            <Search size={15} style={{ color: C.green }} />
            <span>Filtros</span>
          </button>
        )}

        {/* Map controls */}
        {!showBottomSheet && (
          <div className="absolute right-5 top-5 z-20 flex flex-col gap-2">
            {/* Centralizar */}
            <button
              title="Centralizar no Paraná"
              onClick={() => mapInstanceRef.current?.setView([-24.4, -52.3], isDesktop ? 8 : 6)}
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

        {/* Legenda de Risco Fitossanitário */}
        {!showBottomSheet && (
          <div className="absolute left-2 bottom-2 md:left-6 md:bottom-6 z-10 animate-in fade-in duration-300 pointer-events-auto">
            <div
              className="p-2.5 md:p-3 rounded-2xl flex flex-col gap-1 transition-all hover:shadow-2xl"
              style={{
                background: "rgba(255, 255, 255, 0.70)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255, 255, 255, 0.6)",
                boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.15)",
                width: "auto",
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-1.5 border-b border-slate-200/60 pb-1.5">
                <Info size={12} className="text-emerald-700" />
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-700">
                  Legenda
                </span>
              </div>

              {/* Status de Risco por Cor */}
              <div className="flex flex-col gap-0.5 mt-1">
                <div className="flex items-center gap-2 px-1 py-1 rounded-lg transition-colors hover:bg-white/60">
                  <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
                    <span className="absolute w-full h-full rounded-full bg-red-400 opacity-20 animate-ping" style={{ animationDuration: "3s" }} />
                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                  </div>
                  <span className="text-[10px] md:text-[11px] font-bold text-slate-700 leading-none mt-0.5">
                    Favorável à Doença
                  </span>
                </div>

                <div className="flex items-center gap-2 px-1 py-1 rounded-lg transition-colors hover:bg-white/60">
                  <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
                  </div>
                  <span className="text-[10px] md:text-[11px] font-bold text-slate-700 leading-none mt-0.5">
                    Pouco Favorável
                  </span>
                </div>

                <div className="flex items-center gap-2 px-1 py-1 rounded-lg transition-colors hover:bg-white/60">
                  <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                  </div>
                  <span className="text-[10px] md:text-[11px] font-bold text-slate-700 leading-none mt-0.5">
                    Não Favorável
                  </span>
                </div>
              </div>

              {/* Explicação dos PONTOS DO PINO */}
              <div className="mt-1 pt-1.5 border-t border-slate-200/60 text-[9px] text-slate-500 leading-tight">
                <span className="leading-tight">
                  <strong className="text-slate-700 font-bold">Cada ponto indica uma doença</strong>.
                </span>
              </div>
            </div>
          </div>
        )}
        {/* ── MANUAL DA PREVENÇÃO ── */}
        {showPreventionModal && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-8 animate-in fade-in duration-200"
              style={{ background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(6px)" }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowPreventionModal(false);
                }
              }}
            >
              {/* Modal Card */}
              <div
                className="relative z-[110] flex flex-col w-full max-w-5xl rounded-3xl overflow-hidden bg-white shadow-2xl border border-slate-200/80 animate-in zoom-in-95 duration-200"
                style={{ maxHeight: "92dvh" }}
              >
                {/* Modern Premium Institutional Header */}
                <div className="relative px-6 py-5 shrink-0 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white overflow-hidden shadow-md">
                  {/* Subtle decorative background blur circles */}
                  <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-10 left-1/3 w-64 h-32 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        {selectedManualCrop !== "" && (
                          <button
                            onClick={() => {
                              setSelectedManualCrop("");
                              setManualSearchQuery("");
                              setManualActiveTab("all");
                            }}
                            className="flex items-center justify-center p-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white transition-all cursor-pointer border border-white/10"
                            title="Voltar para a seleção de cultura"
                          >
                            <ArrowLeft size={18} />
                          </button>
                        )}
                        <div>
                          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                            <BookOpen size={24} className="text-emerald-400" />
                            Manual de Manejo Preventivo
                          </h2>
                          <p className="text-xs text-emerald-200/80 font-medium mt-0.5">
                            {selectedManualCrop !== ""
                              ? `Diretrizes de proteção e controle ecológico para a cultura da ${selectedManualCrop.toLowerCase()}`
                              : "Selecione uma cultura para consultar as recomendações técnicas de prevenção"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions in Header */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => setShowPreventionModal(false)}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white transition-colors cursor-pointer border border-white/10"
                        title="Fechar Manual"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modal Scrollable Body */}
                {selectedManualCrop === "" ? (
                  /* CROP SELECTION SCREEN */
                  <div className="overflow-y-auto flex-1 px-6 py-8 bg-slate-50/50">
                    <div className="text-center max-w-md mx-auto mb-8 space-y-2">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 shadow-inner mb-2 border border-emerald-200">
                        <Sprout size={32} className="animate-pulse" />
                      </div>
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">
                        Selecione a Cultura Agrícola
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
                        Escolha a cultura desejada para visualizar o guia completo de boas práticas agronômicas e prevenção de doenças.
                      </p>
                    </div>

                    {/* Crop Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
                      {Object.keys(PREVENTION_MANUALS).map((cropKey) => {
                        const crop = PREVENTION_MANUALS[cropKey];
                        return (
                          <div
                            key={cropKey}
                            onClick={() => {
                              setSelectedManualCrop(cropKey);
                              setManualSearchQuery("");
                              setManualActiveTab("all");
                            }}
                            className="group relative flex flex-col justify-between h-[230px] p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-emerald-500 hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-4xl p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm group-hover:scale-110 transition-transform">
                                  {crop.emoji || "🌱"}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                  {crop.diseases?.length || 0} Doenças
                                </span>
                              </div>

                              <h4 className="text-lg font-black text-slate-900 group-hover:text-emerald-800 transition-colors">
                                {cropKey}
                              </h4>
                              <p className="text-[11px] italic font-semibold text-slate-400 mb-1">
                                {crop.scientificName}
                              </p>
                              <p className="text-xs text-slate-600 font-medium leading-relaxed mb-3 line-clamp-2 h-[34px]">
                                {crop.description}
                              </p>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-emerald-700 group-hover:text-emerald-800">
                              <span>Acessar Guia</span>
                              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Agronomic Tip Callout Banner */}
                    <div className="max-w-4xl mx-auto mt-8 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/70 flex items-start gap-3 text-xs text-emerald-950">
                      <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
                        <ShieldCheck size={18} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-extrabold text-emerald-900">Por que o Manejo Preventivo é Fundamental?</p>
                        <p className="text-emerald-800/90 leading-relaxed">
                          As doenças fúngicas progridem rapidamente quando as horas de molhamento foliar e temperatura coincidem. A aplicação de fungicidas após o sintoma instalado reduz drasticamente a eficácia do tratamento.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ACTIVE CROP PREVENTION DETAILS VIEW */
                  <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-5 space-y-6 bg-slate-50/30">

                    {/* Title before search bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1 pt-1">
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                          <BookOpen size={18} className="text-emerald-700" />
                          Consultar Diretrizes de Manejo ({selectedManualCrop})
                        </h3>
                        <p className="text-xs font-medium text-slate-500">
                          Pesquise por termos técnicos ou filtre pelas enfermidades da cultura
                        </p>
                      </div>
                    </div>

                    {/* Interactive Search & Filter Controls Bar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      {/* Search input */}
                      <div className="relative flex-1">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={manualSearchQuery}
                          onChange={(e) => setManualSearchQuery(e.target.value)}
                          placeholder="Pesquisar por fungicida, chuva, molhamento, poda..."
                          className="w-full pl-10 pr-8 py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                        />
                        {manualSearchQuery && (
                          <button
                            onClick={() => setManualSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Disease filter tabs */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                        <button
                          onClick={() => setManualActiveTab("all")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${manualActiveTab === "all"
                              ? "bg-emerald-800 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >
                          Todas as Doenças
                        </button>
                        {PREVENTION_MANUALS[selectedManualCrop]?.diseases?.map((d) => (
                          <button
                            key={d.id}
                            onClick={() => setManualActiveTab(d.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${manualActiveTab === d.id
                                ? "bg-emerald-800 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                          >
                            {d.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Intro text */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 shrink-0 mt-0.5 border border-amber-200">
                        <AlertTriangle size={18} />
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                        As enfermidades fúngicas da <strong className="text-slate-900 font-extrabold">{selectedManualCrop.toLowerCase()}</strong> manifestam-se em janelas bioclimáticas específicas. As medidas preventivas listadas abaixo devem ser executadas <u className="decoration-amber-500 font-semibold">antes</u> da consolidação dos períodos de infecção.
                      </p>
                    </div>

                    {/* Diseases Sections */}
                    {PREVENTION_MANUALS[selectedManualCrop]?.diseases
                      ?.filter((d) => manualActiveTab === "all" || manualActiveTab === d.id)
                      ?.map((d) => {
                        // Filter tips by query
                        const filteredTips = d.tips.filter((tip) => {
                          if (!manualSearchQuery) return true;
                          const q = normalizeText(manualSearchQuery);
                          return (
                            normalizeText(tip.text).includes(q) ||
                            normalizeText(tip.category).includes(q) ||
                            normalizeText(tip.tag).includes(q)
                          );
                        });

                        if (manualSearchQuery && filteredTips.length === 0) {
                          return null; // hide disease card if no matching tips
                        }

                        return (
                          <div
                            key={d.id}
                            className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
                          >
                            {/* Disease Card Header */}
                            <div
                              className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b"
                              style={{ backgroundColor: d.bgColor, borderColor: d.borderColor }}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                                  style={{ backgroundColor: d.color }}
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                    <h3 className="text-lg font-black tracking-tight whitespace-nowrap truncate" style={{ color: d.color }}>
                                      {d.name}
                                    </h3>
                                    <span
                                      className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border whitespace-nowrap shrink-0"
                                      style={{ backgroundColor: d.badgeBg, color: d.badgeText, borderColor: d.borderColor }}
                                    >
                                      {d.sci}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Risk Parameter Badges */}
                              {d.conditions && (
                                <div className="flex flex-wrap items-center gap-2">
                                  {d.conditions.map((cond, ci) => (
                                    <div
                                      key={ci}
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/80 border border-slate-200/80 shadow-2xs text-[11px] font-bold text-slate-700 whitespace-nowrap"
                                    >
                                      {cond.iconName === "temp" && <ThermometerSun size={13} className="text-amber-600" />}
                                      {cond.iconName === "wet" && <Droplets size={13} className="text-blue-600" />}
                                      {cond.iconName === "rain" && <CloudRain size={13} className="text-indigo-600" />}
                                      <span className="text-slate-500 font-medium">{cond.label}:</span>
                                      <span className="text-slate-900 font-extrabold">{cond.val}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Prevention Tips List */}
                            <div className="p-5 sm:p-6 space-y-3">
                              {filteredTips.map((tip, ti) => {
                                const globalTipIndex = `${d.id}-${ti}`;
                                const isCopied = copiedTipIndex === globalTipIndex;

                                return (
                                  <div
                                    key={ti}
                                    className="group relative flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all"
                                  >
                                    {/* Tip Icon / Number Badge */}
                                    <div
                                      className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 font-extrabold text-xs shadow-xs"
                                      style={{ backgroundColor: d.badgeBg, color: d.badgeText }}
                                    >
                                      {ti + 1}
                                    </div>

                                    {/* Tip Content */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 whitespace-nowrap">
                                          {tip.category}
                                        </span>
                                        {tip.tag && (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800 whitespace-nowrap">
                                            {tip.tag}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                                        {tip.text}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                    {/* General Best Practices */}
                    {(manualActiveTab === "all" || manualActiveTab === "general") && (
                      <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                          <Leaf size={18} className="text-emerald-600" />
                          <h3 className="text-base font-black text-slate-900 tracking-tight">
                            Recomendações Gerais de Manejo Integrado (MIP)
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {PREVENTION_MANUALS[selectedManualCrop]?.general?.map((tipObj, i) => (
                            <div
                              key={i}
                              className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/80 flex flex-col justify-between"
                            >
                              <div>
                                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-black mb-3 shadow-xs">
                                  {i + 1}
                                </div>
                                <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950 mb-1">
                                  {tipObj.title}
                                </h4>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                  {tipObj.desc}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="h-2" />
                  </div>
                )}

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <ShieldCheck size={16} className="text-emerald-700" />
                    <span>IDR-Paraná · Guia de Proteção Fitossanitária</span>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {selectedManualCrop !== "" && (
                      <button
                        onClick={() => setSelectedManualCrop("")}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-extrabold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        Trocar Cultura
                      </button>
                    )}
                    <button
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-900 hover:to-teal-800 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
                      onClick={() => setShowPreventionModal(false)}
                    >
                      <Search size={14} />
                      Ver Mapa Fitossanitário
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
