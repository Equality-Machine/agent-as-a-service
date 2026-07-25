const state = {
  agents: [],
  selectedAgent: null,
  conversationId: null,
  busy: false,
  sessions: [],
};

const $ = (selector) => document.querySelector(selector);
const agentList = $("#agent-list");
const messages = $("#messages");
const composer = $("#composer");
const messageInput = $("#message-input");

async function api(path, options = {}) {
  const token = sessionStorage.getItem("aaas_admin_token");
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = response.headers.get("content-type")?.includes("json")
    ? await response.json()
    : await response.text();
  if (!response.ok) throw new Error(body.error?.message ?? body ?? `HTTP ${response.status}`);
  return body;
}

function providerLabel(provider) {
  return provider === "codex" ? "CX" : provider === "claude" ? "CL" : "AI";
}

async function loadAgents(selectId) {
  state.agents = await api("/api/agents");
  agentList.replaceChildren();
  if (!state.agents.length) {
    const empty = document.createElement("div");
    empty.className = "loading-row";
    empty.textContent = "No agents published yet.";
    agentList.append(empty);
    return;
  }
  for (const agent of state.agents) {
    const button = document.createElement("button");
    button.className = "agent-row";
    button.dataset.id = agent.id;
    button.innerHTML = `
      <span class="agent-avatar">${providerLabel(agent.provider)}</span>
      <span><strong></strong><small>${agent.provider} · ${agent.placement}</small></span>`;
    button.querySelector("strong").textContent = agent.name;
    button.addEventListener("click", () => selectAgent(agent));
    agentList.append(button);
  }
  const target = state.agents.find((agent) => agent.id === selectId) ?? state.agents[0];
  selectAgent(target);
}

function selectAgent(agent) {
  state.selectedAgent = agent;
  state.conversationId = null;
  document.querySelectorAll(".agent-row").forEach((row) => {
    row.classList.toggle("active", row.dataset.id === agent.id);
  });
  $("#agent-provider").textContent = `${agent.provider} · ${agent.placement} runner`;
  $("#agent-name").textContent = agent.name;
  $("#agent-description").textContent =
    agent.description || "A published, immutable source-session version.";
  $("#skill-download").href = `/v1/agents/${agent.id}/skill`;
  $("#skill-download").classList.remove("hidden");
  messageInput.disabled = false;
  $("#send-message").disabled = false;
  $("#new-chat").disabled = false;
  $("#end-chat").disabled = true;
  resetMessages();
  updateConversationLabel();
  messageInput.focus();
}

function resetMessages() {
  messages.innerHTML = `
    <div class="empty-state">
      <div class="fork-visual" aria-hidden="true"><span></span><span></span><span></span></div>
      <h2>Ready for a clean fork</h2>
      <p>Your first message creates a new conversation. Follow-ups continue only in that fork.</p>
    </div>`;
}

function addMessage(role, text, pending = false) {
  messages.querySelector(".empty-state")?.remove();
  const item = document.createElement("article");
  item.className = `message ${role}${pending ? " pending" : ""}`;
  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "user" ? "YOU" : providerLabel(state.selectedAgent?.provider);
  const body = document.createElement("div");
  body.className = "message-body";
  body.textContent = text;
  item.append(avatar, body);
  messages.append(item);
  messages.scrollTop = messages.scrollHeight;
  return item;
}

function updateConversationLabel() {
  $("#conversation-label").textContent = state.conversationId
    ? `Conversation ${state.conversationId.slice(0, 8)} · isolated fork`
    : "A new fork will start on first message";
}

composer.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = messageInput.value.trim();
  if (!input || !state.selectedAgent || state.busy) return;
  state.busy = true;
  messageInput.value = "";
  messageInput.disabled = true;
  $("#send-message").disabled = true;
  addMessage("user", input);
  const pending = addMessage("assistant", "Working on this fork…", true);
  try {
    const response = await api("/v1/responses", {
      method: "POST",
      body: JSON.stringify(
        state.conversationId
          ? { conversation: state.conversationId, input }
          : { agent: state.selectedAgent.id, input },
      ),
    });
    state.conversationId = response.conversation_id;
    pending.classList.remove("pending");
    pending.querySelector(".message-body").textContent = response.output[0].text;
    $("#end-chat").disabled = false;
    updateConversationLabel();
  } catch (error) {
    pending.classList.remove("pending");
    pending.querySelector(".message-body").textContent = `Request failed: ${error.message}`;
  } finally {
    state.busy = false;
    messageInput.disabled = false;
    $("#send-message").disabled = false;
    messageInput.focus();
  }
});

$("#new-chat").addEventListener("click", () => {
  state.conversationId = null;
  resetMessages();
  updateConversationLabel();
  $("#end-chat").disabled = true;
});

$("#end-chat").addEventListener("click", async () => {
  if (!state.conversationId || state.busy) return;
  await api(`/v1/conversations/${state.conversationId}/close`, { method: "POST" });
  addMessage("assistant", "This conversation has ended. Start a new chat for another clean fork.");
  state.conversationId = null;
  $("#end-chat").disabled = true;
  updateConversationLabel();
});

async function loadSessions() {
  const provider = $("#publish-provider").value;
  $("#session-list").innerHTML = '<div class="loading-row">Loading sessions…</div>';
  try {
    state.sessions = await api(`/api/sources?provider=${provider}&limit=40`);
    renderSessions();
  } catch (error) {
    $("#session-list").innerHTML = `<div class="loading-row">${error.message}</div>`;
  }
}

function renderSessions() {
  const list = $("#session-list");
  list.replaceChildren();
  if (!state.sessions.length) {
    list.innerHTML = '<div class="loading-row">No sessions found on this runner.</div>';
    return;
  }
  for (const session of state.sessions) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "session-row";
    row.dataset.id = session.sessionId;
    row.innerHTML = "<strong></strong><span></span>";
    row.querySelector("strong").textContent = session.preview || session.sessionId;
    row.querySelector("span").textContent = `${session.cwd} · ${new Date(session.updatedAt).toLocaleString()}`;
    row.addEventListener("click", () => {
      document.querySelectorAll(".session-row").forEach((item) => item.classList.remove("active"));
      row.classList.add("active");
      $("#selected-session").value = session.sessionId;
    });
    list.append(row);
  }
}

$("#publish-open").addEventListener("click", () => {
  $("#publish-admin-token").value = sessionStorage.getItem("aaas_admin_token") ?? "";
  $("#publish-dialog").showModal();
  loadSessions();
});
for (const id of ["publish-close", "publish-cancel"]) {
  $(`#${id}`).addEventListener("click", () => $("#publish-dialog").close());
}
$("#publish-provider").addEventListener("change", () => {
  $("#selected-session").value = "";
  loadSessions();
});
$("#refresh-sessions").addEventListener("click", loadSessions);
$("#publish-placement").addEventListener("change", (event) => {
  $("#runner-url-field").classList.toggle("hidden", event.target.value !== "remote");
});

$("#publish-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const adminToken = $("#publish-admin-token").value.trim();
  if (adminToken) sessionStorage.setItem("aaas_admin_token", adminToken);
  const selected = state.sessions.find(
    (session) => session.sessionId === $("#selected-session").value,
  );
  const errorBox = $("#publish-error");
  if (!selected) {
    errorBox.textContent = "Select a source session.";
    errorBox.classList.remove("hidden");
    return;
  }
  try {
    const placement = $("#publish-placement").value;
    const agent = await api("/api/agents", {
      method: "POST",
      body: JSON.stringify({
        name: $("#publish-name").value,
        description: $("#publish-description").value,
        provider: $("#publish-provider").value,
        sourceSessionId: selected.sessionId,
        sourceSessionPath: selected.path,
        cwd: selected.cwd,
        placement,
        ...(placement === "remote" ? { runnerUrl: $("#publish-runner-url").value } : {}),
      }),
    });
    $("#publish-dialog").close();
    event.target.reset();
    errorBox.classList.add("hidden");
    await loadAgents(agent.id);
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.classList.remove("hidden");
  }
});

$("#refresh-agents").addEventListener("click", () => loadAgents(state.selectedAgent?.id));
loadAgents();
