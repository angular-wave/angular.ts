use angular_ts::{BinaryField, Field};

mod player {
    include!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../../contracts/generated/player_contract.rs"
    ));
}

fn accepts_field<T>(_: Field<T>) {}

#[test]
fn generated_contract_fields_preserve_rust_value_types() {
    accepts_field::<f64>(player::POSITION_X);
    accepts_field::<f64>(player::POSITION_Y);
    accepts_field::<u32>(player::HEALTH);
    accepts_field::<String>(player::NAME);

    let frame: BinaryField = player::FRAME;
    assert_eq!(frame.path(), "frame");
    assert!(frame.is_optional());
}
