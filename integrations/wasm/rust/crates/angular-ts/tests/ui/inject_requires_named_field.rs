use angular_ts::component;

pub struct Store;

#[component(selector = "bad-component", template = "")]
pub struct BadComponent(#[inject] Option<Store>);

fn main() {}
