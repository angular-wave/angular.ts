const module = angular.module("rustDemo", []);
const registeredRegistrationNames = new Set();

for (const runtimeRegistration of runtimeRegistrations.values()) {
  const buildRegistration = buildRegistrationOverrides.get(runtimeRegistration.name) || {};
  registerRegistration(mergeRegistration(runtimeRegistration, buildRegistration));
  registeredRegistrationNames.add(runtimeRegistration.name);
}

for (const buildRegistration of buildRegistrationOverrides.values()) {
  if (!registeredRegistrationNames.has(buildRegistration.name)) {
    registerRegistration(mergeRegistration({}, buildRegistration));
  }
}

angular.bootstrap(document.body, ["rustDemo"]);
