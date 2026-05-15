#[test]
fn macro_compile_failures_are_reported() {
    let tests = trybuild::TestCases::new();

    tests.compile_fail("tests/ui/component_requires_template.rs");
    tests.compile_fail("tests/ui/inject_requires_named_field.rs");
    tests.compile_fail("tests/ui/inject_rejects_plain_string.rs");
    tests.compile_fail("tests/ui/wasm_bridge_rejects_generic_return.rs");
}
