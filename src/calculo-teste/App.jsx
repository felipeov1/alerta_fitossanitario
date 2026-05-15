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

const CONTROLLED_DAY = "2026-05-14";
const CONTROLLED_STATION_ID = "23365116";
const CONTROLLED_SENSOR_LABEL = "Sensor 1m";
const CONTROLLED_UR_THRESHOLDS = Array.from({ length: 11 }, (_, index) => 80 + index);
const CONTROLLED_DPD_THRESHOLDS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];
const CONTROLLED_RAIN_RULES = [
  { id: "rain_gt_0", label: "> 0", rule: "precipitacao_mm > 0", test: (row) => rowRainAbove(row, 0, false) },
  { id: "rain_ge_01", label: ">= 0,1", rule: "precipitacao_mm >= 0,1", test: (row) => rowRainAbove(row, 0.1) },
  { id: "rain_ge_02", label: ">= 0,2", rule: "precipitacao_mm >= 0,2", test: (row) => rowRainAbove(row, 0.2) },
  { id: "rain_ge_05", label: ">= 0,5", rule: "precipitacao_mm >= 0,5", test: (row) => rowRainAbove(row, 0.5) },
];
const CONTROLLED_COMBINED_RULES = [
  {
    id: "combined_or_simple",
    label: "Combinado OR simples",
    rule: "precipitacao_mm > 0 OR UR >= 90 OR DPD < 2",
    test: (row) => rowRainAbove(row, 0, false) || rowRhAtLeast(row, 90) || rowDpdBelow(row, 2),
  },
  {
    id: "combined_cal_1",
    label: "Combinado calibrado 1",
    rule: "precipitacao_mm > 0 OR UR >= 85 OR DPD < 2",
    test: (row) => rowRainAbove(row, 0, false) || rowRhAtLeast(row, 85) || rowDpdBelow(row, 2),
  },
  {
    id: "combined_cal_2",
    label: "Combinado calibrado 2",
    rule: "precipitacao_mm > 0 OR UR >= 88 OR DPD < 2",
    test: (row) => rowRainAbove(row, 0, false) || rowRhAtLeast(row, 88) || rowDpdBelow(row, 2),
  },
  {
    id: "combined_restrict_1",
    label: "Combinado restritivo 1",
    rule: "precipitacao_mm > 0 OR (UR >= 85 AND DPD < 3)",
    test: (row) => rowRainAbove(row, 0, false) || (rowRhAtLeast(row, 85) && rowDpdBelow(row, 3)),
  },
  {
    id: "combined_restrict_2",
    label: "Combinado restritivo 2",
    rule: "precipitacao_mm > 0 OR (UR >= 88 AND DPD < 2,5)",
    test: (row) => rowRainAbove(row, 0, false) || (rowRhAtLeast(row, 88) && rowDpdBelow(row, 2.5)),
  },
  {
    id: "combined_restrict_3",
    label: "Combinado restritivo 3",
    rule: "precipitacao_mm > 0 OR (UR >= 90 AND DPD < 2)",
    test: (row) => rowRainAbove(row, 0, false) || (rowRhAtLeast(row, 90) && rowDpdBelow(row, 2)),
  },
  {
    id: "combined_rain_01",
    label: "Combinado com chuva >= 0,1",
    rule: "precipitacao_mm >= 0,1 OR (UR >= 88 AND DPD < 2,5)",
    test: (row) => rowRainAbove(row, 0.1) || (rowRhAtLeast(row, 88) && rowDpdBelow(row, 2.5)),
  },
];

const REAL_LEAF_WETNESS_2026_05_14 = [
  { data_hora: "2026-05-14T00:00:00-03:00", registros: 4, seco_min: 0.0, contaminado_min: 0.0, molhado_min: 60.0, umido_min: 60.0 },
  { data_hora: "2026-05-14T01:00:00-03:00", registros: 4, seco_min: 0.0, contaminado_min: 0.0, molhado_min: 60.0, umido_min: 60.0 },
  { data_hora: "2026-05-14T02:00:00-03:00", registros: 4, seco_min: 0.0, contaminado_min: 0.0, molhado_min: 60.0, umido_min: 60.0 },
  { data_hora: "2026-05-14T03:00:00-03:00", registros: 4, seco_min: 0.0, contaminado_min: 0.0, molhado_min: 60.0, umido_min: 60.0 },
  { data_hora: "2026-05-14T04:00:00-03:00", registros: 4, seco_min: 0.0, contaminado_min: 0.0, molhado_min: 60.0, umido_min: 60.0 },
  { data_hora: "2026-05-14T05:00:00-03:00", registros: 4, seco_min: 0.0, contaminado_min: 0.0, molhado_min: 60.0, umido_min: 60.0 },
  { data_hora: "2026-05-14T06:00:00-03:00", registros: 4, seco_min: 0.0, contaminado_min: 0.0, molhado_min: 60.0, umido_min: 60.0 },
  { data_hora: "2026-05-14T07:00:00-03:00", registros: 4, seco_min: 0.0, contaminado_min: 0.0, molhado_min: 60.0, umido_min: 60.0 },
  { data_hora: "2026-05-14T08:00:00-03:00", registros: 4, seco_min: 47.7, contaminado_min: 5.2, molhado_min: 7.2, umido_min: 12.4 },
  { data_hora: "2026-05-14T09:00:00-03:00", registros: 4, seco_min: 60.0, contaminado_min: 0.0, molhado_min: 0.0, umido_min: 0.0 },
  { data_hora: "2026-05-14T10:00:00-03:00", registros: 4, seco_min: 60.0, contaminado_min: 0.0, molhado_min: 0.0, umido_min: 0.0 },
  { data_hora: "2026-05-14T11:00:00-03:00", registros: 4, seco_min: 60.0, contaminado_min: 0.0, molhado_min: 0.0, umido_min: 0.0 },
  { data_hora: "2026-05-14T12:00:00-03:00", registros: 4, seco_min: 60.0, contaminado_min: 0.0, molhado_min: 0.0, umido_min: 0.0 },
  { data_hora: "2026-05-14T13:00:00-03:00", registros: 4, seco_min: 60.0, contaminado_min: 0.0, molhado_min: 0.0, umido_min: 0.0 },
  { data_hora: "2026-05-14T14:00:00-03:00", registros: 4, seco_min: 60.0, contaminado_min: 0.0, molhado_min: 0.0, umido_min: 0.0 },
  { data_hora: "2026-05-14T15:00:00-03:00", registros: 4, seco_min: 60.0, contaminado_min: 0.0, molhado_min: 0.0, umido_min: 0.0 },
  { data_hora: "2026-05-14T16:00:00-03:00", registros: 4, seco_min: 60.0, contaminado_min: 0.0, molhado_min: 0.0, umido_min: 0.0 },
  { data_hora: "2026-05-14T17:00:00-03:00", registros: 4, seco_min: 60.0, contaminado_min: 0.0, molhado_min: 0.0, umido_min: 0.0 },
  { data_hora: "2026-05-14T18:00:00-03:00", registros: 4, seco_min: 60.0, contaminado_min: 0.0, molhado_min: 0.0, umido_min: 0.0 },
  { data_hora: "2026-05-14T19:00:00-03:00", registros: 4, seco_min: 26.8, contaminado_min: 0.7, molhado_min: 32.5, umido_min: 33.2 },
  { data_hora: "2026-05-14T20:00:00-03:00", registros: 4, seco_min: 0.0, contaminado_min: 0.0, molhado_min: 60.0, umido_min: 60.0 },
  { data_hora: "2026-05-14T21:00:00-03:00", registros: 4, seco_min: 0.0, contaminado_min: 0.0, molhado_min: 60.0, umido_min: 60.0 },
  { data_hora: "2026-05-14T22:00:00-03:00", registros: 4, seco_min: 0.0, contaminado_min: 0.0, molhado_min: 60.0, umido_min: 60.0 },
  { data_hora: "2026-05-14T23:00:00-03:00", registros: 4, seco_min: 6.8, contaminado_min: 3.0, molhado_min: 50.2, umido_min: 53.2 },
];

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

function hasNumberValue(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function rowRhAtLeast(row, threshold) {
  return hasNumberValue(row.umidade) && row.umidade >= threshold;
}

function rowDpdBelow(row, threshold) {
  return hasNumberValue(row.dpd) && row.dpd < threshold;
}

function rowRainAbove(row, threshold, inclusive = true) {
  if (!hasNumberValue(row.precipitacao)) return false;
  return inclusive ? row.precipitacao >= threshold : row.precipitacao > threshold;
}

function dewPointMagnus(temperatura, umidade) {
  if (!hasNumberValue(temperatura) || !hasNumberValue(umidade) || umidade <= 0) return null;

  const a = 17.27;
  const b = 237.7;
  const alpha = (a * temperatura) / (b + temperatura) + Math.log(umidade / 100);
  const pontoOrvalho = (b * alpha) / (a - alpha);
  return Number.isFinite(pontoOrvalho) ? pontoOrvalho : null;
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
    const pontoOrvalhoInformado = firstNumber(raw.ponto_orvalho_c);
    const pontoOrvalho = pontoOrvalhoInformado ?? dewPointMagnus(temperatura, umidade);
    const precipitacao = firstNumber(raw.precipitacao_mm, raw.chuva_mm);
    const dpdFromTemp =
      temperatura !== null && pontoOrvalho !== null ? temperatura - pontoOrvalho : null;
    const dpd = dpdFromTemp ?? firstNumber(raw.dpd_c);
    const vento = firstNumber(raw.vento_ms, raw.vento_velocidade_ms);
    const localParts = date ? localDateParts(date) : null;
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
      data_hora_local: localParts?.label ?? null,
      dia_local: localParts?.date ?? null,
      estacao_id: raw.estacao_id ?? null,
      temperatura,
      umidade,
      pontoOrvalho,
      precipitacao,
      dpd,
      vento,
      pressao_hpa: firstNumber(raw.pressao_hpa),
      molfoliar_1m_molhado: firstNumber(raw.molfoliar_1m_molhado),
      molfoliar_1m_condensacao: firstNumber(raw.molfoliar_1m_condensacao),
      molfoliar_2m_molhado: firstNumber(raw.molfoliar_2m_molhado),
      molfoliar_2m_condensacao: firstNumber(raw.molfoliar_2m_condensacao),
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

function valorRegistro(registro, ...chaves) {
  for (const chave of chaves) {
    const valor = firstNumber(registro?.[chave], registro?.source?.[chave]);
    if (valor !== null) return valor;
  }
  return null;
}

function calcularSensor(registros, molhadoKey, condensacaoKey = null) {
  const minutosPorHora = registros
    .map((registro) => {
      const molhado = valorRegistro(registro, molhadoKey);
      const condensacao = condensacaoKey ? valorRegistro(registro, condensacaoKey) : null;

      if (molhado === null && condensacao === null) return null;
      return (molhado ?? 0) + (condensacao ?? 0);
    })
    .filter((valor) => valor !== null);

  if (!minutosPorHora.length) {
    return { ocorrencia: null, duracao: null, minutos: null };
  }

  const minutos = minutosPorHora.reduce((total, valor) => total + valor, 0);
  return {
    ocorrencia: minutosPorHora.filter((valor) => valor > 0).length,
    duracao: minutos / 60,
    minutos,
  };
}

function calcularMetricasReais(registrosDoDia) {
  const sensor1mMolhado = calcularSensor(registrosDoDia, "molfoliar_1m_molhado");
  const sensor1mUmido = calcularSensor(
    registrosDoDia,
    "molfoliar_1m_molhado",
    "molfoliar_1m_condensacao",
  );
  const sensor2mMolhado = calcularSensor(registrosDoDia, "molfoliar_2m_molhado");
  const sensor2mUmido = calcularSensor(
    registrosDoDia,
    "molfoliar_2m_molhado",
    "molfoliar_2m_condensacao",
  );

  return {
    ocorrencia_1m_molhado: sensor1mMolhado.ocorrencia,
    duracao_1m_molhado: sensor1mMolhado.duracao,
    minutos_1m_molhado: sensor1mMolhado.minutos,
    ocorrencia_1m_umido: sensor1mUmido.ocorrencia,
    duracao_1m_umido: sensor1mUmido.duracao,
    minutos_1m_umido: sensor1mUmido.minutos,
    ocorrencia_2m_molhado: sensor2mMolhado.ocorrencia,
    duracao_2m_molhado: sensor2mMolhado.duracao,
    minutos_2m_molhado: sensor2mMolhado.minutos,
    ocorrencia_2m_umido: sensor2mUmido.ocorrencia,
    duracao_2m_umido: sensor2mUmido.duracao,
    minutos_2m_umido: sensor2mUmido.minutos,
  };
}

const SENSOR_REAL_ROWS = [
  {
    key: "1m_molhado",
    label: "Sensor 1m - Molhado",
    occurrenceKey: "ocorrencia_1m_molhado",
    durationKey: "duracao_1m_molhado",
  },
  {
    key: "1m_umido",
    label: "Sensor 1m - Molhado + condensacao",
    occurrenceKey: "ocorrencia_1m_umido",
    durationKey: "duracao_1m_umido",
  },
  {
    key: "2m_molhado",
    label: "Sensor 2m - Molhado",
    occurrenceKey: "ocorrencia_2m_molhado",
    durationKey: "duracao_2m_molhado",
  },
  {
    key: "2m_umido",
    label: "Sensor 2m - Molhado + condensacao",
    occurrenceKey: "ocorrencia_2m_umido",
    durationKey: "duracao_2m_umido",
  },
];

function calculateControlledRealTotals(realRows) {
  const molhadoMin = realRows.reduce((total, row) => total + row.molhado_min, 0);
  const umidoMin = realRows.reduce((total, row) => total + row.umido_min, 0);

  return {
    horasAnalisadas: realRows.length,
    molhadoMin,
    molhadoHoras: molhadoMin / 60,
    umidoMin,
    umidoHoras: umidoMin / 60,
    ocorrenciaMolhado: count(realRows, (row) => row.molhado_min > 0),
    ocorrenciaUmido: count(realRows, (row) => row.umido_min > 0),
  };
}

const REAL_LEAF_WETNESS_TOTALS_2026_05_14 = calculateControlledRealTotals(
  REAL_LEAF_WETNESS_2026_05_14,
);

function getControlledForecastRows(rows) {
  const byHour = new Map();

  rows.forEach((row) => {
    const parts = localDateParts(row.date);
    if (parts.date !== CONTROLLED_DAY) return;

    const key = `${parts.date}-${parts.hour}`;
    if (!byHour.has(key)) byHour.set(key, row);
  });

  return [...byHour.values()].sort((a, b) => a.date - b.date);
}

function getMissingControlledHours(rows) {
  const hours = new Set(rows.map((row) => localDateParts(row.date).hour));
  return Array.from({ length: 24 }, (_, hour) => hour).filter((hour) => !hours.has(hour));
}

function controlledHourLabel(row) {
  const parts = localDateParts(row.date);
  return `${String(parts.hour).padStart(2, "0")}:00`;
}

function controlledStatus(absError) {
  if (absError <= 1) return "bom";
  if (absError <= 2) return "aceitavel";
  return "ruim";
}

function buildControlledMethodResult({ group, method, label, rule, test }, rows, realTotals) {
  const markedRows = rows.filter(test);
  const horasEstimadas = markedRows.length;
  const erroMolhado = horasEstimadas - realTotals.molhadoHoras;
  const erroUmido = horasEstimadas - realTotals.umidoHoras;

  return {
    id: `${group}-${label}`,
    group,
    method,
    label,
    rule,
    horasEstimadas,
    erroMolhado,
    erroAbsMolhado: Math.abs(erroMolhado),
    erroUmido,
    erroAbsUmido: Math.abs(erroUmido),
    horasMarcadas: markedRows.map(controlledHourLabel),
    status: controlledStatus(Math.abs(erroMolhado)),
  };
}

function buildControlledValidation(rows) {
  const forecastRows = getControlledForecastRows(rows);
  const realTotals = REAL_LEAF_WETNESS_TOTALS_2026_05_14;

  const urResults = CONTROLLED_UR_THRESHOLDS.map((threshold) =>
    buildControlledMethodResult(
      {
        group: "UR calibrada 80-90%",
        method: "UR calibrada",
        label: `UR >= ${threshold}%`,
        rule: `UR >= ${threshold}`,
        test: (row) => rowRhAtLeast(row, threshold),
      },
      forecastRows,
      realTotals,
    ),
  );

  const dpdResults = CONTROLLED_DPD_THRESHOLDS.map((threshold) =>
    buildControlledMethodResult(
      {
        group: "DPD calibrado",
        method: "DPD calibrado",
        label: `DPD < ${String(threshold).replace(".", ",")}`,
        rule: `DPD < ${threshold}`,
        test: (row) => rowDpdBelow(row, threshold),
      },
      forecastRows,
      realTotals,
    ),
  );

  const rainResults = CONTROLLED_RAIN_RULES.map((rule) =>
    buildControlledMethodResult(
      {
        group: "Chuva direta",
        method: "Chuva direta",
        label: rule.label,
        rule: rule.rule,
        test: rule.test,
      },
      forecastRows,
      realTotals,
    ),
  );

  const combinedResults = CONTROLLED_COMBINED_RULES.map((rule) =>
    buildControlledMethodResult(
      {
        group: "Modelos combinados",
        method: rule.label,
        label: rule.label,
        rule: rule.rule,
        test: rule.test,
      },
      forecastRows,
      realTotals,
    ),
  );

  const ranking = [...urResults, ...dpdResults, ...rainResults, ...combinedResults].sort((a, b) => {
    const errorCompare = a.erroAbsMolhado - b.erroAbsMolhado;
    if (errorCompare) return errorCompare;
    return a.label.localeCompare(b.label);
  });

  return {
    forecastRows,
    missingHours: getMissingControlledHours(forecastRows),
    realTotals,
    urResults,
    dpdResults,
    rainResults,
    combinedResults,
    ranking,
    best: ranking[0] ?? null,
  };
}

function formatFixedNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatHours(value) {
  return value === null || value === undefined ? "-" : `${formatFixedNumber(value, 2)} h`;
}

function formatHourCount(value) {
  return value === null || value === undefined ? "-" : `${formatNumber(value, 0)} h`;
}

function formatSignedHours(value) {
  if (value === null || value === undefined) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatFixedNumber(value, 2)} h`;
}

function formatDurationWithMinutes(hours) {
  if (hours === null || hours === undefined) return "-";
  return `${formatHours(hours)} / ${formatNumber(hours * 60, 1)} min`;
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

function ControlledStatusPill({ status }) {
  const color =
    status === "bom" ? C.green : status === "aceitavel" ? "#b45309" : C.red;
  const background =
    status === "bom" ? C.greenUltra : status === "aceitavel" ? "#fff7ed" : "#fef2f2";

  return (
    <span
      className="inline-flex min-h-6 items-center rounded-full px-2.5 text-[11px] font-black"
      style={{ background, color }}
    >
      {status}
    </span>
  );
}

function ControlledValidationTable({ title, rows, labelHeader = "Limiar" }) {
  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm" style={{ borderColor: C.border }}>
      <h3 className="mb-3 text-sm font-black" style={{ color: C.textDark }}>
        {title}
      </h3>
      <div className="overflow-auto rounded-md border" style={{ borderColor: C.border }}>
        <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
          <thead style={{ background: C.panelBg }}>
            <tr>
              <th className="px-3 py-2 text-[11px] uppercase tracking-wide">{labelHeader}</th>
              <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Regra</th>
              <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Horas estimadas</th>
              <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Erro vs molhado real</th>
              <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Erro absoluto</th>
              <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Erro vs umido real</th>
              <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Erro abs umido</th>
              <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Status</th>
              <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Horas marcadas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t" style={{ borderColor: C.border }}>
                <td className="px-3 py-2 font-semibold">{row.label}</td>
                <td className="px-3 py-2 text-slate-600">{row.rule}</td>
                <td className="px-3 py-2 font-black" style={{ color: C.green }}>
                  {formatHours(row.horasEstimadas)}
                </td>
                <td className="px-3 py-2">{formatSignedHours(row.erroMolhado)}</td>
                <td className="px-3 py-2">{formatHours(row.erroAbsMolhado)}</td>
                <td className="px-3 py-2">{formatSignedHours(row.erroUmido)}</td>
                <td className="px-3 py-2">{formatHours(row.erroAbsUmido)}</td>
                <td className="px-3 py-2">
                  <ControlledStatusPill status={row.status} />
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {row.horasMarcadas.length ? row.horasMarcadas.join(", ") : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ControlledRanking({ ranking }) {
  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm" style={{ borderColor: C.border }}>
      <h3 className="mb-3 text-sm font-black" style={{ color: C.textDark }}>
        Ranking geral
      </h3>
      <div className="overflow-auto rounded-md border" style={{ borderColor: C.border }}>
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead style={{ background: C.panelBg }}>
            <tr>
              <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Ranking</th>
              <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Metodo</th>
              <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Regra</th>
              <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Horas estimadas</th>
              <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Erro absoluto</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row, index) => {
              const best = index === 0;
              return (
                <tr
                  key={`${row.id}-rank`}
                  className="border-t"
                  style={{
                    borderColor: C.border,
                    background: best ? C.greenUltra : C.white,
                  }}
                >
                  <td className="px-3 py-2 font-black">{index + 1}</td>
                  <td className="px-3 py-2 font-semibold">
                    {best ? "Melhor metodo para este dia: " : ""}
                    {row.method}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{row.rule}</td>
                  <td className="px-3 py-2 font-black" style={{ color: C.green }}>
                    {formatHours(row.horasEstimadas)}
                  </td>
                  <td className="px-3 py-2">{formatHours(row.erroAbsMolhado)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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

  const metricasEstacaoDia = useMemo(
    () => calcularMetricasReais(selectedDayResult?.rows ?? []),
    [selectedDayResult],
  );

  const validationRows = useMemo(() => {
    const methods = (selectedDayResult?.methods ?? []).filter(
      (method) => method.wetHours !== null,
    );

    return methods.flatMap((method) =>
      SENSOR_REAL_ROWS.map((sensor) => {
        const estacao = metricasEstacaoDia?.[sensor.occurrenceKey] ?? null;

        return {
          key: `${method.method}-${sensor.key}`,
          method: `${method.method} / ${sensor.label}`,
          estimated: method.wetHours,
          estacao,
          erroEstacao: estacao !== null ? method.wetHours - estacao : null,
        };
      }),
    );
  }, [metricasEstacaoDia, selectedDayResult]);

  const controlledValidation = useMemo(
    () => buildControlledValidation(result?.rows ?? []),
    [result],
  );

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
            <ClipboardCheck size={18} style={{ color: C.green }} />
            <h2 className="text-sm font-black" style={{ color: C.textDark }}>
              Validacao por ocorrencia dos metodos estimados
            </h2>
          </div>
          <div className="overflow-auto rounded-md border" style={{ borderColor: C.border }}>
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead style={{ background: C.panelBg }}>
                <tr>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Metodo</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Estimado atual</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Sensor/estacao atual</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Erro vs estacao</th>
                </tr>
              </thead>
              <tbody>
                {validationRows.map((row) => (
                  <tr key={row.key} className="border-t" style={{ borderColor: C.border }}>
                    <td className="px-3 py-2 font-semibold">{row.method}</td>
                    <td className="px-3 py-2 font-black" style={{ color: C.green }}>
                      {formatHourCount(row.estimated)}
                    </td>
                    <td className="px-3 py-2">{formatHourCount(row.estacao)}</td>
                    <td className="px-3 py-2">{formatSignedHours(row.erroEstacao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-4 rounded-lg border bg-white p-4 shadow-sm" style={{ borderColor: C.border }}>
          <div className="mb-3 flex items-center gap-2">
            <Droplets size={18} style={{ color: C.green }} />
            <h2 className="text-sm font-black" style={{ color: C.textDark }}>
              Medicao real - sensores fisicos
            </h2>
          </div>
          <div className="overflow-auto rounded-md border" style={{ borderColor: C.border }}>
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead style={{ background: C.panelBg }}>
                <tr>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Metodo real</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Ocorrencia</th>
                  <th className="px-3 py-2 text-[11px] uppercase tracking-wide">Duracao real</th>
                </tr>
              </thead>
              <tbody>
                {SENSOR_REAL_ROWS.map((sensor) => (
                  <tr key={sensor.key} className="border-t" style={{ borderColor: C.border }}>
                    <td className="px-3 py-2 font-semibold">{sensor.label}</td>
                    <td className="px-3 py-2">
                      {formatHourCount(metricasEstacaoDia?.[sensor.occurrenceKey] ?? null)}
                    </td>
                    <td className="px-3 py-2">
                      {formatDurationWithMinutes(metricasEstacaoDia?.[sensor.durationKey] ?? null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-4 rounded-lg border bg-white p-4 shadow-sm" style={{ borderColor: C.border }}>
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardCheck size={18} style={{ color: C.green }} />
                <h2 className="text-sm font-black" style={{ color: C.textDark }}>
                  VALIDAÇÃO CONTROLADA — DIA 14/05/2026
                </h2>
              </div>
              <p className="mt-2 max-w-4xl text-xs leading-relaxed text-slate-600">
                Dados reais fixos da estação {CONTROLLED_STATION_ID}, {CONTROLLED_SENSOR_LABEL}.
                A referencia principal usa molhado_min; umido_min aparece como alternativa porque soma molhado e contaminado.
              </p>
            </div>
            <span
              className="inline-flex min-h-8 items-center rounded-full px-3 text-xs font-black"
              style={{
                background: controlledValidation.missingHours.length ? "#fff7ed" : C.greenUltra,
                color: controlledValidation.missingHours.length ? "#c2410c" : C.green,
              }}
            >
              {controlledValidation.forecastRows.length} h de previsao em {CONTROLLED_DAY}
            </span>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-4" style={{ borderColor: C.border, background: C.panelBg }}>
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Molhado real</p>
              <p className="mt-1 text-xl font-black" style={{ color: C.green }}>
                {formatHours(controlledValidation.realTotals.molhadoHoras)} /{" "}
                {formatNumber(controlledValidation.realTotals.molhadoMin, 1)} min
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Ocorrencia: {controlledValidation.realTotals.ocorrenciaMolhado} h
              </p>
            </div>
            <div className="rounded-lg border p-4" style={{ borderColor: C.border, background: C.panelBg }}>
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Umido real</p>
              <p className="mt-1 text-xl font-black" style={{ color: C.green }}>
                {formatHours(controlledValidation.realTotals.umidoHoras)} /{" "}
                {formatNumber(controlledValidation.realTotals.umidoMin, 1)} min
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Ocorrencia: {controlledValidation.realTotals.ocorrenciaUmido} h
              </p>
            </div>
            <div className="rounded-lg border p-4" style={{ borderColor: C.border, background: C.panelBg }}>
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Horas analisadas</p>
              <p className="mt-1 text-xl font-black" style={{ color: C.green }}>
                {controlledValidation.realTotals.horasAnalisadas}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Dados reais agregados de registros de 15 minutos.
              </p>
            </div>
          </div>

          {controlledValidation.forecastRows.length === 0 && (
            <div className="rounded-lg border p-3 text-sm font-semibold" style={{ borderColor: C.border, background: "#fff7ed", color: "#9a3412" }}>
              Cole no campo de entrada JSON os dados de previsão do dia 14/05/2026 para comparar os metodos.
            </div>
          )}

          {controlledValidation.forecastRows.length > 0 && controlledValidation.missingHours.length > 0 && (
            <div className="mb-4 rounded-lg border p-3 text-sm font-semibold" style={{ borderColor: C.border, background: "#fff7ed", color: "#9a3412" }}>
              Previsão incompleta para o dia 14. Horas ausentes:{" "}
              {controlledValidation.missingHours.map((hour) => `${String(hour).padStart(2, "0")}:00`).join(", ")}.
            </div>
          )}

          {controlledValidation.forecastRows.length > 0 && (
            <div className="space-y-4">
              <div
                className="rounded-lg border p-4"
                style={{
                  borderColor: C.border,
                  background:
                    controlledValidation.best?.status === "ruim" ? "#fef2f2" : C.greenUltra,
                }}
              >
                <p
                  className="text-[10px] font-black uppercase tracking-wide"
                  style={{ color: controlledValidation.best?.status === "ruim" ? C.red : C.green }}
                >
                  Melhor metodo para este dia
                </p>
                <p className="mt-1 text-base font-black" style={{ color: C.textDark }}>
                  {controlledValidation.best?.method} - {controlledValidation.best?.rule}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {formatHours(controlledValidation.best?.horasEstimadas)} estimadas; erro absoluto de{" "}
                  {formatHours(controlledValidation.best?.erroAbsMolhado)} contra molhado real.
                </p>
                {controlledValidation.best?.status === "ruim" && (
                  <p className="mt-2 text-sm font-bold" style={{ color: C.red }}>
                    Todos os metodos testados ficaram com erro absoluto acima de 2 h para este dia.
                  </p>
                )}
              </div>
              <ControlledRanking ranking={controlledValidation.ranking} />
              <ControlledValidationTable
                title="UR calibrada 80-90%"
                rows={controlledValidation.urResults}
              />
              <ControlledValidationTable
                title="DPD calibrado"
                rows={controlledValidation.dpdResults}
              />
              <ControlledValidationTable
                title="Chuva direta"
                rows={controlledValidation.rainResults}
              />
              <ControlledValidationTable
                title="Modelos combinados"
                rows={controlledValidation.combinedResults}
                labelHeader="Modelo"
              />
            </div>
          )}
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
