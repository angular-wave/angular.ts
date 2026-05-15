use angular_ts::component;

#[component(selector = "bad-component", template = "")]
pub struct BadComponent {
    #[inject(token = "title")]
    title: String,
}

fn main() {}
