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
  BookOpen,
  Info,
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
  // - FAVORÁVEL:       pmfHs >= 9 E (pmfHs × tmedAc) >= 140
  // - POUCO FAVORÁVEL: pmfChuva = 1 E pmfHs < 9
  // - NÃO FAVORÁVEL:   pmfChuva < 1 OU pmfHs >= 900 OU (pmfHs >= 9 E força < 140)
  let sarnaRisk = "Não Favorável";
  if (pmfChuva < 1) {
    sarnaRisk = "Não Favorável";
  } else if (pmfHs < 9) {
    sarnaRisk = "Pouco Favorável";
  } else if (pmfHs >= 900) {
    sarnaRisk = "Não Favorável";
  } else if (pmfHs * tmedAc >= 140) {
    sarnaRisk = "Favorável à Doença";
  } else {
    sarnaRisk = "Não Favorável"; // >= 9h mas força insuficiente
  }

  // MANCHA DE GALA
  // - FAVORÁVEL:    pmfHs >= 10 E tmedAc > 14.9
  // - NÃO FAVORÁVEL: pmfHs < 10 OU tmedAc <= 14.9
  let galaRisk = "Não Favorável";
  if (pmfHs >= 10 && tmedAc > 14.9) {
    galaRisk = "Favorável à Doença";
  }

  return { sarnaRisk, galaRisk };
};

// Manual da prevenção por cultura
const PREVENTION_MANUALS = {
  "Maçã": {
    diseases: [
      {
        name: "Sarna da Maçã",
        sci: "Venturia inaequalis",
        color: "#d32f2f",
        bgColor: "#fef2f2",
        borderColor: "#fecaca",
        tips: [
          "Aplique fungicida preventivo antes de períodos com chuva e temperatura entre 10–24°C.",
          "Monitore o molhamento foliar — o risco começa com 9 horas contínuas de folha molhada com umidade acima de 90%.",
          "Inspecione os frutos regularmente por manchas escuras ou lesões na superfície.",
          "Repita a aplicação se houver mais de 25 mm de chuva acumulada em 48 horas.",
          "Realize podas para melhorar a ventilação e reduzir o período de molhamento foliar.",
        ],
      },
      {
        name: "Mancha de Gala",
        sci: "Colletotrichum spp.",
        color: "#ca8a04",
        bgColor: "#fefce8",
        borderColor: "#fef08a",
        tips: [
          "Temperatura acima de 14,9°C durante molhamento exige ação preventiva imediata.",
          "Aplique fungicidas específicos para Colletotrichum antes de janelas de chuva previstas.",
          "Monitore folhas da cultivar Gala após cada evento de precipitação.",
          "Evite irrigação por aspersão em dias com previsão de molhamento foliar prolongado.",
          "O risco se torna crítico com 10 horas ou mais de molhamento foliar e temperatura acima de 14,9°C.",
        ],
      },
    ],
    general: [
      "Registre as condições climáticas diariamente para identificar padrões de risco.",
      "Combine métodos preventivos (culturais + químicos) para maior eficácia.",
      "Consulte os alertas do sistema antes de cada aplicação de fungicida.",
    ],
  }
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
  const [filterLayout, setFilterLayout] = useState("sidebar"); // "compact" ou "sidebar"
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [selectedForecastDay, setSelectedForecastDay] = useState(0);
  const [showPreventionModal, setShowPreventionModal] = useState(false);
  const [pendingFilterApply, setPendingFilterApply] = useState(false);
  const [skipPreventionManual, setSkipPreventionManual] = useState(false);
  const [selectedManualCrop, setSelectedManualCrop] = useState("");
  const [showAlertLegend, setShowAlertLegend] = useState(false);
  const [diseaseWetScenario, setDiseaseWetScenario] = useState({ sarna: "wet", gala: "wet" });

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
      forecast: [
        { day: "Hoje", date: "14/04", temp: "16°C", hum: "92%", rain: "38mm", wetness: "11 h", sarnaRisk: "Favorável à Doença", galaRisk: "Favorável à Doença" },
        { day: "Amanhã", date: "15/04", temp: "17°C", hum: "88%", rain: "12mm", wetness: "7 h", sarnaRisk: "Pouco Favorável", galaRisk: "Não Favorável" },
        { day: "Qua", date: "16/04", temp: "20°C", hum: "72%", rain: "0mm", wetness: "2 h", sarnaRisk: "Não Favorável", galaRisk: "Não Favorável" },
        { day: "Qui", date: "17/04", temp: "14°C", hum: "94%", rain: "28mm", wetness: "10 h", sarnaRisk: "Favorável à Doença", galaRisk: "Não Favorável" },
        { day: "Sex", date: "18/04", temp: "13°C", hum: "96%", rain: "35mm", wetness: "13 h", sarnaRisk: "Favorável à Doença", galaRisk: "Não Favorável" },
      ],
      prevention: {
        sarna: [
          "Aplique fungicida preventivo antes dos dias com chuva prevista e temperatura entre 10–24°C.",
          "Priorize a aplicação nas próximas 24 horas, antes das chuvas previstas para quinta-feira.",
          "Inspecione frutos com 20–30 mm por manchas escuras ou lesões na superfície.",
          "Repita a aplicação se houver mais de 25 mm de chuva acumulada em 48 horas.",
        ],
        gala: [
          "Temperatura prevista acima de 14,9°C durante molhamento exige ação imediata.",
          "Aplique fungicidas específicos para Colletotrichum antes da janela de chuva de quinta.",
          "Monitore folhas da cultivar Gala após cada evento de precipitação.",
          "Evite irrigação por aspersão nos dias com previsão de molhamento foliar prolongado.",
        ],
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
      forecast: [
        { day: "Hoje", date: "14/04", temp: "15°C", hum: "72%", rain: "5mm", wetness: "6 h", sarnaRisk: "Pouco Favorável", galaRisk: "Não Favorável" },
        { day: "Amanhã", date: "15/04", temp: "16°C", hum: "80%", rain: "15mm", wetness: "11 h", sarnaRisk: "Favorável à Doença", galaRisk: "Favorável à Doença" },
        { day: "Qua", date: "16/04", temp: "18°C", hum: "75%", rain: "0mm", wetness: "2 h", sarnaRisk: "Não Favorável", galaRisk: "Não Favorável" },
        { day: "Qui", date: "17/04", temp: "19°C", hum: "85%", rain: "22mm", wetness: "9 h", sarnaRisk: "Favorável à Doença", galaRisk: "Não Favorável" },
        { day: "Sex", date: "18/04", temp: "17°C", hum: "82%", rain: "10mm", wetness: "7 h", sarnaRisk: "Pouco Favorável", galaRisk: "Não Favorável" },
      ],
      prevention: {
        sarna: [
          "O molhamento está baixo hoje, mas quinta-feira traz risco elevado.",
          "Programe aplicação preventiva para quarta-feira à tarde, antes das chuvas previstas.",
          "Monitore a UR do ar – quando superar 90% com chuva, o risco se torna crítico.",
          "Verifique a cobertura de fungicida e reaplique se já passaram mais de 10 dias.",
        ],
        gala: [
          "Prepare-se para aplicação de fungicidas específicos antes de quinta-feira.",
          "Temperatura prevista de 13–15°C com alta umidade é condição ideal para Colletotrichum.",
          "Inspecione as cultivares Gala para sintomas de desfolha nos próximos dias.",
          "Melhore a aeração das plantas para reduzir o período de molhamento foliar.",
        ],
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
      forecast: [
        { day: "Hoje", date: "14/04", temp: "18°C", hum: "65%", rain: "0mm", wetness: "1 h", sarnaRisk: "Não Favorável", galaRisk: "Não Favorável" },
        { day: "Amanhã", date: "15/04", temp: "20°C", hum: "70%", rain: "0mm", wetness: "1 h", sarnaRisk: "Não Favorável", galaRisk: "Não Favorável" },
        { day: "Qua", date: "16/04", temp: "19°C", hum: "65%", rain: "0mm", wetness: "0 h", sarnaRisk: "Não Favorável", galaRisk: "Não Favorável" },
        { day: "Qui", date: "17/04", temp: "18°C", hum: "78%", rain: "8mm", wetness: "5 h", sarnaRisk: "Pouco Favorável", galaRisk: "Não Favorável" },
        { day: "Sex", date: "18/04", temp: "17°C", hum: "82%", rain: "12mm", wetness: "8 h", sarnaRisk: "Pouco Favorável", galaRisk: "Não Favorável" },
      ],
      prevention: {
        sarna: [
          "Condições atualmente favoráveis – mantenha o monitoramento semanal.",
          "Não há necessidade de aplicação preventiva nos próximos 3 dias.",
          "Verifique as previsões do final de semana, pois as condições podem mudar.",
          "Aproveite o período seco para realizar podas e melhorar a ventilação do pomar.",
        ],
        gala: [
          "Risco baixo para os próximos dias nesta localidade.",
          "Mantenha inspeções visuais regulares nas cultivares sensíveis.",
          "Condições ideais para serviços de manutenção sem risco fitossanitário.",
          "Registre as condições climáticas para comparação com eventos futuros.",
        ],
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

  const getMaxForecastRisk = (marker) => {
    if (!marker?.forecast) return "Não Favorável";
    const order = { "Favorável à Doença": 3, "Pouco Favorável": 2, "Não Favorável": 1 };
    let max = 0;
    marker.forecast.forEach((d) => {
      max = Math.max(max, order[d.sarnaRisk] || 0, order[d.galaRisk] || 0);
    });
    if (max === 3) return "Favorável à Doença";
    if (max === 2) return "Pouco Favorável";
    return "Não Favorável";
  };

  const handleMarkerClick = (marker) => {
    setActiveMarker(marker);
    setShowBottomSheet(true);
    setSelectedForecastDay(0);
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

          <button
            onClick={() => {
              setSelectedManualCrop(""); // Sempre abre no menu de seleção
              setShowPreventionModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm transition-all shadow-sm hover:shadow-md"
            style={{
              color: C.green,
              background: C.white,
              border: `1px solid ${C.border}`
            }}
          >
            <BookOpen size={16} />
            <span className="hidden sm:inline">Manual de Prevenção</span>
            <span className="sm:hidden">Manual</span>
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
            const filters = [
              {
                icon: Sprout,
                label: "Fruta",
                placeholder: "Selecione a fruta",
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

                {/* NOVO BOTÃO DE APLICAR FILTROS NO DESKTOP */}
                <div className="mt-6">
                  <button
                    className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
                    style={{
                      background: selectedCrop ? C.green : "#9ca3af",
                      color: C.white,
                      cursor: selectedCrop ? "pointer" : "not-allowed",
                    }}
                    disabled={!selectedCrop}
                    onClick={() => {
                      if (skipPreventionManual) {
                        setFiltersApplied(true);
                        setFilterLayout("sidebar");
                      } else {
                        setPendingFilterApply(true);
                        if (selectedCrop && PREVENTION_MANUALS[selectedCrop]) {
                          setSelectedManualCrop(selectedCrop);
                        } else {
                          setSelectedManualCrop("");
                        }
                        setShowPreventionModal(true);
                      }
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
                    if (skipPreventionManual) {
                      setFiltersApplied(true);
                      setFilterLayout("sidebar");
                    } else {
                      setPendingFilterApply(true);
                      if (selectedCrop && PREVENTION_MANUALS[selectedCrop]) {
                        setSelectedManualCrop(selectedCrop);
                      } else {
                        setSelectedManualCrop("");
                      }
                      setShowPreventionModal(true);
                    }
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
                    if (skipPreventionManual) {
                      setFiltersApplied(true);
                    } else {
                      setPendingFilterApply(true);
                      if (selectedCrop && PREVENTION_MANUALS[selectedCrop]) {
                        setSelectedManualCrop(selectedCrop);
                      } else {
                        setSelectedManualCrop("");
                      }
                      setShowPreventionModal(true);
                    }
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
                  style={{ background: riskBg(getMaxForecastRisk(activeMarker)) }}
                >
                  <MapPin size={22} style={{ color: riskColor(getMaxForecastRisk(activeMarker)) }} />
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

            {/* ── PREVISÃO 5 DIAS ── */}
            <div className="space-y-4">

            
            

              {/* Tira de dias */}
              <div className="flex justify-center flex-wrap sm:flex-nowrap gap-2 sm:gap-3 pb-2 w-full">
                {activeMarker?.forecast?.map((f, i) => {
                  const sel = selectedForecastDay === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedForecastDay(i)}
                      className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl shrink-0 transition-all shadow-sm"
                      style={{
                        background: sel ? C.white : "#f9fafb",
                        border: `2px solid ${sel ? C.green : "#f3f4f6"}`,
                        minWidth: "62px"
                      }}
                    >
                      <span className="text-xs font-black truncate" style={{ color: sel ? C.green : "#6b7280", maxWidth: "100%" }}>
                        {f.day}
                      </span>
                      <span className="text-[10px]" style={{ color: "#9ca3af" }}>{f.date}</span>
                      <div className="flex flex-col items-center gap-1 mt-1">
                        <div className="flex items-center gap-1">
                          <ThermometerSun size={12} style={{ color: "#9ca3af" }} />
                          <span className="text-[11px] font-bold" style={{ color: C.textDark }}>{f.temp}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CloudRain size={12} style={{ color: "#9ca3af" }} />
                          <span className="text-[11px] font-bold" style={{ color: C.textDark }}>{f.rain}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Detalhe do dia selecionado */}
              {activeMarker?.forecast?.[selectedForecastDay] && (() => {
                const f = activeMarker.forecast[selectedForecastDay];
                const tempNum = parseFloat(f.temp);
                const humNum = parseFloat(f.hum);
                const hasRain = parseFloat(f.rain) > 0;

                // Calcula risco dinamicamente conforme cenário de molhamento da fazenda
                const getRisk = (disease, scenario) => {
                  if (disease === "sarna") {
                    if (scenario === "wet") {
                      // Hipótese: molhamento >= 9h na fazenda
                      // Avalia força de infecção com o mínimo (9h × temp da estação)
                      // FAVORÁVEL: força >= 140 | NÃO FAVORÁVEL: força < 140 (9h+ mas temp insuficiente)
                      const force = 9 * tempNum;
                      if (force >= 140) return "Favorável à Doença";
                      return "Não Favorável";
                    }
                    if (scenario === "dry") {
                      // Hipótese: molhamento < 9h na fazenda
                      // POUCO FAVORÁVEL se pmfChuva = 1 (UR > 90% E chuva > 0)
                      // NÃO FAVORÁVEL se não há chuva ou UR <= 90%
                      return humNum > 90 && hasRain ? "Pouco Favorável" : "Não Favorável";
                    }
                    return f.sarnaRisk;
                  }
                  if (disease === "gala") {
                    if (scenario === "wet") {
                      // Hipótese: molhamento >= 10h na fazenda
                      // FAVORÁVEL: temp > 14,9°C | NÃO FAVORÁVEL: temp <= 14,9°C
                      return tempNum > 14.9 ? "Favorável à Doença" : "Não Favorável";
                    }
                    if (scenario === "dry") {
                      // Hipótese: molhamento < 10h — sempre Não Favorável para Gala
                      return "Não Favorável";
                    }
                    return f.galaRisk;
                  }
                };

                const isSarnaWet = diseaseWetScenario.sarna === "wet";
                const isGalaWet = diseaseWetScenario.gala === "wet";

                const sarnaRisk = getRisk("sarna", diseaseWetScenario.sarna);
                const galaRisk = getRisk("gala", diseaseWetScenario.gala);

                const sarnaForce = 9 * tempNum;

                const condCols = [
                  { Icon: ThermometerSun, label: "Temperatura", value: f.temp },
                  { Icon: Droplets, label: "Umidade", value: f.hum },
                  { Icon: CloudRain, label: "Chuva", value: f.rain },
                ];

                // Busca description e conditions do marker
                const markerDiseaseMap = {};
                activeMarker.diseases?.forEach((d) => { markerDiseaseMap[d.name] = d; });

                const diseases = [
                  {
                    key: "sarna",
                    name: "Sarna da Maçã", sci: "Venturia inaequalis",
                    risk: sarnaRisk,
                    isWet: isSarnaWet,
                    wetOptions: [
                      { key: "wet", label: "Maior", sub: "9h ou mais" },
                      { key: "dry", label: "Menor", sub: "menos de 9h" },
                    ],
                    description: markerDiseaseMap["Sarna da Maçã"]?.description ?? "Doença fúngica que causa manchas escuras e lesões na superfície dos frutos e folhas, reduzindo a qualidade comercial e afetando a produtividade.",
                    conditions: markerDiseaseMap["Sarna da Maçã"]?.conditions ?? "Requer períodos prolongados de folha molhada com chuva, umidade relativa acima de 90% e temperaturas moderadas.",
                    alertCause: [
                      {
                        label: "Molhamento foliar com chuva",
                        value: isSarnaWet ? "9h ou mais" : "menos de 9h",
                        threshold: "9h ou mais para ativar",
                        critical: isSarnaWet,
                      },
                      {
                        label: "Temperatura",
                        value: f.temp,
                        threshold: "Força = molhamento × temp deve chegar em 140",
                        critical: isSarnaWet && sarnaForce >= 140,
                      },
                      {
                        label: "Umidade relativa",
                        value: f.hum,
                        threshold: "Acima de 90% para folha molhada",
                        critical: humNum > 90,
                      },
                      {
                        label: "Chuva",
                        value: f.rain,
                        threshold: "Qualquer chuva ativa o período de molhamento",
                        critical: hasRain,
                      },
                    ],
                  },
                  {
                    key: "gala",
                    name: "Mancha de Gala", sci: "Colletotrichum spp.",
                    risk: galaRisk,
                    isWet: isGalaWet,
                    wetOptions: [
                      { key: "wet", label: "Maior", sub: "10h ou mais" },
                      { key: "dry", label: "Menor", sub: "menos de 10h" },
                    ],
                    description: markerDiseaseMap["Mancha de Gala"]?.description ?? "Doença fúngica que causa lesões necróticas nas folhas, levando ao ressecamento prematuro e desfolha significativa, comprometendo a produção.",
                    conditions: markerDiseaseMap["Mancha de Gala"]?.conditions ?? "Desenvolve-se sob molhamento prolongado, temperaturas entre 15-20°C e alta umidade relativa.",
                    alertCause: [
                      {
                        label: "Molhamento foliar com chuva",
                        value: isGalaWet ? "10h ou mais" : "menos de 10h",
                        threshold: "10h ou mais para ativar",
                        critical: isGalaWet,
                      },
                      {
                        label: "Temperatura",
                        value: f.temp,
                        threshold: "Acima de 14,9°C para ativar",
                        critical: tempNum > 14.9,
                      },
                      {
                        label: "Umidade relativa",
                        value: f.hum,
                        threshold: "Acima de 90% para folha molhada",
                        critical: humNum > 90,
                      },
                      {
                        label: "Chuva",
                        value: f.rain,
                        threshold: "Qualquer chuva ativa o período de molhamento",
                        critical: hasRain,
                      },
                    ],
                  },
                ];

                return (
                  <div className="space-y-3">

                    {/* Métricas meteorológicas do dia */}
                    <div className="grid grid-cols-3 gap-2">
                      {condCols.map(({ Icon, label, value }) => (
                        <div key={label} className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ background: "#f9fafb" }}>
                          <Icon size={13} style={{ color: C.greenMid }} />
                          <p className="text-[9px] text-center" style={{ color: "#9ca3af" }}>{label}</p>
                          <p className="text-xs font-bold" style={{ color: C.textDark }}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Cards de doença com alerta dinâmico */}
                    {diseases.map((d) => (
                      <div
                        key={d.name}
                        className="rounded-2xl transition-all overflow-hidden"
                        style={{ border: `1px solid ${riskBorder(d.risk)}`, background: C.white, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                      >
                        {/* Seletor de molhamento foliar — específico desta doença */}
                        <div
                          className="px-3 pt-3 pb-2"
                          style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}
                        >
                          <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#9ca3af" }}>
                            Molhamento foliar na fazenda
                          </p>
                          <div className="flex gap-2">
                            {d.wetOptions.map((s) => {
                              const active = diseaseWetScenario[d.key] === s.key;
                              return (
                                <button
                                  key={s.key}
                                  onClick={() =>
                                    setDiseaseWetScenario((prev) => ({ ...prev, [d.key]: s.key }))
                                  }
                                  className="flex-1 py-2 px-2 rounded-xl text-center transition-all"
                                  style={{
                                    background: active ? C.green : C.white,
                                    color: active ? "#fff" : "#6b7280",
                                    border: `1.5px solid ${active ? C.green : "#e5e7eb"}`,
                                  }}
                                >
                                  <p className="text-[11px] font-black leading-tight">{s.label}</p>
                                  <p className="text-[9px] font-medium mt-0.5 opacity-80">{s.sub}</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Conteúdo do card */}
                        <div className="p-3">
                        {/* Nome + nome científico */}
                        <div className="mb-3">
                          <p className="text-base font-black leading-tight" style={{ color: C.textDark }}>{d.name}</p>
                          <p className="text-[11px] italic mt-0.5" style={{ color: "#6b7280" }}>{d.sci}</p>
                        </div>

                        {/* Barra de status de risco */}
                        <div
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-4"
                          style={{ background: riskBg(d.risk), border: `1px solid ${riskBorder(d.risk)}` }}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: riskColor(d.risk) }}>
                            Status de Risco
                          </span>
                          <span
                            className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide text-white shadow-sm"
                            style={{ background: riskColor(d.risk) }}
                          >
                            {d.risk}
                          </span>
                        </div>

                        {/* Sobre e Condições */}
                        <div className="mb-4 p-3 rounded-xl space-y-2.5" style={{ background: "#F8FAFB", border: "1px solid #F1F3F5" }}>
                          <p className="text-[11px] leading-relaxed" style={{ color: "#4B5563" }}>
                            <span className="font-bold text-slate-700 block mb-0.5">Sobre:</span>
                            {d.description}
                          </p>
                          <div className="h-px w-full bg-slate-200 opacity-50" />
                          <p className="text-[11px] leading-relaxed" style={{ color: "#4B5563" }}>
                            <span className="font-bold text-slate-700 block mb-0.5">Condições:</span>
                            {d.conditions}
                          </p>
                        </div>

                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#9ca3af" }}>
                          Motivo do Alerta
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {d.alertCause.map((ac, j) => {
                            const Icon =
                              ac.label.includes("Umidade") ? Droplets :
                              ac.label.includes("Temperatura") ? ThermometerSun :
                              ac.label.includes("Chuva") ? CloudRain : Wind;
                            return (
                              <div
                                key={j}
                                className="flex items-center justify-between px-3 py-2 rounded-xl"
                                style={{
                                  background: ac.critical ? riskBg(d.risk) : "#f9fafb",
                                  border: `1px solid ${ac.critical ? riskBorder(d.risk) : "#f3f4f6"}`,
                                }}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="p-1.5 rounded-lg"
                                    style={{
                                      background: C.white,
                                      color: ac.critical ? riskColor(d.risk) : "#9ca3af",
                                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                    }}
                                  >
                                    <Icon size={14} />
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-bold" style={{ color: C.textDark }}>{ac.label}</p>
                                    <p className="text-[9px]" style={{ color: "#9ca3af" }}>{ac.threshold}</p>
                                  </div>
                                </div>
                                <p
                                  className="text-sm font-black ml-2 shrink-0"
                                  style={{ color: ac.critical ? riskColor(d.risk) : C.textDark }}
                                >
                                  {ac.value}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                        </div> {/* fim conteúdo do card */}
                      </div>
                    ))}
                  </div>
                );
              })()}


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
                if (skipPreventionManual) {
                  setShowFilterSheet(false);
                  setFiltersApplied(true);
                } else {
                  setShowFilterSheet(false);
                  setPendingFilterApply(true);
                  if (selectedCrop && PREVENTION_MANUALS[selectedCrop]) {
                    setSelectedManualCrop(selectedCrop);
                  } else {
                    setSelectedManualCrop("");
                  }
                  setShowPreventionModal(true);
                }
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
        {/* ── MANUAL DA PREVENÇÃO ── */}
        {showPreventionModal && (
          <>
            {/* Backdrop — no desktop vira flex container para centralizar com padding */}
            <div
              className="absolute inset-0 z-50
                         md:flex md:items-center md:justify-center md:p-8"
              style={{ background: "rgba(0,0,0,0.5)" }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowPreventionModal(false);
                  if (pendingFilterApply) { setPendingFilterApply(false); setFiltersApplied(true); }
                }
              }}
            >

              {/* Painel — bottom sheet mobile / modal desktop */}
              <div
                className="absolute z-60 flex flex-col
                         left-0 right-0 bottom-0 rounded-t-2xl
                         md:static md:rounded-2xl md:w-full md:max-w-5xl md:max-h-full"
                style={{
                  background: "#ffffff",
                  maxHeight: "85dvh",
                  boxShadow: "0 -4px 32px rgba(0,0,0,0.18), 0 2px 16px rgba(0,0,0,0.12)",
                }}
              >
                {/* Drag handle mobile */}
                <div className="md:hidden flex justify-center pt-2.5 pb-0 shrink-0">
                  <div className="w-8 h-0.75 rounded-full" style={{ background: "#d1d5db" }} />
                </div>

                {/* Cabeçalho do documento */}
                <div
                  className="px-6 pt-5 pb-4 shrink-0 flex items-start justify-between gap-4"
                  style={{ borderBottom: "2px solid #111c15" }}
                >
                  <div>
                    <p
                      className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1"
                      style={{ color: C.greenMid }}
                    >
                      IDR-Paraná · Sistema Alerta Fitossanitário
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-6">
                      <div className="flex items-center gap-3">
                        {selectedManualCrop !== "" && (
                          <button
                            onClick={() => setSelectedManualCrop("")}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Voltar para a seleção de cultura"
                          >
                            {/* Seta para esquerda = ChevronDown com rotate */}
                            <ChevronDown size={22} className="rotate-90" style={{ color: C.green }} />
                          </button>
                        )}
                        <h2
                          className="text-xl font-black leading-tight tracking-tight"
                          style={{ color: "#111c15" }}
                        >
                          Manual de Prevenção
                        </h2>
                      </div>
                      {selectedManualCrop !== "" && (
                        <div className="flex items-center gap-2 pb-0.5">
                          <span className="text-xs font-semibold" style={{ color: "#6b7280" }}>
                            Cultura:
                          </span>
                          <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded-md" style={{ color: C.green }}>
                            {selectedManualCrop}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowPreventionModal(false);
                      if (pendingFilterApply) { setPendingFilterApply(false); setFiltersApplied(true); }
                    }}
                    className="shrink-0 p-1.5 rounded transition-colors hover:bg-gray-100"
                    style={{ color: "#6b7280" }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Corpo scrollável */}
                {selectedManualCrop === "" ? (
                  <div className="overflow-y-auto flex-1 px-6 py-6 pb-12">
                    <div className="text-center space-y-2 mb-8 mt-2">
                      <div className="inline-flex justify-center items-center w-14 h-14 rounded-full mb-2" style={{ background: C.greenPale }}>
                        <BookOpen size={28} style={{ color: C.green }} />
                      </div>
                      <h3 className="text-lg font-black text-slate-800">Selecione uma Cultura</h3>
                      <p className="text-sm text-slate-500 max-w-sm mx-auto">
                        Escolha uma cultura abaixo para visualizar as diretrizes e boas práticas de manejo fitossanitário preventivo.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto">
                      {[
                        { name: "Maçã", desc: "Venturia inaequalis, Colletotrichum spp." }
                      ].map(f => (
                        <button
                          key={f.name}
                          onClick={() => setSelectedManualCrop(f.name)}
                          className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border text-center transition-all bg-white border-gray-200 hover:border-green-500 hover:bg-green-50 cursor-pointer"
                        >
                          <div>
                            <h4 className="font-black text-slate-800 text-lg">{f.name}</h4>
                            <p className="text-xs text-slate-500 font-medium mt-1 leading-tight">{f.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

                    {/* Introdução */}
                    <p className="text-[13px] leading-relaxed" style={{ color: "#374151" }}>
                      As doenças fúngicas da {selectedManualCrop.toLowerCase()} se desenvolvem em condições climáticas específicas. As medidas a seguir devem ser adotadas de forma preventiva, antes do estabelecimento das condições favoráveis à infecção.
                    </p>

                    {/* Seções por doença */}
                    {PREVENTION_MANUALS[selectedManualCrop]?.diseases.map((d, di) => (
                      <div key={d.name}>
                        {/* Título da seção */}
                        <div className="flex items-baseline gap-2 mb-3">
                          <span
                            className="text-[10px] font-black uppercase tracking-widest"
                            style={{ color: C.greenMid }}
                          >
                            {String(di + 1).padStart(2, "0")}
                          </span>
                          <div style={{ borderBottom: `1px solid #e5e7eb`, flex: 1, marginBottom: 2 }} />
                        </div>
                        <div style={{ paddingLeft: "4px" }}>
                          <p
                            className="text-base font-bold leading-tight mb-1"
                            style={{ color: d.color }}
                          >
                            {d.name}
                          </p>
                          <p
                            className="text-[11px] italic mb-4"
                            style={{ color: "#9ca3af" }}
                          >
                            {d.sci}
                          </p>
                        </div>

                        {/* Lista de medidas */}
                        <ol className="space-y-3">
                          {d.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <span
                                className="shrink-0 text-[11px] font-black tabular-nums mt-px"
                                style={{ color: C.green, minWidth: "1.2rem" }}
                              >
                                {i + 1}.
                              </span>
                              <p className="text-[13px] leading-relaxed" style={{ color: "#374151" }}>
                                {tip}
                              </p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}

                    {/* Divisor */}
                    <div style={{ borderTop: "1px solid #e5e7eb" }} />

                    {/* Boas práticas gerais */}
                    <div>
                      <p
                        className="text-[9px] font-black uppercase tracking-[0.15em] mb-3"
                        style={{ color: "#9ca3af" }}
                      >
                        Recomendações Gerais
                      </p>
                      <ul className="space-y-2.5">
                        {PREVENTION_MANUALS[selectedManualCrop]?.general.map((tip, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="shrink-0 mt-1.25 w-1 h-1 rounded-full" style={{ background: "#9ca3af" }} />
                            <p className="text-[13px] leading-relaxed" style={{ color: "#6b7280" }}>
                              {tip}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="h-1" />
                  </div>
                )}

                {/* Rodapé visível apenas se houver filtros aplicados aguardando revisão do app */}
                {pendingFilterApply && (
                  <div
                    className="px-6 py-4 shrink-0 space-y-3"
                    style={{ borderTop: "1px solid #e5e7eb", background: "#fafafa" }}
                  >
                    {/* Checkbox */}
                    <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
                      <input
                        type="checkbox"
                        checked={skipPreventionManual}
                        onChange={(e) => setSkipPreventionManual(e.target.checked)}
                        className="w-4 h-4 rounded accent-green-700 cursor-pointer"
                      />
                      <span className="text-[12px]" style={{ color: "#6b7280" }}>
                        Não exibir este manual novamente ao filtrar
                      </span>
                    </label>

                    {/* Botão */}
                    <button
                      className="w-full py-2.5 rounded font-bold text-sm text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:opacity-80"
                      style={{ background: C.green }}
                      onClick={() => {
                        setShowPreventionModal(false);
                        setPendingFilterApply(false);
                        setFiltersApplied(true);
                      }}
                    >
                      <Search size={14} />
                      Ver Mapa
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
