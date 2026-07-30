const fs = require('fs');
const file = '/home/felipe/Desktop/pj-maca/prototipo/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const markersStart = '  const markers = [';
const markersEnd = '  ];\n\n  const riskColor = (r) =>';

const startIdx = content.indexOf(markersStart);
const endIdx = content.indexOf(markersEnd);

if (startIdx === -1 || endIdx === -1) {
  console.log("Could not find markers array boundaries.");
  process.exit(1);
}

const newMarkers = `  const markers = [
    {
      id: 1, lat: -23.10, lng: -50.36, name: "Estação Bandeirantes", city: "Bandeirantes", status: "Normal", diseaseRisk: "Não Favorável", fase: "Crescimento", syncAgo: "10 minutos", fruits: ["🍎", "🍇"],
      diseases: [{ name: "Sarna da Maçã", risk: "Não Favorável", alertCause: [] }],
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
      diseases: [{ name: "Sarna da Maçã", risk: "Não Favorável", alertCause: [] }],
      codependency: [],
      station: { temp: "18.0°C", hum: "60%", wetness: "1 h", rain: "0 mm", wind: "12 km/h" },
      forecast: [{ day: "Hoje", date: "14/04", temp: "18°C", hum: "60%", rain: "0mm", wetness: "1 h", sarnaRisk: "Não Favorável", galaRisk: "Não Favorável" }],
      prevention: { sarna: ["Sem risco atual."], gala: ["Sem risco atual."] }
    },
    {
      id: 6, lat: -23.31, lng: -51.16, name: "Estação Londrina", city: "Londrina", status: "Atenção", diseaseRisk: "Pouco Favorável", fase: "Crescimento de frutos", syncAgo: "12 minutos", fruits: ["🍎", "🍇"],
      diseases: [{ name: "Sarna da Maçã", risk: "Pouco Favorável", alertCause: [{ label: "Umidade", value: "88%", threshold: "90%", critical: false }] }],
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
      diseases: [{ name: "Sarna da Maçã", risk: "Pouco Favorável", alertCause: [{ label: "Umidade relativa", value: "89%", threshold: "90%", critical: false }] }],
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
`;

const newContent = content.substring(0, startIdx) + newMarkers + content.substring(endIdx);
fs.writeFileSync(file, newContent, 'utf8');
console.log("Successfully replaced markers.");
