function providerRegistration(register) {
    return { kind: "provider-registration", register };
}
function isProviderRegistrationCommand(value) {
    return (typeof value === "object" &&
        value !== null &&
        Reflect.get(value, "kind") === "provider-registration");
}

export { isProviderRegistrationCommand, providerRegistration };
