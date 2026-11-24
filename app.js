import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const config = window.ECO_CONFIG || {};
const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey);
const supabase = configured ? createClient(config.supabaseUrl, config.supabaseAnonKey) : null;
const authView = document.querySelector("#auth-view");
const appView = document.querySelector("#app-view");
const authForm = document.querySelector("#auth-form");
const authMessage = document.querySelector("#auth-message");
const activityPresets = {
  banho: { amount: 9, label: "Vazão (L/min)", hint: "Informe a vazão, duração média e número de pessoas. A estimativa multiplica esses dados pela frequência semanal.", multiplier: 1 },
  lavagem: { amount: 100, label: "Volume por ciclo (L)", hint: "Informe o volume aproximado de água por ciclo da máquina.", multiplier: 1 },
  calcada: { amount: 120, label: "Volume por lavagem (L)", hint: "Informe o volume aproximado usado em cada lavagem.", multiplier: 1 },
  veiculo: { amount: 150, label: "Volume por lavagem (L)", hint: "Informe o volume aproximado usado em cada lavagem.", multiplier: 1 },
  outros: { amount: 50, label: "Volume por uso (L)", hint: "Informe o volume aproximado usado em cada ocorrência.", multiplier: 1 }
};
let currentUser = null;
let appliances = [];
let readings = [];
let activities = [];
let tips = [];
let authMode = "login";

function setMessage(element, text, success = false) {
  element.textContent = text;
  element.classList.toggle("success", success);
}

function localDateValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function money(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function number(value, digits = 1) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits }).format(value || 0);
}

function prettyDate(value) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function textCell(text, className = "") {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (className) cell.className = className;
  return cell;
}

function emptyRow(body, columns, message) {
  const row = document.createElement("tr");
  const cell = textCell(message, "empty-cell");
  cell.colSpan = columns;
  row.append(cell);
  body.replaceChildren(row);
}

function deleteCell(table, recordId, recordLabel) {
  const cell = document.createElement("td");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "delete-button";
  button.textContent = "Excluir";
  button.setAttribute("aria-label", `Excluir ${recordLabel}`);
  button.addEventListener("click", () => removeRecord(table, recordId, recordLabel));
  cell.append(button);
  return cell;
}

function showApp(user) {
  currentUser = user;
  authView.hidden = true;
  appView.hidden = false;
  const name = user.user_metadata?.name || user.email?.split("@")[0] || "você";
  document.querySelector("#welcome-name").textContent = name;
  document.querySelector("#account-email").textContent = user.email || "Conta";
  document.querySelector("#avatar-initial").textContent = name.trim().charAt(0).toUpperCase() || "E";
  const kind = user.user_metadata?.kind === "comercio" ? "Pequeno comércio" : "Residência";
  document.querySelector("#profile-kind").textContent = kind;
  document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(new Date()).toUpperCase();
  void loadData();
}

function showAuth() {
  currentUser = null;
  appView.hidden = true;
  authView.hidden = false;
}

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "signup";
  authView.classList.toggle("signup-mode", signup);
  document.querySelector("#tab-login").classList.toggle("selected", !signup);
  document.querySelector("#tab-login").setAttribute("aria-selected", String(!signup));
  document.querySelector("#tab-signup").classList.toggle("selected", signup);
  document.querySelector("#tab-signup").setAttribute("aria-selected", String(signup));
  document.querySelector("#auth-title").textContent = signup ? "Crie seu espaço" : "Bem-vindo de volta";
  document.querySelector("#auth-submit").textContent = signup ? "Criar minha conta" : "Entrar na minha conta";
  document.querySelector("#reset-password").hidden = signup;
  document.querySelector("#auth-name").required = signup;
  setMessage(authMessage, "");
}

async function loadData() {
  const status = document.querySelector("#profile-kind");
  const originalLabel = currentUser?.user_metadata?.kind === "comercio" ? "Pequeno comércio" : "Residência";
  status.textContent = "Atualizando...";
  const [applianceResult, readingResult, activityResult, tipResult] = await Promise.all([
    supabase.from("appliances").select("id,name,watts,hours_daily,days_month,tariff,created_at").order("created_at", { ascending: false }),
    supabase.from("water_readings").select("id,reading_date,value_m3").order("reading_date", { ascending: true }),
    supabase.from("water_activities").select("id,name,liters_per_event,events_per_week,tariff,start_date,created_at").order("created_at", { ascending: false }),
    supabase.from("community_tips").select("id,user_id,body,created_at").order("created_at", { ascending: false }).limit(50)
  ]);
  const failures = [applianceResult, readingResult, activityResult, tipResult].filter(result => result.error);
  if (failures.length) {
    status.textContent = "Verifique o banco";
    window.alert(`Não foi possível carregar os dados: ${failures[0].error.message}. Confira se o schema SQL foi executado no Supabase.`);
    return;
  }
  appliances = applianceResult.data || [];
  readings = readingResult.data || [];
  activities = activityResult.data || [];
  tips = tipResult.data || [];
  status.textContent = originalLabel;
  renderAll();
}

function calculateEnergy() {
  return appliances.reduce((total, item) => {
    const kwh = Number(item.watts) * Number(item.hours_daily) * Number(item.days_month) / 1000;
    return { kwh: total.kwh + kwh, cost: total.cost + kwh * Number(item.tariff) };
  }, { kwh: 0, cost: 0 });
}

function calculateWater() {
  return activities.reduce((total, item) => {
    const liters = Number(item.liters_per_event) * Number(item.events_per_week) * 4.333;
    return { liters: total.liters + liters, cost: total.cost + liters / 1000 * Number(item.tariff) };
  }, { liters: 0, cost: 0 });
}

function renderAll() {
  renderAppliances();
  renderReadings();
  renderActivities();
  renderTips();
  renderDashboard();
  updateEnergyEstimate();
}

function renderAppliances() {
  const body = document.querySelector("#appliance-list");
  if (!appliances.length) return emptyRow(body, 6, "Nenhum aparelho cadastrado.");
  const rows = appliances.map(item => {
    const kwh = Number(item.watts) * Number(item.hours_daily) * Number(item.days_month) / 1000;
    const row = document.createElement("tr");
    row.append(textCell(item.name), textCell(`${number(item.watts, 0)} W`), textCell(`${number(item.hours_daily)} h/dia`), textCell(`${number(kwh)} kWh`), textCell(money(kwh * Number(item.tariff))), deleteCell("appliances", item.id, item.name));
    return row;
  });
  body.replaceChildren(...rows);
}

function renderReadings() {
  const body = document.querySelector("#reading-list");
  const recentBody = document.querySelector("#recent-readings");
  if (!readings.length) {
    emptyRow(body, 4, "Nenhuma leitura cadastrada.");
    emptyRow(recentBody, 3, "Nenhuma leitura cadastrada.");
    return;
  }
  const ordered = [...readings].sort((a, b) => a.reading_date.localeCompare(b.reading_date));
  const rows = ordered.map((item, index) => {
    let change = "Primeira leitura";
    if (index > 0) {
      const difference = Number(item.value_m3) - Number(ordered[index - 1].value_m3);
      change = difference >= 0 ? `${number(difference, 3)} m³` : "Verifique a leitura";
    }
    const row = document.createElement("tr");
    row.append(textCell(prettyDate(item.reading_date)), textCell(`${number(item.value_m3, 3)} m³`), textCell(change), deleteCell("water_readings", item.id, `leitura de ${prettyDate(item.reading_date)}`));
    return row;
  }).reverse();
  body.replaceChildren(...rows);
  const recentRows = rows.slice(0, 5).map(sourceRow => {
    const row = document.createElement("tr");
    row.append(sourceRow.cells[0].cloneNode(true), sourceRow.cells[1].cloneNode(true), sourceRow.cells[2].cloneNode(true));
    return row;
  });
  recentBody.replaceChildren(...recentRows);
}

function renderActivities() {
  const body = document.querySelector("#activity-list");
  if (!activities.length) return emptyRow(body, 5, "Nenhuma atividade registrada.");
  const rows = activities.map(item => {
    const liters = Number(item.liters_per_event) * Number(item.events_per_week) * 4.333;
    const row = document.createElement("tr");
    row.append(textCell(item.name), textCell(`${number(item.liters_per_event)} L`), textCell(`${number(item.events_per_week)} vezes`), textCell(`${number(liters)} L`), deleteCell("water_activities", item.id, item.name));
    return row;
  });
  body.replaceChildren(...rows);
}

function renderTips() {
  const list = document.querySelector("#community-list");
  if (!tips.length) {
    const empty = document.createElement("p");
    empty.className = "empty-cell";
    empty.textContent = "Ainda não há dicas. Seja a primeira pessoa a compartilhar uma prática.";
    list.replaceChildren(empty);
    return;
  }
  const entries = tips.map(tip => {
    const article = document.createElement("article");
    article.className = "community-tip";
    const content = document.createElement("p");
    content.textContent = tip.body;
    const byline = document.createElement("span");
    const author = tip.user_id === currentUser.id ? "Você" : "Comunidade";
    byline.textContent = `${author} · ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(tip.created_at))}`;
    article.append(content, byline);
    if (tip.user_id === currentUser.id) article.append(deleteCell("community_tips", tip.id, "sua dica"));
    return article;
  });
  list.replaceChildren(...entries);
}

function renderDashboard() {
  const energy = calculateEnergy();
  const water = calculateWater();
  document.querySelector("#total-cost").textContent = money(energy.cost + water.cost);
  document.querySelector("#dash-energy-cost").textContent = money(energy.cost);
  document.querySelector("#dash-water-cost").textContent = money(water.cost);
  document.querySelector("#dash-kwh").textContent = `${number(energy.kwh)} kWh`;
  document.querySelector("#dash-liters").textContent = `${number(water.liters, 0)} L`;
  document.querySelector("#dash-appliances").textContent = appliances.length ? `${appliances.length} aparelho(s) cadastrado(s)` : "Nenhum aparelho cadastrado";
  document.querySelector("#dash-water-source").textContent = activities.length ? "Estimativa baseada nas atividades" : "Registre suas atividades";
  document.querySelector("#activity-month-liters").textContent = `${number(water.liters, 0)} L`;
  document.querySelector("#activity-month-cost").textContent = money(water.cost);
}

function updateEnergyEstimate() {
  const watts = Number(document.querySelector("#device-watts").value) || 0;
  const hours = Number(document.querySelector("#device-hours").value) || 0;
  const days = Number(document.querySelector("#device-days").value) || 0;
  const tariff = Number(document.querySelector("#energy-tariff").value) || 0;
  const kwh = watts * hours * days / 1000;
  document.querySelector("#energy-estimate-kwh").textContent = `${number(kwh)} kWh`;
  document.querySelector("#energy-estimate-cost").textContent = money(kwh * tariff);
}

async function removeRecord(table, id, label) {
  if (!window.confirm(`Excluir ${label}? Essa ação não pode ser desfeita.`)) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return window.alert(`Não foi possível excluir: ${error.message}`);
  await loadData();
}

async function submitRecord(table, values, messageElement, form) {
  const { error } = await supabase.from(table).insert(values);
  if (error) {
    setMessage(messageElement, `Não foi possível salvar: ${error.message}`);
    return false;
  }
  form.reset();
  setMessage(messageElement, "Registro salvo.", true);
  await loadData();
  return true;
}

document.querySelector("#tab-login").addEventListener("click", () => setAuthMode("login"));
document.querySelector("#tab-signup").addEventListener("click", () => setAuthMode("signup"));
document.querySelector("#auth-kind").addEventListener("change", event => { document.querySelector("#profile-kind").textContent = event.target.value === "comercio" ? "Pequeno comércio" : "Residência"; });

authForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!supabase) return setMessage(authMessage, "Configure o Supabase em config.js antes de acessar.");
  const button = document.querySelector("#auth-submit");
  const form = new FormData(authForm);
  button.disabled = true;
  button.textContent = "Aguarde...";
  setMessage(authMessage, "");
  const email = String(form.get("email")).trim();
  const password = String(form.get("password"));
  let result;
  if (authMode === "signup") {
    result = await supabase.auth.signUp({ email, password, options: { data: { name: String(form.get("name")).trim(), kind: String(form.get("kind")) } } });
    if (!result.error && !result.data.session) {
      document.querySelector("#auth-password").value = "";
      setMessage(authMessage, "Conta criada. Confira seu e-mail para confirmar o cadastro.", true);
    }
  } else {
    result = await supabase.auth.signInWithPassword({ email, password });
  }
  if (result.error) setMessage(authMessage, result.error.message);
  if (result.data?.session) showApp(result.data.session.user);
  button.disabled = false;
  button.textContent = authMode === "signup" ? "Criar minha conta" : "Entrar na minha conta";
});

document.querySelector("#reset-password").addEventListener("click", async () => {
  if (!supabase) return setMessage(authMessage, "Configure o Supabase em config.js antes de acessar.");
  const email = document.querySelector("#auth-email").value.trim();
  if (!email) return setMessage(authMessage, "Informe seu e-mail acima para receber o link de redefinição.");
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.href.split("#")[0] });
  setMessage(authMessage, error ? error.message : "Se houver uma conta para este e-mail, enviaremos um link de redefinição.", !error);
});

document.querySelector("#signout").addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) window.alert(`Não foi possível sair: ${error.message}`);
  showAuth();
});

document.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => {
  const page = button.dataset.page;
  document.querySelectorAll(".page").forEach(item => item.classList.toggle("active", item.id === `page-${page}`));
  document.querySelectorAll("[data-page]").forEach(item => item.classList.toggle("active", item.dataset.page === page));
  window.scrollTo({ top: 0, behavior: "smooth" });
}));

document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", event => {
  event.preventDefault();
  const page = button.dataset.go;
  document.querySelectorAll(".page").forEach(item => item.classList.toggle("active", item.id === `page-${page}`));
  document.querySelectorAll("[data-page]").forEach(item => item.classList.toggle("active", item.dataset.page === page));
  window.scrollTo({ top: 0, behavior: "smooth" });
}));

const devicePresets = {
  "Chuveiro elétrico": [5500, 0.5], Geladeira: [250, 24], "Ar-condicionado": [1200, 8], Televisão: [120, 5], "Máquina de lavar": [500, 1], "Freezer comercial": [400, 12], Lâmpadas: [10, 5]
};
document.querySelector("#device-name").addEventListener("change", event => {
  const preset = devicePresets[event.target.value];
  document.querySelector("#custom-device").closest(".custom-device-wrap").hidden = event.target.value !== "outro";
  if (preset) {
    document.querySelector("#device-watts").value = preset[0];
    document.querySelector("#device-hours").value = preset[1];
  }
  updateEnergyEstimate();
});
document.querySelectorAll("#device-watts,#device-hours,#device-days,#energy-tariff").forEach(input => input.addEventListener("input", updateEnergyEstimate));

document.querySelector("#appliance-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const selectValue = document.querySelector("#device-name").value;
  const name = selectValue === "outro" ? document.querySelector("#custom-device").value.trim() : selectValue;
  if (!name) return setMessage(document.querySelector("#appliance-message"), "Escolha um aparelho ou informe o nome personalizado.");
  const values = { name, watts: Number(document.querySelector("#device-watts").value), hours_daily: Number(document.querySelector("#device-hours").value), days_month: Number(document.querySelector("#device-days").value), tariff: Number(document.querySelector("#energy-tariff").value) };
  if (await submitRecord("appliances", values, document.querySelector("#appliance-message"), form)) updateEnergyEstimate();
});

document.querySelector("#activity-type").addEventListener("change", event => {
  const type = event.target.value;
  const preset = activityPresets[type];
  const isBath = type === "banho";
  const isCustom = type === "outros";
  document.querySelector("#activity-amount").value = preset.amount;
  document.querySelector("label[for='activity-amount']").textContent = preset.label;
  document.querySelector("#activity-hint").textContent = preset.hint;
  document.querySelector("#bath-details").hidden = !isBath;
  document.querySelector("#bath-minutes").disabled = !isBath;
  document.querySelector("#bath-people").disabled = !isBath;
  document.querySelector("label[for='activity-count']").textContent = isBath ? "Banhos por semana, por pessoa" : "Repetições por semana";
  document.querySelector("#custom-activity-wrap").hidden = !isCustom;
  document.querySelector("#custom-activity").required = isCustom;
});

document.querySelector("#activity-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const type = document.querySelector("#activity-type").value;
  const preset = activityPresets[type];
  const baseAmount = Number(document.querySelector("#activity-amount").value);
  const eventLiters = type === "banho"
    ? baseAmount * Number(document.querySelector("#bath-minutes").value) * Number(document.querySelector("#bath-people").value)
    : baseAmount;
  const values = {
    name: type === "outros" ? document.querySelector("#custom-activity").value.trim() : document.querySelector("#activity-type option:checked").textContent,
    liters_per_event: eventLiters,
    events_per_week: Number(document.querySelector("#activity-count").value),
    tariff: Number(document.querySelector("#activity-tariff").value),
    start_date: document.querySelector("#activity-date").value
  };
  if (!await submitRecord("water_activities", values, document.querySelector("#activity-message"), form)) return;
  document.querySelector("#activity-date").value = localDateValue();
  document.querySelector("#activity-amount").value = activityPresets.banho.amount;
  document.querySelector("#activity-count").value = 7;
  document.querySelector("#bath-minutes").value = 10;
  document.querySelector("#bath-people").value = 1;
  document.querySelector("#activity-type").value = "banho";
  document.querySelector("label[for='activity-amount']").textContent = activityPresets.banho.label;
  document.querySelector("#activity-hint").textContent = activityPresets.banho.hint;
  document.querySelector("label[for='activity-count']").textContent = "Banhos por semana, por pessoa";
  document.querySelector("#bath-details").hidden = false;
  document.querySelector("#bath-minutes").disabled = false;
  document.querySelector("#bath-people").disabled = false;
  document.querySelector("#custom-activity-wrap").hidden = true;
  document.querySelector("#custom-activity").required = false;
});

document.querySelector("#reading-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = { reading_date: document.querySelector("#reading-date").value, value_m3: Number(document.querySelector("#reading-value").value) };
  const previous = readings.filter(item => item.reading_date < values.reading_date).sort((a, b) => b.reading_date.localeCompare(a.reading_date))[0];
  const next = readings.filter(item => item.reading_date > values.reading_date).sort((a, b) => a.reading_date.localeCompare(b.reading_date))[0];
  if (previous && values.value_m3 < Number(previous.value_m3) || next && values.value_m3 > Number(next.value_m3)) {
    return setMessage(document.querySelector("#reading-message"), "Confira a leitura: ela precisa ser compatível com as datas anteriores e seguintes.");
  }
  await submitRecord("water_readings", values, document.querySelector("#reading-message"), form);
  document.querySelector("#reading-date").value = localDateValue();
});

document.querySelector("#tip-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  await submitRecord("community_tips", { body: document.querySelector("#tip-text").value.trim() }, document.querySelector("#tip-message"), form);
});

document.querySelector("#activity-date").value = localDateValue();
document.querySelector("#reading-date").value = localDateValue();
document.querySelector("#setup-notice").hidden = configured;
document.querySelector("#auth-submit").disabled = !configured;
document.querySelector("#reset-password").disabled = !configured;

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) showApp(session.user);
    else showAuth();
  });
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) setMessage(authMessage, error.message);
    if (data?.session?.user) showApp(data.session.user);
  });
}