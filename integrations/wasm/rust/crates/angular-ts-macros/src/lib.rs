use proc_macro::TokenStream;
use proc_macro2::Span;
use quote::{format_ident, quote};
use syn::parse::{Parse, ParseStream};
use syn::{
    parse_macro_input, Attribute, Error, Field, Fields, Ident, ItemFn, ItemStruct, LitStr, Result,
    Token, Type, Visibility,
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
    let rust_type = type_string(&field.ty);
    let field_name_literal = LitStr::new(&field_name.to_string(), field_name.span());
    let rust_type_literal = LitStr::new(&rust_type, Span::call_site());

    Ok(Some(quote! {
        ::angular_ts::InjectionMetadata::new(#field_name_literal, #token, #rust_type_literal)
    }))
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
