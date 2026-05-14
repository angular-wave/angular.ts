use std::marker::PhantomData;

/// Typed AngularTS dependency-injection token.
#[derive(Debug, PartialEq, Eq, Hash)]
pub struct Token<T> {
    name: &'static str,
    _marker: PhantomData<fn() -> T>,
}

impl<T> Token<T> {
    /// Creates a typed token from the AngularTS runtime token name.
    pub const fn new(name: &'static str) -> Self {
        Self {
            name,
            _marker: PhantomData,
        }
    }

    /// Returns the runtime token name used by AngularTS DI.
    pub const fn name(&self) -> &'static str {
        self.name
    }
}

impl<T> Clone for Token<T> {
    fn clone(&self) -> Self {
        *self
    }
}

impl<T> Copy for Token<T> {}

/// Creates a typed AngularTS dependency-injection token.
pub const fn token<T>(name: &'static str) -> Token<T> {
    Token::new(name)
}

/// Declares a typed AngularTS dependency-injection token.
#[macro_export]
macro_rules! token {
    ($name:literal) => {
        $crate::Token::new($name)
    };
}
