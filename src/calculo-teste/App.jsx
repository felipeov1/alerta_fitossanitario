import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  CloudRain,
  Droplets,
  FileJson,
  Table2,
  Thermometer,
  Trash2,
  Upload,
} from "lucide-react";

const RH_THRESHOLDS = [85, 87, 88, 90, 92, 94];
const DPD_THRESHOLDS = [1, 2, 3, 4];
const PERIOD_ORDER = ["madrugada", "manha", "tarde", "noite"];
const TZ = "America/Sao_Paulo";

const C = {
  green: "#1e6b45",
  greenMid: "#2e8b57",
  greenPale: "#a8d5ba",
  greenUltra: "#e8f5e9",
  red: "#d32f2f",
  textDark: "#111c15",
  background: "#F0F4F1",
  panelBg: "#F5FAF7",
  border: "#dee2e6",
  white: "#FFFFFF",
};

const sampleJson = {
  fonte: "Open-Meteo",
  modelo: "GFS",
  local: {
    nome: "Londrina",
    estado: "PR",
    latitude: -23.31,
    longitude: -51.16,
    timezone: "America/Sao_Paulo",
  },
  periodo: {
    inicio: "2026-05-14",
    fim: "2026-05-15",
    granularidade: "horaria",
  },
  dados_horarios: [
    {
      data_hora: "2026-05-14T00:00:00-03:00",
      temperatura_c: 14.2,
      umidade_relativa: 94,
      ponto_orvalho_c: 13.1,
      precipitacao_mm: 0,
      chuva_mm: 0,
      vento_ms: 1.4,
      pressao_hpa: 1012,
      nebulosidade_percentual: 78,
    },
    {
      data_hora: "2026-05-14T01:00:00-03:00",
      temperatura_c: 13.8,
      umidade_relativa: 96,
      ponto_orvalho_c: 13.0,
      precipitacao_mm: 0,
      chuva_mm: 0,
      vento_ms: 1.1,
      pressao_hpa: 1012.4,
      nebulosidade_percentual: 82,
    },
    {
      data_hora: "2026-05-14T02:00:00-03:00",
      temperatura_c: 13.5,
      umidade_relativa: 91,
      ponto_orvalho_c: 12.4,
      precipitacao_mm: 0.2,
      chuva_mm: 0.2,
      vento_ms: 0.9,
      pressao_hpa: 1011.8,
      nebulosidade_percentual: 90,
    },
    {
      data_hora: "2026-05-14T03:00:00-03:00",
      temperatura_c: 13.2,
      umidade_relativa: 86,
      ponto_orvalho_c: 10.8,
      precipitacao_mm: 0,
      chuva_mm: 0,
      vento_ms: 1.6,
      pressao_hpa: 1011.5,
      nebulosidade_percentual: 67,
    },
    {
      data_hora: "2026-05-14T08:00:00-03:00",
      temperatura_c: 16.4,
      umidade_relativa: 82,
      ponto_orvalho_c: 12.6,
      precipitacao_mm: 0,
      chuva_mm: 0,
      vento_ms: 2.2,
      pressao_hpa: 1013,
      nebulosidade_percentual: 40,
    },
    {
      data_hora: "2026-05-14T14:00:00-03:00",
      temperatura_c: 23.1,
      umidade_relativa: 68,
      ponto_orvalho_c: 16.8,
      precipitacao_mm: 0,
      chuva_mm: 0,
      vento_ms: 2.8,
      pressao_hpa: 1010.6,
      nebulosidade_percentual: 35,
    },
    {
      data_hora: "2026-05-14T19:00:00-03:00",
      temperatura_c: 18.1,
      umidade_relativa: 88,
      ponto_orvalho_c: 16.0,
      precipitacao_mm: 0,
      chuva_mm: 0,
      vento_ms: 1.9,
      pressao_hpa: 1011.2,
      nebulosidade_percentual: 61,
    },
  ],
};

function asNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstNumber(...values) {
  for (const value of values) {
    const number = asNumber(value);
    if (number !== null) return number;
  }
  return null;
}

function hasTimezone(value) {
  return /(?:z|[+-]\d{2}:?\d{2})$/i.test(String(value).trim());
}

function parseDate(value, assumeUtc = false) {
  if (!value) return null;
  const text = String(value).trim();
  const date = new Date(assumeUtc && !hasTimezone(text) ? `${text}Z` : text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function localDateParts(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    label: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`,
  };
}

function periodName(hour) {
  if (hour <= 5) return "madrugada";
  if (hour <= 11) return "manha";
  if (hour <= 17) return "tarde";
  return "noite";
}

function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function formatPercent(count, total) {
  if (!total) return "0%";
  return `${formatNumber((count / total) * 100, 1)}%`;
}

function isOpenMeteoRaw(json) {
  return Boolean(json?.hourly && Array.isArray(json.hourly.time));
}

function offsetToText(offsetSeconds) {
  const numericOffset = Number(offsetSeconds);
  if (!Number.isFinite(numericOffset)) return null;

  const sign = numericOffset < 0 ? "-" : "+";
  const absolute = Math.abs(numericOffset);
  const hours = String(Math.floor(absolute / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((absolute % 3600) / 60)).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

function normalizeOpenMeteoTime(value, json) {
  if (value === null || value === undefined) return null;

  const text = String(value);
  if (hasTimezone(text)) return text;

  const offset =
    offsetToText(json?.utc_offset_seconds) ||
    (json?.timezone === "America/Sao_Paulo" ? "-03:00" : null);

  if (!offset || !text.includes("T")) return text;
  return `${text.length === 16 ? `${text}:00` : text}${offset}`;
}

function datePart(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function hourlyValue(hourly, key, index) {
  const values = hourly?.[key];
  if (!Array.isArray(values) || values[index] === undefined) return null;
  return values[index] ?? null;
}

function convertOpenMeteoRaw(json) {
  if (!isOpenMeteoRaw(json)) {
    throw new Error("O JSON nao parece ser uma resposta bruta do Open-Meteo.");
  }

  const hourly = json.hourly;
  const times = hourly.time;
  if (!times.length) {
    throw new Error("hourly.time esta vazio.");
  }

  const dadosHorarios = times.map((time, index) => ({
    data_hora: normalizeOpenMeteoTime(time, json),
    temperatura_c: hourlyValue(hourly, "temperature_2m", index),
    umidade_relativa: hourlyValue(hourly, "relative_humidity_2m", index),
    ponto_orvalho_c: hourlyValue(hourly, "dew_point_2m", index),
    precipitacao_mm: hourlyValue(hourly, "precipitation", index),
    chuva_mm: hourlyValue(hourly, "rain", index),
    vento_ms: hourlyValue(hourly, "wind_speed_10m", index),
    pressao_hpa: hourlyValue(hourly, "surface_pressure", index),
    nebulosidade_percentual: hourlyValue(hourly, "cloud_cover", index),
  }));

  return {
    fonte: "Open-Meteo",
    modelo: "GFS",
    local: {
      nome: "Londrina",
      estado: "PR",
      latitude: json.latitude ?? null,
      longitude: json.longitude ?? null,
      timezone: json.timezone ?? null,
    },
    periodo: {
      inicio: datePart(dadosHorarios[0]?.data_hora),
      fim: datePart(dadosHorarios[dadosHorarios.length - 1]?.data_hora),
      granularidade: "horaria",
    },
    dados_horarios: dadosHorarios,
  };
}

function toCalculatorJson(json) {
  return isOpenMeteoRaw(json) ? convertOpenMeteoRaw(json) : json;
}

function normalizeRows(json) {
  const rawRows = Array.isArray(json?.dados_horarios) ? json.dados_horarios : [];
  const rows = [];
  const invalid = [];

  rawRows.forEach((raw, index) => {
    const timeKey = raw.data_hora ? "data_hora" : raw.valid_time ? "valid_time" : "time";
    const timeValue = raw[timeKey];
    const date = parseDate(timeValue, timeKey !== "data_hora");
    const temperatura = firstNumber(raw.temperatura_c);
    const umidade = firstNumber(raw.umidade_relativa);
    const pontoOrvalho = firstNumber(raw.ponto_orvalho_c);
    const precipitacao = firstNumber(raw.precipitacao_mm, raw.chuva_mm);
    const dpdFromTemp =
      temperatura !== null && pontoOrvalho !== null ? temperatura - pontoOrvalho : null;
    const dpd = dpdFromTemp ?? firstNumber(raw.dpd_c);
    const vento = firstNumber(raw.vento_ms, raw.vento_velocidade_ms);
    const missing = [];

    if (!timeValue || !date) missing.push("data_hora");
    if (temperatura === null) missing.push("temperatura_c");
    if (umidade === null) missing.push("umidade_relativa");
    if (pontoOrvalho === null) missing.push("ponto_orvalho_c");
    if (precipitacao === null) missing.push("precipitacao_mm");

    const row = {
      index,
      source: raw,
      timeValue,
      date,
      temperatura,
      umidade,
      pontoOrvalho,
      precipitacao,
      dpd,
      vento,
      missing,
      valid: missing.length === 0,
    };

    if (row.valid) rows.push(row);
    else invalid.push(row);
  });

  rows.sort((a, b) => a.date - b.date);
  return { rows, invalid, totalRows: rawRows.length };
}

function applyWetRules(rows) {
  let hysteresisWet = false;

  rows.forEach((row) => {
    row.rh90Wet = row.umidade >= 90;
    row.dpd2Wet = row.dpd < 2;
    row.rainWet = row.precipitacao > 0;

    if (!hysteresisWet && row.dpd <= 1.8) hysteresisWet = true;
    if (hysteresisWet && row.dpd >= 2.2) hysteresisWet = false;

    row.hysteresisWet = hysteresisWet;
    row.combinedWet = row.rainWet || row.rh90Wet || row.dpd2Wet;
  });
}

function count(rows, predicate) {
  return rows.reduce((total, row) => total + (predicate(row) ? 1 : 0), 0);
}

function thresholdResults(rows, thresholds, predicateFactory) {
  return thresholds.map((threshold) => ({
    threshold,
    wetHours: count(rows, predicateFactory(threshold)),
  }));
}

function methodSummary(rows) {
  const total = rows.length;
  const rh90 = count(rows, (row) => row.rh90Wet);
  const dpd2 = count(rows, (row) => row.dpd2Wet);
  const hysteresis = count(rows, (row) => row.hysteresisWet);
  const rain = count(rows, (row) => row.rainWet);
  const combined = count(rows, (row) => row.combinedWet);

  return [
    { method: "NHRH >= 90% / RH Threshold", rule: "UR >= 90", wetHours: rh90, total },
    { method: "UR calibrada localmente", rule: "UR >= 85, 87, 88, 90, 92, 94", wetHours: null, total },
    { method: "DPD < 2 °C", rule: "T - Td < 2", wetHours: dpd2, total },
    { method: "DPD calibrado", rule: "DPD < 1, 2, 3, 4", wetHours: null, total },
    { method: "DPD com histerese", rule: "inicia <= 1,8; termina >= 2,2", wetHours: hysteresis, total },
    { method: "Chuva direta", rule: "precipitação > 0", wetHours: rain, total },
    { method: "Modelo combinado simples", rule: "chuva OR UR>=90 OR DPD<2", wetHours: combined, total },
  ];
}

function summarizePeriods(rows) {
  const summary = new Map();

  rows.forEach((row) => {
    const parts = localDateParts(row.date);
    const periodo = periodName(parts.hour);
    const key = `${parts.date}|${periodo}`;

    if (!summary.has(key)) {
      summary.set(key, {
        date: parts.date,
        periodo,
        wetHours: 0,
        temps: [],
        humidities: [],
        rain: 0,
      });
    }

    const stats = summary.get(key);
    if (row.combinedWet) stats.wetHours += 1;
    stats.temps.push(row.temperatura);
    stats.humidities.push(row.umidade);
    stats.rain += row.precipitacao;
  });

  return [...summary.values()].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare) return dateCompare;
    return PERIOD_ORDER.indexOf(a.periodo) - PERIOD_ORDER.indexOf(b.periodo);
  });
}

function calculateFromJson(json) {
  const normalized = normalizeRows(json);
  const rows = normalized.rows.map((row) => ({ ...row }));
  applyWetRules(rows);

  return {
    ...normalized,
    rows,
    ...buildResultForRows(rows),
  };
}

function buildResultForRows(rows) {
  return {
    methods: methodSummary(rows),
    rhThresholds: thresholdResults(
      rows,
      RH_THRESHOLDS,
      (threshold) => (row) => row.umidade >= threshold,
    ),
    dpdThresholds: thresholdResults(
      rows,
      DPD_THRESHOLDS,
      (threshold) => (row) => row.dpd < threshold,
    ),
    periods: summarizePeriods(rows),
  };
}

function groupRowsByDay(rows) {
  const grouped = new Map();

  rows.forEach((row) => {
    const day = localDateParts(row.date).date;
    if (!grouped.has(day)) {
      grouped.set(day, []);
    }
    grouped.get(day).push(row);
  });

  return [...grouped.entries()].map(([date, dayRows], index) => ({
    date,
    label: `Dia ${index + 1}`,
    rows: dayRows,
    wetHours: count(dayRows, (row) => row.combinedWet),
  }));
}

function Pill({ value }) {
  return (
    <span
      className="inline-flex min-h-6 items-center rounded-full px-2.5 text-[11px] font-black"
      style={{
        background: value ? C.greenUltra : "#f1f3f5",
        color: value ? C.green : "#6b7280",
      }}
    >
      {value ? "sim" : "nao"}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, tone = "green" }) {
  const color = tone === "red" ? C.red : C.green;
  const background = tone === "red" ? "#fef2f2" : C.greenUltra;

  return (
    <div className="rounded-lg border p-4" style={{ background: C.white, borderColor: C.border }}>
      <div className="flex items-center gap-3">
        <div className="rounded-lg p-2" style={{ background }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: "#6b7280" }}>
            {label}
          </p>
          <p className="truncate text-lg font-black" style={{ color: C.textDark }}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function ThresholdList({ title, rows, suffix, total }) {
  return (
    <section className="rounded-lg border bg-white p-4" style={{ borderColor: C.border }}>
      <h2 className="mb-3 text-sm font-black" style={{ color: C.textDark }}>
        {title}
      </h2>
      <div className="space-y-2">
        {rows.map((row) => {
          const percent = total ? (row.wetHours / total) * 100 : 0;
          return (
            <div
              key={row.threshold}
              className="grid min-h-10 grid-cols-[74px_minmax(0,1fr)_64px] items-center gap-3 rounded-md border px-3 py-2"
              style={{ borderColor: C.border, background: C.panelBg }}
            >
              <span className="text-xs font-bold" style={{ color: C.textDark }}>
                {suffix} {String(row.threshold).replace(".", ",")}
              </span>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${percent}%`, background: C.greenMid }}
                />
              </div>
              <span className="text-right text-xs font-black" style={{ color: C.green }}>
                {row.wetHours} h
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function CalculoTeste() {
  const [jsonText, setJsonText] = useState(JSON.stringify(sampleJson, null, 2));
  const [parsedJson, setParsedJson] = useState(sampleJson);
  const [message, setMessage] = useState({ text: "Exemplo carregado.", type: "ok" });
  const [selectedDay, setSelectedDay] = useState("");

  const result = useMemo(() => {
    try {
      return calculateFromJson(parsedJson);
    } catch {
      return null;
    }
  }, [parsedJson]);

  const dayTabs = useMemo(() => groupRowsByDay(result?.rows ?? []), [result]);

  useEffect(() => {
    if (!dayTabs.length) {
      setSelectedDay("");
      return;
    }

    if (!dayTabs.some((tab) => tab.date === selectedDay)) {
      setSelectedDay(dayTabs[0].date);
    }
  }, [dayTabs, selectedDay]);

  const selectedDayResult = useMemo(() => {
    if (!result) return null;

    const activeTab = dayTabs.find((tab) => tab.date === selectedDay) ?? dayTabs[0];
    const rows = activeTab?.rows ?? result.rows;

    return {
      rows,
      ...buildResultForRows(rows),
    };
  }, [dayTabs, result, selectedDay]);

  const local = parsedJson?.local;
  const localLabel = [local?.nome, local?.estado].filter(Boolean).join(" - ") || "-";
  const periodLabel =
    selectedDayResult?.rows?.length > 0
      ? `${localDateParts(selectedDayResult.rows[0].date).label} ate ${
          localDateParts(selectedDayResult.rows[selectedDayResult.rows.length - 1].date).label
        }`
      : "-";

  const handleCalculate = () => {
    try {
      const inputJson = JSON.parse(jsonText);
      const json = toCalculatorJson(inputJson);
      if (!Array.isArray(json?.dados_horarios)) {
        setMessage({ text: "Campo dados_horarios ausente ou invalido.", type: "error" });
        return;
      }

      const calculated = calculateFromJson(json);
      if (!calculated.rows.length) {
        setParsedJson(json);
        setMessage({ text: "Nenhuma hora valida encontrada.", type: "error" });
        return;
      }

      setParsedJson(json);
      if (json !== inputJson) {
        setJsonText(JSON.stringify(json, null, 2));
      }
      setMessage({
        text:
          calculated.invalid.length > 0
            ? `JSON Open-Meteo convertido. ${calculated.invalid.length} hora(s) ignorada(s).`
            : json !== inputJson
              ? "JSON Open-Meteo convertido e calculado."
              : "Calculo concluido.",
        type: calculated.invalid.length > 0 ? "warn" : "ok",
      });
    } catch (error) {
      setMessage({ text: `JSON invalido: ${error.message}`, type: "error" });
    }
  };

  const handleConvertOpenMeteo = () => {
    try {
      const inputJson = JSON.parse(jsonText);
      const convertedJson = convertOpenMeteoRaw(inputJson);
      setJsonText(JSON.stringify(convertedJson, null, 2));
      setParsedJson(convertedJson);
      setMessage({
        text: `JSON Open-Meteo convertido com ${convertedJson.dados_horarios.length} hora(s).`,
        type: "ok",
      });
    } catch (error) {
      setMessage({ text: `Conversao falhou: ${error.message}`, type: "error" });
    }
  };

  const handleFile = async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    const text = await file.text();
    setJsonText(text);
    try {
      const inputJson = JSON.parse(text);
      const json = toCalculatorJson(inputJson);
      if (json !== inputJson) {
        setJsonText(JSON.stringify(json, null, 2));
      }
      setParsedJson(json);
      setMessage({
        text:
          json !== inputJson
            ? `Arquivo Open-Meteo convertido: ${file.name}`
            : `Arquivo carregado: ${file.name}`,
        type: "ok",
      });
    } catch (error) {
      setMessage({ text: `JSON invalido: ${error.message}`, type: "error" });
    }
  };

  return (
    <div className="min-h-screen font-sans" style={{ background: C.background, color: C.textDark }}>
      <main className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6">
        <header
          className="mb-4 flex flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
          style={{ borderColor: C.border }}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: C.greenMid }}>
              Calculo teste
            </p>
            <h1 className="text-xl font-black leading-tight md:text-2xl" style={{ color: C.textDark }}>
              Molhamento foliar por JSON horario
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <label
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-bold"
              style={{ borderColor: C.border, background: C.white, color: C.green }}
            >
              <Upload size={16} />
              JSON
              <input className="hidden" type="file" accept=".json,application/json" onChange={handleFile} />
            </label>
            <button
              type="button"
              onClick={handleConvertOpenMeteo}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-bold"
              style={{ borderColor: C.greenPale, background: C.greenUltra, color: C.green }}
            >
              <FileJson size={16} />
              Converter Open-Meteo
            </button>
            <button
              type="button"
              onClick={() => {
                setJsonText(JSON.stringify(sampleJson, null, 2));
                setParsedJson(sampleJson);
                setMessage({ text: "Exemplo carregado.", type: "ok" });
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-bold"
              style={{ borderColor: C.border, background: C.white, color: C.textDark }}
            >
              <FileJson size={16} />
              Exemplo
            </button>
            <button
              type="button"
              onClick={() => {
                setJsonText("");
                setMessage({ text: "", type: "" });
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-bold"
              style={{ borderColor: C.border, background: C.white, color: C.textDark }}
            >
              <Trash2 size={16} />
              Limpar
            </button>
            <button
              type="button"
              onClick={handleCalculate}
              className="inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-sm font-black text-white"
              style={{ background: C.green }}
            >
              <Calculator size={16} />
              Calcular
            </button>
          </div>
        </header>

        {dayTabs.length > 0 && (
          <nav
            className="mb-4 overflow-x-auto rounded-lg border bg-white p-2 shadow-sm"
            style={{ borderColor: C.border }}
          >
            <div className="flex min-w-max gap-2">
              {dayTabs.map((tab) => {
                const active = tab.date === selectedDay || (!selectedDay && tab === dayTabs[0]);
                return (
                  <button
                    key={tab.date}
                    type="button"
                    onClick={() => setSelectedDay(tab.date)}
                    className="min-h-12 rounded-md border px-4 text-left transition-all"
                    style={{
                      minWidth: 150,
                      background: active ? C.green : C.white,
                      borderColor: active ? C.green : C.border,
                      color: active ? C.white : C.textDark,
                    }}
                  >
                    <span className="block text-[10px] font-black uppercase tracking-wide opacity-80">
                      {tab.label}
                    </span>
                    <span className="block text-sm font-black">{tab.date}</span>
                    <span className="block text-[11px] font-semibold opacity-80">
                      {tab.rows.length} h / {tab.wetHours} h molhadas
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="rounded-lg border bg-white p-4 shadow-sm" style={{ borderColor: C.border }}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-black" style={{ color: C.textDark }}>
                Entrada JSON
              </h2>
              <span className="hidden text-xs font-semibold text-slate-500 sm:inline">
                Formato da calculadora ou Open-Meteo bruto
              </span>
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-black"
                style={{
                  background:
                    message.type === "error"
                      ? "#fef2f2"
                      : message.type === "warn"
                        ? "#fff7ed"
                        : C.greenUltra,
                  color:
                    message.type === "error"
                      ? C.red
                      : message.type === "warn"
                        ? "#c2410c"
                        : C.green,
                }}
              >
                {message.text || "Aguardando"}
              </span>
            </div>
            <textarea
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
              spellCheck={false}
              className="min-h-[520px] w-full resize-y rounded-md border bg-slate-50 p-3 font-mono text-xs leading-relaxed outline-none focus:ring-4 md:text-sm"
              style={{ borderColor: C.border, color: C.textDark, "--tw-ring-color": C.greenPale }}
            />
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard icon={ClipboardCheck} label="Local" value={localLabel} />
              <StatCard icon={Table2} label="Periodo" value={periodLabel} />
              <StatCard icon={CheckCircle2} label="Horas do dia" value={selectedDayResult?.rows.length ?? 0} />
              <StatCard
                icon={AlertCircle}
                label="Inconsistencias"
                value={result?.invalid.length ?? 0}
                tone={(result?.invalid.length ?? 0) > 0 ? "red" : "green"}
              />
            </div>

            <section className="rounded-lg border bg-white p-4 shadow-sm" style={{ borderColor: C.border }}>
              <h2 className="mb-3 text-sm font-black" style={{ color: C.textDark }}>
                Resumo dos metodos
              </h2>
              <div className="overflow-auto rounded-md border" style={{ borderColor: C.border }}>
                <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                  <thead style={{ background: C.panelBg }}>
                    <tr>
                      <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Metodo</th>
                      <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Regra</th>
                      <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Horas molhadas</th>
                      <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Base</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedDayResult?.methods ?? []).map((method) => (
                      <tr key={method.method} className="border-t" style={{ borderColor: C.border }}>
                        <td className="px-3 py-2 font-semibold">{method.method}</td>
                        <td className="px-3 py-2 text-slate-600">{method.rule}</td>
                        <td className="px-3 py-2 font-black" style={{ color: C.green }}>
                          {method.wetHours === null
                            ? "comparativo"
                            : `${method.wetHours} h (${formatPercent(method.wetHours, method.total)})`}
                        </td>
                        <td className="px-3 py-2">{method.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <ThresholdList
                title="UR calibrada localmente"
                rows={selectedDayResult?.rhThresholds ?? []}
                suffix="UR >="
                total={selectedDayResult?.rows.length ?? 0}
              />
              <ThresholdList
                title="DPD calibrado"
                rows={selectedDayResult?.dpdThresholds ?? []}
                suffix="DPD <"
                total={selectedDayResult?.rows.length ?? 0}
              />
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-lg border bg-white p-4 shadow-sm" style={{ borderColor: C.border }}>
          <div className="mb-3 flex items-center gap-2">
            <Droplets size={18} style={{ color: C.green }} />
            <h2 className="text-sm font-black" style={{ color: C.textDark }}>
              Resumo por periodo
            </h2>
          </div>
          <div className="overflow-auto rounded-md border" style={{ borderColor: C.border }}>
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead style={{ background: C.panelBg }}>
                <tr>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Data</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Periodo</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Horas molhadas</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Temp min</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Temp max</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">UR min</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">UR max</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Chuva total</th>
                </tr>
              </thead>
              <tbody>
                {(selectedDayResult?.periods ?? []).map((period) => (
                  <tr key={`${period.date}-${period.periodo}`} className="border-t" style={{ borderColor: C.border }}>
                    <td className="px-3 py-2 font-semibold">{period.date}</td>
                    <td className="px-3 py-2">{period.periodo}</td>
                    <td className="px-3 py-2 font-black" style={{ color: C.green }}>
                      {period.wetHours} h
                    </td>
                    <td className="px-3 py-2">{formatNumber(Math.min(...period.temps))} °C</td>
                    <td className="px-3 py-2">{formatNumber(Math.max(...period.temps))} °C</td>
                    <td className="px-3 py-2">{formatNumber(Math.min(...period.humidities), 0)}%</td>
                    <td className="px-3 py-2">{formatNumber(Math.max(...period.humidities), 0)}%</td>
                    <td className="px-3 py-2">{formatNumber(period.rain, 2)} mm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-4 rounded-lg border bg-white p-4 shadow-sm" style={{ borderColor: C.border }}>
          <div className="mb-3 flex items-center gap-2">
            <Thermometer size={18} style={{ color: C.green }} />
            <h2 className="text-sm font-black" style={{ color: C.textDark }}>
              Serie horaria calculada
            </h2>
          </div>
          <div className="overflow-auto rounded-md border" style={{ borderColor: C.border }}>
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead style={{ background: C.panelBg }}>
                <tr>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Data/hora</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Temp</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">UR</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Td</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">DPD</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Chuva</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Vento</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">UR >= 90</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">DPD &lt; 2</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Histerese</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Combinado</th>
                </tr>
              </thead>
              <tbody>
                {(selectedDayResult?.rows ?? []).map((row) => {
                  const parts = localDateParts(row.date);
                  return (
                    <tr key={`${row.index}-${row.timeValue}`} className="border-t" style={{ borderColor: C.border }}>
                      <td className="px-3 py-2 font-semibold">{parts.label}</td>
                      <td className="px-3 py-2">{formatNumber(row.temperatura)} °C</td>
                      <td className="px-3 py-2">{formatNumber(row.umidade, 0)}%</td>
                      <td className="px-3 py-2">{formatNumber(row.pontoOrvalho)} °C</td>
                      <td className="px-3 py-2">{formatNumber(row.dpd)} °C</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1">
                          <CloudRain size={14} style={{ color: C.greenMid }} />
                          {formatNumber(row.precipitacao, 2)} mm
                        </span>
                      </td>
                      <td className="px-3 py-2">{formatNumber(row.vento, 1)} m/s</td>
                      <td className="px-3 py-2">
                        <Pill value={row.rh90Wet} />
                      </td>
                      <td className="px-3 py-2">
                        <Pill value={row.dpd2Wet} />
                      </td>
                      <td className="px-3 py-2">
                        <Pill value={row.hysteresisWet} />
                      </td>
                      <td className="px-3 py-2">
                        <Pill value={row.combinedWet} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
