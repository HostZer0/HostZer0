(function () {
  "use strict";

  const DEBUG = true;
  const DEFAULT_API_URL =
    "https://script.google.com/macros/s/AKfycbzFSARPV3sntTs5oEglXayFovfzdD2cHvJYC8o2ywH4ITV6JUzJ0HRevkLgMJckmTLi/exec";

  const config = {
    API_URL:
      window.CONTAD_API_URL ||
      document.querySelector('meta[name="contad-api-url"]')?.content ||
      DEFAULT_API_URL,
    TOKEN_KEY: "contad_token_v1",
    USER_KEY: "contad_user_v1",
    DEBUG,
  };

  function debugLog(label, data) {
    if (!config.DEBUG) return;
    console.log(`[CONTAD API] ${label}`, data);
  }

  function getToken() {
    return localStorage.getItem(config.TOKEN_KEY);
  }

  async function request(action, body) {

    debugLog("request", {
      url: config.API_URL,
      action,
      payload: body.payload || body,
    });

    let response;
    try {
      response = await fetch(config.API_URL, {
        method: "POST",
        body: JSON.stringify(body),
        redirect: "follow",
      });
    } catch (error) {
      debugLog("network-error", { action, error });
      return { ok: false, error: `Falha de rede: ${error.message}` };
    }

    debugLog("response-status", {
      action,
      status: response.status,
      ok: response.ok,
    });

    let json;
    try {
      json = await response.json();
    } catch (error) {
      debugLog("json-error", { action, error });
      return { ok: false, error: "Resposta invalida do servidor." };
    }

    debugLog("response-json", { action, json });

    if (!response.ok) {
      return {
        ok: false,
        error: json?.error || `Erro HTTP ${response.status}`,
      };
    }

    if (json && json.needsLogin) {
      localStorage.removeItem(config.TOKEN_KEY);
      localStorage.removeItem(config.USER_KEY);
    }

    return json;
  }

  function call(action, payload) {
    const token = getToken();
    const body = { action, payload: payload || {} };
    if (token && action !== "login") {
      body.token = token;
      body.payload = Object.assign({}, body.payload, { token });
    }
    return request(action, body);
  }

  function callLegacy(action, payload) {
    const token = getToken();
    const body = Object.assign({ action }, payload || {});
    if (token && action !== "login") body.token = token;
    return request(action, body);
  }

  window.CONTAD_API_CONFIG = config;
  window.CONTAD_API = {
    call,
    login(email, senha) {
      return callLegacy("login", { email, senha });
    },
    logout() {
      return callLegacy("logout");
    },
    bootstrap() {
      return callLegacy("bootstrap");
    },
    list(table) {
      return callLegacy("list", { table });
    },
    insert(table, row) {
      return callLegacy("insert", { table, row });
    },
    update(table, id, changes) {
      return callLegacy("update", { table, id, changes });
    },
    remove(table, id) {
      return callLegacy("delete", { table, id });
    },
    auditLog(filters) {
      return callLegacy("audit_log", { filters });
    },
    listUsers() {
      return callLegacy("list_users");
    },
    createUser(userData) {
      return callLegacy("create_user", { userData });
    },
    updateUser(userId, changes) {
      return callLegacy("update_user", { userId, changes });
    },
    resetPassword(userId, newPassword) {
      return callLegacy("reset_password", { userId, newPassword });
    },
    changeMyPassword(oldPassword, newPassword) {
      return callLegacy("change_my_password", { oldPassword, newPassword });
    },
    listarEmpresas() {
      return call("listarEmpresas", {});
    },
    cadastrarEmpresa(dados) {
      return call("cadastrarEmpresa", dados);
    },
    editarEmpresa(id, dados) {
      return call("editarEmpresa", Object.assign({ id }, dados || {}));
    },
    excluirEmpresa(id) {
      return call("excluirEmpresa", { id });
    },
  };
})();
