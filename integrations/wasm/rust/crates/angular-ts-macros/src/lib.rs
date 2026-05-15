use proc_macro::TokenStream;
use proc_macro2::Span;
use quote::{format_ident, quote};
use syn::parse::{Parse, ParseStream};
use syn::{
    parse_macro_input, parse_quote, Attribute, Error, Field, Fields, FnArg, GenericArgument, Ident,
    ImplItem, ImplItemFn, Item, ItemFn, ItemImpl, ItemStruct, LitStr, PathArguments, Result,
    ReturnType, Token, Type, Visibility,
};

struct KeyValueArgs {
    pairs: Vec<(Ident, LitStr)>,
}

impl Parse for KeyValueArgs {
    fn parse(input: ParseStream<'_>) -> Result<Self> {
        let mut pairs = Vec::new();

        while !input.is_empty() {
            let key: Ident = input.parse()?;
            input.parse::<Token![=]>()?;
            let value: LitStr = input.parse()?;
            pairs.push((key, value));

            if input.is_empty() {
                break;
            }

            input.parse::<Token![,]>()?;
        }

        Ok(Self { pairs })
    }
}

fn get_required(args: &KeyValueArgs, name: &str) -> Result<LitStr> {
    args.pairs
        .iter()
        .find_map(|(key, value)| (key == name).then(|| value.clone()))
        .ok_or_else(|| Error::new(Span::call_site(), format!("missing `{name}` argument")))
}

fn get_optional(args: &KeyValueArgs, name: &str) -> Option<LitStr> {
    args.pairs
        .iter()
        .find_map(|(key, value)| (key == name).then(|| value.clone()))
}

fn reject_unknown(args: &KeyValueArgs, allowed: &[&str]) -> Result<()> {
    for (key, _) in &args.pairs {
        if !allowed.iter().any(|allowed| key == allowed) {
            return Err(Error::new_spanned(
                key,
                format!("unsupported argument `{key}`"),
            ));
        }
    }

    Ok(())
}

fn lower_camel(ident: &Ident) -> String {
    let name = ident.to_string();
    let mut chars = name.chars();

    match chars.next() {
        Some(first) => first.to_lowercase().chain(chars).collect(),
        None => name,
    }
}

fn component_name(selector: &LitStr) -> LitStr {
    let span = selector.span();
    let selector = selector.value();
    let mut name = String::new();

    for (index, part) in selector
        .split('-')
        .filter(|part| !part.is_empty())
        .enumerate()
    {
        if index == 0 {
            name.push_str(part);
            continue;
        }

        let mut chars = part.chars();
        if let Some(first) = chars.next() {
            name.extend(first.to_uppercase());
            name.extend(chars);
        }
    }

    LitStr::new(&name, span)
}

fn export_name(prefix: &str, ident: &Ident) -> LitStr {
    LitStr::new(&format!("__ng_{prefix}_{ident}"), Span::call_site())
}

fn assert_public(vis: &Visibility, item: &Ident, kind: &str) -> Result<()> {
    if matches!(vis, Visibility::Public(_)) {
        return Ok(());
    }

    Err(Error::new_spanned(
        item,
        format!("AngularTS {kind} `{item}` must be public"),
    ))
}

/// Marks a Rust function as an AngularTS module declaration.
///
#[proc_macro_attribute]
pub fn angular_module(attr: TokenStream, item: TokenStream) -> TokenStream {
    let args = parse_macro_input!(attr as KeyValueArgs);
    let input = parse_macro_input!(item as ItemFn);

    match expand_angular_module(args, input) {
        Ok(tokens) => tokens.into(),
        Err(error) => error.to_compile_error().into(),
    }
}

/// Marks a Rust struct as an AngularTS component controller.
#[proc_macro_attribute]
pub fn component(attr: TokenStream, item: TokenStream) -> TokenStream {
    let args = parse_macro_input!(attr as KeyValueArgs);
    let input = parse_macro_input!(item as ItemStruct);

    match expand_component(args, input) {
        Ok(tokens) => tokens.into(),
        Err(error) => error.to_compile_error().into(),
    }
}

/// Marks a Rust type as an AngularTS service.
#[proc_macro_attribute]
pub fn service(attr: TokenStream, item: TokenStream) -> TokenStream {
    let args = parse_macro_input!(attr as KeyValueArgs);
    let input = parse_macro_input!(item as ItemStruct);

    match expand_service(args, input) {
        Ok(tokens) => tokens.into(),
        Err(error) => error.to_compile_error().into(),
    }
}

/// Marks a method as the component `$onInit` lifecycle hook.
#[proc_macro_attribute]
pub fn on_init(_attr: TokenStream, item: TokenStream) -> TokenStream {
    item
}

/// Marks a method as the component `$onDestroy` lifecycle hook.
#[proc_macro_attribute]
pub fn on_destroy(_attr: TokenStream, item: TokenStream) -> TokenStream {
    item
}

/// Generates wasm-bindgen exports for a Rust-authored bridge struct or impl.
#[proc_macro_attribute]
pub fn wasm_bridge(attr: TokenStream, item: TokenStream) -> TokenStream {
    let args = parse_macro_input!(attr as KeyValueArgs);
    let input = parse_macro_input!(item as Item);

    match expand_wasm_bridge(args, input) {
        Ok(tokens) => tokens.into(),
        Err(error) => error.to_compile_error().into(),
    }
}

fn expand_angular_module(args: KeyValueArgs, input: ItemFn) -> Result<proc_macro2::TokenStream> {
    reject_unknown(&args, &["name"])?;
    let name = get_required(&args, "name")?;
    assert_public(&input.vis, &input.sig.ident, "module")?;

    let function_name = &input.sig.ident;
    let const_name = format_ident!(
        "__ANGULAR_TS_MODULE_{}",
        function_name.to_string().to_uppercase()
    );
    let collect_name = format_ident!("__ng_collect_{}", function_name);

    Ok(quote! {
        #input

        #[allow(non_upper_case_globals)]
        pub const #const_name: &str = #name;

        pub fn #collect_name() -> ::angular_ts::NgModule {
            let mut module = ::angular_ts::NgModule::new(#name);
            #function_name(&mut module);
            module
        }

        #[cfg(target_arch = "wasm32")]
        #[wasm_bindgen::prelude::wasm_bindgen(js_name = __ng_manifest)]
        pub fn __ng_manifest() -> String {
            let module = #collect_name();
            ::angular_ts::module_manifest_json(&module)
        }
    })
}

fn expand_component(args: KeyValueArgs, mut input: ItemStruct) -> Result<proc_macro2::TokenStream> {
    reject_unknown(
        &args,
        &["selector", "name", "template", "template_url", "export"],
    )?;
    assert_public(&input.vis, &input.ident, "component")?;

    let selector = get_required(&args, "selector")?;
    let name = get_optional(&args, "name").unwrap_or_else(|| component_name(&selector));
    let inline_template = get_optional(&args, "template");
    let template_url = get_optional(&args, "template_url");
    let ident = input.ident.clone();
    let injections = collect_injections(&input)?;
    let export_name =
        get_optional(&args, "export").unwrap_or_else(|| export_name("component", &ident));

    strip_field_attribute(&mut input, "inject");

    let template = match (inline_template, template_url) {
        (Some(template), None) => quote! {
            ::angular_ts::ComponentMetadata::inline_with_injections(#selector, #template, &[#(#injections),*])
        },
        (None, Some(template_url)) => quote! {
            ::angular_ts::ComponentMetadata::template_url_with_injections(#selector, #template_url, &[#(#injections),*])
        },
        (Some(_), Some(_)) => {
            return Err(Error::new(
                Span::call_site(),
                "`component` accepts either `template` or `template_url`, not both",
            ));
        }
        (None, None) => {
            return Err(Error::new(
                Span::call_site(),
                "`component` requires `template` or `template_url`",
            ));
        }
    };

    Ok(quote! {
        #input

        impl ::angular_ts::ComponentController for #ident {
            const NAME: &'static str = #name;
            const METADATA: ::angular_ts::ComponentMetadata = #template;
            const EXPORT_NAME: &'static str = #export_name;
        }
    })
}

fn expand_wasm_bridge(args: KeyValueArgs, input: Item) -> Result<proc_macro2::TokenStream> {
    reject_unknown(
        &args,
        &["export", "component", "controller", "service", "value"],
    )?;
    let export = wasm_bridge_export(&args)?;

    match input {
        Item::Struct(mut item) => {
            let field_metadata = export
                .as_deref()
                .map(|export| wasm_bridge_field_metadata_function(export, &mut item))
                .transpose()?;
            let attr = wasm_struct_attribute(export.as_deref());
            item.attrs.push(attr);
            add_wasm_field_attributes(&mut item)?;
            Ok(quote! {
                #item
                #field_metadata
            })
        }
        Item::Impl(mut item) => {
            validate_wasm_bridge_impl(&item)?;
            let attr = wasm_impl_attribute(export.as_deref());
            let bridge_metadata = export
                .as_deref()
                .map(|export| wasm_bridge_metadata_function(export, &item))
                .transpose()?;

            item.attrs.push(attr);
            add_wasm_method_attributes(&mut item)?;
            Ok(quote! {
                #item
                #bridge_metadata
            })
        }
        Item::Fn(mut item) => {
            validate_wasm_bridge_function(&item)?;
            let attr = wasm_function_attribute(export.as_deref());
            item.attrs.push(attr);
            Ok(quote! { #item })
        }
        other => Err(Error::new_spanned(
            other,
            "`#[wasm_bridge]` supports structs, functions, and inherent impl blocks",
        )),
    }
}

fn validate_wasm_bridge_impl(input: &ItemImpl) -> Result<()> {
    if !input.generics.params.is_empty() {
        return Err(Error::new_spanned(
            &input.generics,
            "`#[wasm_bridge]` impl blocks must not be generic",
        ));
    }

    for item in &input.items {
        let ImplItem::Fn(function) = item else {
            continue;
        };

        if matches!(function.vis, Visibility::Public(_)) {
            validate_wasm_bridge_method(function)?;
        }
    }

    Ok(())
}

fn validate_wasm_bridge_function(input: &ItemFn) -> Result<()> {
    if !input.sig.generics.params.is_empty() {
        return Err(Error::new_spanned(
            &input.sig.generics,
            "`#[wasm_bridge]` functions must not be generic",
        ));
    }

    if input.sig.asyncness.is_some() {
        return Err(Error::new_spanned(
            input.sig.asyncness,
            "`#[wasm_bridge]` does not support async functions yet; expose a synchronous method that starts the async work and refreshes scope when it completes",
        ));
    }

    for arg in &input.sig.inputs {
        validate_wasm_bridge_fn_arg(arg)?;
    }

    validate_wasm_bridge_return(&input.sig.output)
}

fn validate_wasm_bridge_method(function: &ImplItemFn) -> Result<()> {
    if !function.sig.generics.params.is_empty() {
        return Err(Error::new_spanned(
            &function.sig.generics,
            "`#[wasm_bridge]` public methods must not be generic",
        ));
    }

    for arg in &function.sig.inputs {
        validate_wasm_bridge_fn_arg(arg)?;
    }

    validate_wasm_bridge_return(&function.sig.output)
}

fn validate_wasm_bridge_fn_arg(arg: &FnArg) -> Result<()> {
    match arg {
        FnArg::Receiver(_) => Ok(()),
        FnArg::Typed(arg) => validate_wasm_bridge_type(&arg.ty, BridgeTypePosition::Argument),
    }
}

fn validate_wasm_bridge_return(output: &ReturnType) -> Result<()> {
    match output {
        ReturnType::Default => Ok(()),
        ReturnType::Type(_, ty) => validate_wasm_bridge_type(ty, BridgeTypePosition::Return),
    }
}

#[derive(Clone, Copy)]
enum BridgeTypePosition {
    Argument,
    Return,
}

fn validate_wasm_bridge_type(ty: &Type, position: BridgeTypePosition) -> Result<()> {
    match ty {
        Type::Path(path) => validate_wasm_bridge_path_type(ty, path),
        Type::Reference(reference) => validate_wasm_bridge_reference_type(ty, reference, position),
        Type::Tuple(tuple) if tuple.elems.is_empty() => Ok(()),
        _ => Err(unsupported_wasm_bridge_type(ty)),
    }
}

fn validate_wasm_bridge_path_type(ty: &Type, path: &syn::TypePath) -> Result<()> {
    for segment in &path.path.segments {
        if !matches!(segment.arguments, PathArguments::None) {
            return Err(Error::new_spanned(
                ty,
                format!(
                    "`#[wasm_bridge]` public signatures do not support generic Rust type `{}`; use a concrete bridge type, `String`, `JsValue`, or `js_sys::Array`",
                    type_string(ty)
                ),
            ));
        }
    }

    Ok(())
}

fn validate_wasm_bridge_reference_type(
    ty: &Type,
    reference: &syn::TypeReference,
    position: BridgeTypePosition,
) -> Result<()> {
    if reference.mutability.is_some() {
        return Err(Error::new_spanned(
            ty,
            "`#[wasm_bridge]` public signatures do not support mutable reference types",
        ));
    }

    if matches!(position, BridgeTypePosition::Argument) && is_str_type(&reference.elem) {
        return Ok(());
    }

    Err(unsupported_wasm_bridge_type(ty))
}

fn unsupported_wasm_bridge_type(ty: &Type) -> Error {
    Error::new_spanned(
        ty,
        format!(
            "`#[wasm_bridge]` public signatures cannot expose Rust type `{}` to AngularTS; use primitives, `String`, `JsValue`, `js_sys::Array`, or another bridge struct",
            type_string(ty)
        ),
    )
}

fn is_str_type(ty: &Type) -> bool {
    let Type::Path(path) = ty else {
        return false;
    };

    path.path
        .segments
        .last()
        .is_some_and(|segment| segment.ident == "str")
}

fn wasm_bridge_export(args: &KeyValueArgs) -> Result<Option<String>> {
    let exports = [
        get_optional(args, "export").map(|value| value.value()),
        get_optional(args, "component").map(|value| format!("__ng_component_{}", value.value())),
        get_optional(args, "controller").map(|value| format!("__ng_controller_{}", value.value())),
        get_optional(args, "service").map(|value| format!("__ng_service_{}", value.value())),
        get_optional(args, "value").map(|value| format!("__ng_value_{}", value.value())),
    ];
    let mut exports = exports.into_iter().flatten();
    let first = exports.next();

    if exports.next().is_some() {
        return Err(Error::new(
            Span::call_site(),
            "`#[wasm_bridge]` accepts only one of `export`, `component`, `controller`, `service`, or `value`",
        ));
    }

    Ok(first)
}

fn wasm_struct_attribute(export: Option<&str>) -> Attribute {
    match export {
        Some(export) => {
            let export = format_ident!("{export}");
            parse_quote! {
                #[cfg_attr(target_arch = "wasm32", wasm_bindgen::prelude::wasm_bindgen(getter_with_clone, js_name = #export))]
            }
        }
        None => {
            parse_quote! {
                #[cfg_attr(target_arch = "wasm32", wasm_bindgen::prelude::wasm_bindgen(getter_with_clone))]
            }
        }
    }
}

fn wasm_impl_attribute(export: Option<&str>) -> Attribute {
    match export {
        Some(export) => {
            let export = format_ident!("{export}");
            parse_quote! {
                #[cfg_attr(target_arch = "wasm32", wasm_bindgen::prelude::wasm_bindgen(js_class = #export))]
            }
        }
        None => {
            parse_quote! {
                #[cfg_attr(target_arch = "wasm32", wasm_bindgen::prelude::wasm_bindgen)]
            }
        }
    }
}

fn wasm_function_attribute(export: Option<&str>) -> Attribute {
    match export {
        Some(export) => {
            let export = format_ident!("{export}");
            parse_quote! {
                #[cfg_attr(target_arch = "wasm32", wasm_bindgen::prelude::wasm_bindgen(js_name = #export))]
            }
        }
        None => {
            parse_quote! {
                #[cfg_attr(target_arch = "wasm32", wasm_bindgen::prelude::wasm_bindgen)]
            }
        }
    }
}

fn wasm_bridge_metadata_function(
    export: &str,
    input: &ItemImpl,
) -> Result<proc_macro2::TokenStream> {
    let mut sync_properties = Vec::new();
    let mut methods = Vec::new();
    let mut scope_update_bind = None;
    let mut scope_update_unbind = None;
    let mut scope_update_routes = Vec::new();

    for item in &input.items {
        let ImplItem::Fn(function) = item else {
            continue;
        };

        let rust_name = function.sig.ident.to_string();
        let js_name = snake_to_lower_camel(&rust_name);
        let binds_scope_updates = has_method_attribute(function, "scope_update_bind");
        let unbinds_scope_updates = has_method_attribute(function, "scope_update_unbind");
        let scope_update_path = scope_update_path(function)?;

        if binds_scope_updates && unbinds_scope_updates {
            return Err(Error::new_spanned(
                function,
                "`scope_update_bind` and `scope_update_unbind` must be on separate methods",
            ));
        }

        if let Some(path) = scope_update_path {
            validate_scope_update_route_method(function)?;

            if !matches!(function.vis, Visibility::Public(_)) {
                return Err(Error::new_spanned(
                    function,
                    "scope update route methods must be public",
                ));
            }

            scope_update_routes.push(ScopeUpdateRoute {
                path,
                method: js_name,
            });

            continue;
        }

        if binds_scope_updates || unbinds_scope_updates {
            validate_scope_update_lifecycle_method(function)?;

            if !matches!(function.vis, Visibility::Public(_)) {
                return Err(Error::new_spanned(
                    function,
                    "scope update lifecycle methods must be public",
                ));
            }

            let slot = if binds_scope_updates {
                &mut scope_update_bind
            } else {
                &mut scope_update_unbind
            };

            if slot.replace(js_name).is_some() {
                return Err(Error::new_spanned(
                    function,
                    "duplicate scope update lifecycle method",
                ));
            }

            continue;
        }

        if !matches!(function.vis, Visibility::Public(_)) {
            continue;
        }

        if function.sig.ident == "new" || setter_property(function).is_some() {
            continue;
        }

        if is_getter(function) {
            sync_properties.push(js_name);
        } else {
            methods.push(js_name);
        }
    }

    let metadata_name = format!("{export}_bridgeMetadata");
    let metadata_ident = format_ident!("{}", sanitize_identifier(&metadata_name));
    let metadata_name = format_ident!("{metadata_name}");
    let metadata = bridge_metadata_json(
        &sync_properties,
        &methods,
        scope_update_bind.as_deref(),
        scope_update_unbind.as_deref(),
        &scope_update_routes,
    );
    let metadata = LitStr::new(&metadata, Span::call_site());

    Ok(quote! {
        #[cfg(target_arch = "wasm32")]
        #[wasm_bindgen::prelude::wasm_bindgen(js_name = #metadata_name)]
        pub fn #metadata_ident() -> String {
            #metadata.to_string()
        }
    })
}

fn wasm_bridge_field_metadata_function(
    export: &str,
    input: &mut ItemStruct,
) -> Result<proc_macro2::TokenStream> {
    let sync_properties = collect_public_wasm_field_names(input)?;
    let metadata_name = format!("{export}_fieldBridgeMetadata");
    let metadata_ident = format_ident!("{}", sanitize_identifier(&metadata_name));
    let metadata_name = format_ident!("{metadata_name}");
    let metadata = bridge_metadata_json(&sync_properties, &[], None, None, &[]);
    let metadata = LitStr::new(&metadata, Span::call_site());

    Ok(quote! {
        #[cfg(target_arch = "wasm32")]
        #[wasm_bindgen::prelude::wasm_bindgen(js_name = #metadata_name)]
        pub fn #metadata_ident() -> String {
            #metadata.to_string()
        }
    })
}

fn collect_public_wasm_field_names(input: &ItemStruct) -> Result<Vec<String>> {
    let mut fields = Vec::new();

    let Fields::Named(named_fields) = &input.fields else {
        return Ok(fields);
    };

    for field in &named_fields.named {
        if !matches!(field.vis, Visibility::Public(_)) {
            continue;
        }

        validate_wasm_bridge_type(&field.ty, BridgeTypePosition::Return)?;

        let Some(ident) = &field.ident else {
            continue;
        };

        fields.push(snake_to_lower_camel(&ident.to_string()));
    }

    Ok(fields)
}

struct ScopeUpdateRoute {
    path: String,
    method: String,
}

fn validate_scope_update_lifecycle_method(function: &ImplItemFn) -> Result<()> {
    if has_self_receiver(function)
        && function.sig.inputs.len() == 1
        && matches!(function.sig.output, ReturnType::Default)
    {
        return Ok(());
    }

    Err(Error::new_spanned(
        function,
        "scope update lifecycle methods must take only `self` and return `()`",
    ))
}

fn validate_scope_update_route_method(function: &ImplItemFn) -> Result<()> {
    if has_self_receiver(function)
        && function.sig.inputs.len() == 2
        && matches!(function.sig.output, ReturnType::Default)
    {
        return Ok(());
    }

    Err(Error::new_spanned(
        function,
        "scope update route methods must take `self` and one value argument, and return `()`",
    ))
}

fn bridge_metadata_json(
    sync_properties: &[String],
    methods: &[String],
    scope_update_bind: Option<&str>,
    scope_update_unbind: Option<&str>,
    scope_update_routes: &[ScopeUpdateRoute],
) -> String {
    format!(
        "{{\"syncProperties\":{},\"methods\":{},\"scopeUpdateBind\":{},\"scopeUpdateUnbind\":{},\"scopeUpdateRoutes\":{}}}",
        json_string_array(sync_properties),
        json_string_array(methods),
        json_optional_string(scope_update_bind),
        json_optional_string(scope_update_unbind),
        json_scope_update_routes(scope_update_routes)
    )
}

fn json_scope_update_routes(routes: &[ScopeUpdateRoute]) -> String {
    let routes = routes
        .iter()
        .map(|route| {
            format!(
                "{{\"path\":{},\"method\":{}}}",
                json_string(&route.path),
                json_string(&route.method)
            )
        })
        .collect::<Vec<_>>()
        .join(",");

    format!("[{routes}]")
}

fn json_string_array(values: &[String]) -> String {
    let values = values
        .iter()
        .map(|value| format!("\"{}\"", value.replace('\\', "\\\\").replace('"', "\\\"")))
        .collect::<Vec<_>>()
        .join(",");

    format!("[{values}]")
}

fn json_optional_string(value: Option<&str>) -> String {
    value.map(json_string).unwrap_or_else(|| "null".to_string())
}

fn json_string(value: &str) -> String {
    format!("\"{}\"", value.replace('\\', "\\\\").replace('"', "\\\""))
}

fn sanitize_identifier(value: &str) -> String {
    value
        .chars()
        .map(|ch| {
            if ch == '_' || ch.is_ascii_alphanumeric() {
                ch
            } else {
                '_'
            }
        })
        .collect()
}

fn add_wasm_method_attributes(input: &mut ItemImpl) -> Result<()> {
    for item in &mut input.items {
        let ImplItem::Fn(function) = item else {
            continue;
        };

        function.attrs =
            without_attribute(std::mem::take(&mut function.attrs), "scope_update_bind");
        function.attrs =
            without_attribute(std::mem::take(&mut function.attrs), "scope_update_unbind");
        function.attrs = without_attribute(std::mem::take(&mut function.attrs), "scope_update");

        if !matches!(function.vis, Visibility::Public(_)) {
            continue;
        }

        function.attrs.push(wasm_method_attribute(function)?);
    }

    Ok(())
}

fn add_wasm_field_attributes(input: &mut ItemStruct) -> Result<()> {
    let Fields::Named(named_fields) = &mut input.fields else {
        return Ok(());
    };

    for field in &mut named_fields.named {
        if !matches!(field.vis, Visibility::Public(_)) {
            continue;
        }

        let Some(ident) = &field.ident else {
            continue;
        };

        let js_name = snake_to_lower_camel(&ident.to_string());
        let js_name = format_ident!("{js_name}");
        field.attrs.push(parse_quote! {
            #[cfg_attr(target_arch = "wasm32", wasm_bindgen(js_name = #js_name))]
        });
    }

    Ok(())
}

fn has_method_attribute(function: &ImplItemFn, attribute: &str) -> bool {
    function
        .attrs
        .iter()
        .any(|attr| attr.path().is_ident(attribute))
}

fn scope_update_path(function: &ImplItemFn) -> Result<Option<String>> {
    let Some(attribute) = function
        .attrs
        .iter()
        .find(|attr| attr.path().is_ident("scope_update"))
    else {
        return Ok(None);
    };

    let args = attribute.parse_args::<KeyValueArgs>()?;
    reject_unknown(&args, &["path"])?;
    Ok(Some(get_required(&args, "path")?.value()))
}

fn wasm_method_attribute(function: &ImplItemFn) -> Result<Attribute> {
    let name = &function.sig.ident;

    if name == "new" {
        return Ok(parse_quote! {
            #[cfg_attr(target_arch = "wasm32", wasm_bindgen::prelude::wasm_bindgen(constructor))]
        });
    }

    if is_getter(function) {
        return Ok(named_wasm_attribute(
            "getter",
            &snake_to_lower_camel(&name.to_string()),
        ));
    }

    if let Some(property) = setter_property(function) {
        return Ok(named_wasm_attribute("setter", &property));
    }

    let js_name = snake_to_lower_camel(&name.to_string());
    let js_name = format_ident!("{js_name}");

    Ok(parse_quote! {
        #[cfg_attr(target_arch = "wasm32", wasm_bindgen::prelude::wasm_bindgen(js_name = #js_name))]
    })
}

fn named_wasm_attribute(kind: &str, name: &str) -> Attribute {
    let kind = format_ident!("{kind}");
    let name = format_ident!("{name}");

    parse_quote! {
        #[cfg_attr(target_arch = "wasm32", wasm_bindgen::prelude::wasm_bindgen(#kind, js_name = #name))]
    }
}

fn is_getter(function: &ImplItemFn) -> bool {
    has_self_receiver(function)
        && function.sig.inputs.len() == 1
        && !matches!(function.sig.output, ReturnType::Default)
}

fn setter_property(function: &ImplItemFn) -> Option<String> {
    let name = function.sig.ident.to_string();
    let property = name.strip_prefix("set_")?;

    if !has_self_receiver(function)
        || function.sig.inputs.len() != 2
        || !matches!(function.sig.output, ReturnType::Default)
    {
        return None;
    }

    Some(snake_to_lower_camel(property))
}

fn has_self_receiver(function: &ImplItemFn) -> bool {
    function
        .sig
        .inputs
        .iter()
        .next()
        .is_some_and(|arg| matches!(arg, FnArg::Receiver(_)))
}

fn snake_to_lower_camel(value: &str) -> String {
    let mut output = String::new();
    let mut uppercase_next = false;

    for ch in value.chars() {
        if ch == '_' {
            uppercase_next = true;
        } else if uppercase_next {
            output.extend(ch.to_uppercase());
            uppercase_next = false;
        } else {
            output.push(ch);
        }
    }

    output
}

fn collect_injections(input: &ItemStruct) -> Result<Vec<proc_macro2::TokenStream>> {
    let mut injections = Vec::new();

    match &input.fields {
        Fields::Named(fields) => {
            for field in &fields.named {
                if let Some(injection) = collect_field_injection(field)? {
                    injections.push(injection);
                }
            }
        }
        Fields::Unnamed(fields) => {
            for field in &fields.unnamed {
                if has_attribute(field, "inject") {
                    return Err(Error::new_spanned(
                        field,
                        "`#[inject]` requires a named component field",
                    ));
                }
            }
        }
        Fields::Unit => {}
    }

    Ok(injections)
}

fn collect_field_injection(field: &Field) -> Result<Option<proc_macro2::TokenStream>> {
    let Some(attr) = field
        .attrs
        .iter()
        .find(|attr| attr.path().is_ident("inject"))
    else {
        return Ok(None);
    };

    let field_name = field
        .ident
        .as_ref()
        .ok_or_else(|| Error::new_spanned(field, "`#[inject]` requires a named field"))?;
    let token = if attr.meta.require_path_only().is_ok() {
        LitStr::new(&field_name.to_string(), Span::call_site())
    } else {
        let args = attr.parse_args::<KeyValueArgs>()?;
        reject_unknown(&args, &["token"])?;
        get_required(&args, "token")?
    };
    validate_injection_type(field)?;

    let rust_type = type_string(&field.ty);
    let field_name_literal = LitStr::new(&field_name.to_string(), field_name.span());
    let rust_type_literal = LitStr::new(&rust_type, Span::call_site());

    Ok(Some(quote! {
        ::angular_ts::InjectionMetadata::new(#field_name_literal, #token, #rust_type_literal)
    }))
}

fn validate_injection_type(field: &Field) -> Result<()> {
    if is_option_type(&field.ty) || is_wasm_scope_type(&field.ty) {
        return Ok(());
    }

    Err(Error::new_spanned(
        &field.ty,
        "`#[inject]` fields must be `Option<T>` service/value slots or `WasmScope` for `$scope`",
    ))
}

fn is_option_type(ty: &Type) -> bool {
    let Type::Path(path) = ty else {
        return false;
    };

    let Some(segment) = path.path.segments.last() else {
        return false;
    };

    if segment.ident != "Option" {
        return false;
    }

    let PathArguments::AngleBracketed(args) = &segment.arguments else {
        return false;
    };

    args.args
        .iter()
        .filter(|arg| matches!(arg, GenericArgument::Type(_)))
        .count()
        == 1
}

fn is_wasm_scope_type(ty: &Type) -> bool {
    let Type::Path(path) = ty else {
        return false;
    };

    path.path
        .segments
        .last()
        .is_some_and(|segment| segment.ident == "WasmScope")
}

fn has_attribute(field: &Field, attribute: &str) -> bool {
    field
        .attrs
        .iter()
        .any(|attr| attr.path().is_ident(attribute))
}

fn type_string(ty: &Type) -> String {
    quote!(#ty).to_string().replace(' ', "")
}

fn strip_field_attribute(input: &mut ItemStruct, attribute: &str) {
    match &mut input.fields {
        Fields::Named(fields) => {
            for field in &mut fields.named {
                field.attrs = without_attribute(std::mem::take(&mut field.attrs), attribute);
            }
        }
        Fields::Unnamed(fields) => {
            for field in &mut fields.unnamed {
                field.attrs = without_attribute(std::mem::take(&mut field.attrs), attribute);
            }
        }
        Fields::Unit => {}
    }
}

fn without_attribute(attrs: Vec<Attribute>, attribute: &str) -> Vec<Attribute> {
    attrs
        .into_iter()
        .filter(|attr| !attr.path().is_ident(attribute))
        .collect()
}

fn expand_service(args: KeyValueArgs, input: ItemStruct) -> Result<proc_macro2::TokenStream> {
    reject_unknown(&args, &["token", "export"])?;
    assert_public(&input.vis, &input.ident, "service")?;

    let ident = &input.ident;
    let token = get_optional(&args, "token")
        .unwrap_or_else(|| LitStr::new(&lower_camel(ident), Span::call_site()));
    let export_name =
        get_optional(&args, "export").unwrap_or_else(|| export_name("service", ident));

    Ok(quote! {
        #input

        impl ::angular_ts::Service for #ident {
            const TOKEN_NAME: &'static str = #token;
            const EXPORT_NAME: &'static str = #export_name;
        }
    })
}
