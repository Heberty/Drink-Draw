export type CatalogEvent = {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  description: string;
  sample: boolean;
  image?: Blob | string;
};

export type EventAgendaParams = { data?: string | string[]; visualizacao?: string | string[] };

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
});

export function validEventDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function formatEventDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}

export function eventToday() {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  return ["year", "month", "day"].map((part) => parts.find(({ type }) => type === part)?.value).join("-");
}

export const initialEvents: CatalogEvent[] = [
  ["2026-11-26", "18:30", "Quinta do Malte", "Pátio do Farol", "Degustação guiada de estilos de cerveja artesanal."],
  ["2026-11-27", "19:00", "Jazz no Terraço", "Terraço Brisa Sul", "Trio de jazz ao vivo ao pôr do sol."],
  ["2026-11-28", "16:00", "Feira de Sabores", "Praça das Conchas", "Barracas de comida, bebidas artesanais e produção local."],
  ["2026-11-28", "21:00", "Noite do Vinil", "Bar Girassol", "Seleção de discos brasileiros e internacionais."],
  ["2026-11-29", "15:00", "Encontro de Cafés Gelados", "Casa da Duna", "Oficina e prova de diferentes métodos de preparo."],
  ["2026-11-30", "19:30", "Cinema no Pátio", "Pátio da Lua", "Sessão de curtas ao ar livre."],
  ["2026-12-02", "18:00", "Oficina de Bebidas Sem Álcool", "Estúdio Maré", "Receitas com frutas, ervas e especiarias."],
  ["2026-12-03", "20:00", "Quiz de Boteco", "Boteco do Ipê", "Rodadas em equipe de música e cultura geral."],
  ["2026-12-04", "17:30", "Acústico na Varanda", "Varanda do Vento", "Repertório de MPB em formato acústico."],
  ["2026-12-05", "14:00", "Festival da Praça", "Praça do Caju", "Música, gastronomia e feira de produtores locais."],
  ["2026-12-05", "22:00", "Pista Tropical", "Clube Horizonte", "Sets de música eletrônica e ritmos brasileiros."],
  ["2026-12-06", "11:00", "Brunch do Mercado", "Mercado da Vila", "Café da manhã estendido com produtores da região."],
  ["2026-12-09", "19:00", "Sarau no Jardim", "Jardim das Ondas", "Leituras de poesia e apresentações independentes."],
  ["2026-12-10", "19:30", "Menu Degustação da Vila", "Cozinha do Sol", "Pequenas porções com ingredientes sazonais."],
  ["2026-12-11", "20:00", "Samba no Beco", "Beco das Mangueiras", "Roda de samba com repertório popular."],
  ["2026-12-12", "16:00", "Feira de Verão", "Galeria Areia Clara", "Exposição de artesanato, quitutes e bebidas."],
  ["2026-12-13", "17:00", "Tarde de Jogos", "Espaço Tabuleiro", "Mesas abertas para jogos de cartas e tabuleiro."],
  ["2026-12-16", "18:30", "Encontro de Kombuchas", "Casa da Fermentação", "Apresentação de sabores e processos de fermentação."],
  ["2026-12-18", "20:00", "Noite de Forró", "Salão da Estação", "Trio pé de serra e pista aberta."],
  ["2026-12-20", "16:30", "Pôr do Sol Instrumental", "Mirante das Acácias", "Apresentações instrumentais no fim da tarde."],
].map(([date, time, name, location, description], index) => ({
  id: `evento-exemplo-${String(index + 1).padStart(2, "0")}`,
  date, time, name, location, description, sample: true,
}));
