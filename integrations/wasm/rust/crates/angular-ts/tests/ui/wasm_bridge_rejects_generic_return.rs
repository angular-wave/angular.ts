use angular_ts::wasm_bridge;

#[wasm_bridge]
pub struct BadController;

#[wasm_bridge]
impl BadController {
    pub fn tasks(&self) -> Vec<String> {
        Vec::new()
    }
}

fn main() {}
