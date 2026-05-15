pub opaque type Token(value) {
  Token(name: String)
}

pub fn new(name: String) -> Token(value) {
  Token(name)
}

pub fn name(token: Token(value)) -> String {
  token.name
}
