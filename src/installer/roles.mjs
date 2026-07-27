const INSTALL_ROLES = {
  consumer: {
    role: "consumer",
    installClients: true,
    installRunner: false,
    runnerKind: null,
  },
  publisher: {
    role: "publisher",
    installClients: true,
    installRunner: true,
    runnerKind: "local",
  },
  runner: {
    role: "runner",
    installClients: false,
    installRunner: true,
    runnerKind: "cloud",
  },
};

export function resolveInstallRole(role = "consumer") {
  const plan = INSTALL_ROLES[role];
  if (!plan) {
    throw new Error("--role must be consumer, publisher, or runner");
  }
  return { ...plan };
}
