//! Infrared frames for Mabe air conditioners.
//!
//! Most recent Mabe mini-splits speak the 48-bit Midea protocol. A lot of
//! window units and some older splits speak Coolix. Both are encoded here
//! into the mark/space timings Android's `ConsumerIrManager` expects
//! (carrier added by the phone, not by us).
//!
//! Bit layouts follow IRremoteESP8266 (`ir_Midea`, `ir_Coolix`).

use std::cell::UnsafeCell;

const PATTERN_CAP: usize = 512;

struct Slot {
    pattern: [i32; PATTERN_CAP],
    len: u32,
    code_lo: u32,
    code_hi: u32,
    frequency: u32,
}

struct Inner(UnsafeCell<Slot>);
unsafe impl Sync for Inner {}

static SLOT: Inner = Inner(UnsafeCell::new(Slot {
    pattern: [0; PATTERN_CAP],
    len: 0,
    code_lo: 0,
    code_hi: 0,
    frequency: 38_000,
}));

fn slot() -> &'static mut Slot {
    unsafe { &mut *SLOT.0.get() }
}

const MIDEA_TICK: i32 = 80;
const MIDEA_BIT_MARK: i32 = 7 * MIDEA_TICK; // 560
const MIDEA_ONE_SPACE: i32 = 21 * MIDEA_TICK; // 1680
const MIDEA_ZERO_SPACE: i32 = 7 * MIDEA_TICK; // 560
const MIDEA_HDR_MARK: i32 = 56 * MIDEA_TICK; // 4480
const MIDEA_HDR_SPACE: i32 = 56 * MIDEA_TICK; // 4480
const MIDEA_GAP: i32 = 70 * MIDEA_TICK; // 5600

const COOLIX_TICK: i32 = 276;
const COOLIX_BIT_MARK: i32 = 2 * COOLIX_TICK; // 552
const COOLIX_ONE_SPACE: i32 = 6 * COOLIX_TICK; // 1656
const COOLIX_ZERO_SPACE: i32 = 2 * COOLIX_TICK; // 552
const COOLIX_HDR_MARK: i32 = 17 * COOLIX_TICK; // 4692
const COOLIX_HDR_SPACE: i32 = 16 * COOLIX_TICK; // 4416
const COOLIX_GAP: i32 = 19 * COOLIX_TICK; // 5244

const COOLIX_TEMP_MAP: [u8; 14] = [
    0b0000, 0b0001, 0b0011, 0b0010, 0b0110, 0b0111, 0b0101, 0b0100, 0b1100, 0b1101, 0b1001,
    0b1000, 0b1010, 0b1011,
];
const COOLIX_OFF: u32 = 0xB27BE0;
const COOLIX_SWING: u32 = 0xB26BE0;
const COOLIX_SLEEP: u32 = 0xB2E003;
const COOLIX_TURBO: u32 = 0xB5F5A2;
const COOLIX_LED: u32 = 0xB5F5A5;
const COOLIX_FAN_TEMP: u8 = 0b1110;

const MIDEA_SWING: u64 = 0xA201FFFFFF7C;
const MIDEA_ECO: u64 = 0xA202FFFFFF7E;
const MIDEA_LIGHT: u64 = 0xA208FFFFFF75;
const MIDEA_TURBO: u64 = 0xA209FFFFFF74;
const MIDEA_QUIET_ON: u64 = 0xA212FFFFFF6E;
const MIDEA_QUIET_OFF: u64 = 0xA213FFFFFF6F;

/// protocol: 0 Midea, 1 Coolix
/// mode: 0 cool, 1 dry, 2 auto, 3 heat, 4 fan
/// fan: 0 auto, 1 low, 2 med, 3 high
/// command: 0 apply state, 1 swing, 2 turbo, 3 light, 4 eco, 5 quiet on, 6 quiet off, 7 sleep
#[no_mangle]
pub extern "C" fn encode(
    protocol: u32,
    power: u32,
    mode: u32,
    temp: u32,
    fan: u32,
    sleep: u32,
    command: u32,
) -> u32 {
    let frame = if protocol == 1 {
        Frame::Coolix(coolix_word(power != 0, mode, temp, fan, command))
    } else {
        Frame::Midea(midea_word(power != 0, mode, temp, fan, sleep != 0, command))
    };
    let (code, freq, pattern_len) = match frame {
        Frame::Midea(word) => {
            let n = write_midea(word);
            (word, 38_000u32, n)
        }
        Frame::Coolix(word) => {
            let n = write_coolix(word);
            (word as u64, 38_000u32, n)
        }
    };
    let s = slot();
    s.len = pattern_len;
    s.code_lo = code as u32;
    s.code_hi = (code >> 32) as u32;
    s.frequency = freq;
    pattern_len
}

#[no_mangle]
pub extern "C" fn pattern_ptr() -> *const i32 {
    slot().pattern.as_ptr()
}

#[no_mangle]
pub extern "C" fn pattern_len() -> u32 {
    slot().len
}

#[no_mangle]
pub extern "C" fn code_lo() -> u32 {
    slot().code_lo
}

#[no_mangle]
pub extern "C" fn code_hi() -> u32 {
    slot().code_hi
}

#[no_mangle]
pub extern "C" fn carrier_hz() -> u32 {
    slot().frequency
}

enum Frame {
    Midea(u64),
    Coolix(u32),
}

fn reverse_byte(mut b: u8) -> u8 {
    let mut r = 0u8;
    let mut i = 0;
    while i < 8 {
        r = (r << 1) | (b & 1);
        b >>= 1;
        i += 1;
    }
    r
}

/// Midea checksum: bit-reverse each of the five payload bytes, sum them,
/// take the two's-complement low byte, then bit-reverse that.
fn midea_checksum(state: u64) -> u8 {
    let mut sum: u8 = 0;
    let mut temp = state;
    let mut i = 0;
    while i < 5 {
        temp >>= 8;
        sum = sum.wrapping_add(reverse_byte((temp & 0xFF) as u8));
        i += 1;
    }
    reverse_byte(0u8.wrapping_sub(sum))
}

fn midea_word(power: bool, mode: u32, temp: u32, fan: u32, sleep: bool, command: u32) -> u64 {
    match command {
        1 => return MIDEA_SWING,
        2 => return MIDEA_TURBO,
        3 => return MIDEA_LIGHT,
        4 => return MIDEA_ECO,
        5 => return MIDEA_QUIET_ON,
        6 => return MIDEA_QUIET_OFF,
        // Sleep lives in the state byte for Midea; command 7 still sends state.
        _ => {}
    }
    let temp_c = clamp_u32(temp, 17, 30) as u8;
    let mode_b = match mode {
        0 | 1 | 2 | 3 | 4 => mode as u8,
        _ => 2,
    };
    let fan_b = match fan {
        0 | 1 | 2 | 3 => fan as u8,
        _ => 0,
    };
    let b1: u8 = 0xFF; // sensor disabled
    let b2: u8 = 0xFF; // off-timer disabled, fixed bit set
    let b3: u8 = temp_c - 17; // celsius offset, fahrenheit flag clear
    let b4: u8 = (mode_b & 7)
        | ((fan_b & 3) << 3)
        | (if sleep { 1 } else { 0 } << 6)
        | (if power { 1 } else { 0 } << 7);
    let b5: u8 = 0xA1; // header 0b10100, type = command
    let state = (b1 as u64) << 8
        | (b2 as u64) << 16
        | (b3 as u64) << 24
        | (b4 as u64) << 32
        | (b5 as u64) << 40;
    state | (midea_checksum(state) as u64)
}

fn coolix_word(power: bool, mode: u32, temp: u32, fan: u32, command: u32) -> u32 {
    match command {
        1 => return COOLIX_SWING,
        2 => return COOLIX_TURBO,
        3 => return COOLIX_LED,
        7 => return COOLIX_SLEEP,
        // Eco / quiet have no Coolix equivalent; send the live state instead.
        _ => {}
    }
    if !power {
        return COOLIX_OFF;
    }
    let temp_c = clamp_u32(temp, 17, 30) as usize;
    let mut temp_code = COOLIX_TEMP_MAP[temp_c - 17];
    let (mode_bits, fan_bits): (u32, u32) = match mode {
        0 => (0, coolix_fan(fan, false)), // cool
        3 => (3, coolix_fan(fan, false)), // heat
        1 => (1, 0),                      // dry — fan locked
        4 => {
            // Fan is dry + a sentinel temperature.
            temp_code = COOLIX_FAN_TEMP;
            (1, 0b101)
        }
        _ => (2, 0), // auto — fan locked to Auto0
    };
    pack_coolix(mode_bits, temp_code, fan_bits)
}

fn coolix_fan(fan: u32, _locked: bool) -> u32 {
    match fan {
        1 => 0b100, // min
        2 => 0b010, // med
        3 => 0b001, // max
        _ => 0b101, // auto
    }
}

fn pack_coolix(mode: u32, temp_code: u8, fan: u32) -> u32 {
    ((mode & 3) << 2)
        | ((temp_code as u32 & 0xF) << 4)
        | (0b11111 << 8) // ignore remote sensor
        | ((fan & 7) << 13)
        | (0b010 << 16) // constant seen on every normal + off frame
        | (0b1011 << 20) // fixed high nibble
}

fn clamp_u32(v: u32, lo: u32, hi: u32) -> u32 {
    if v < lo {
        lo
    } else if v > hi {
        hi
    } else {
        v
    }
}

struct Writer {
    n: usize,
}

impl Writer {
    fn push(&mut self, v: i32) {
        if self.n < PATTERN_CAP {
            slot().pattern[self.n] = v;
            self.n += 1;
        }
    }

    fn bits_msb(&mut self, byte: u8, mark: i32, one: i32, zero: i32) {
        let mut mask = 0x80u8;
        while mask != 0 {
            self.push(mark);
            self.push(if byte & mask != 0 { one } else { zero });
            mask >>= 1;
        }
    }
}

fn write_midea(mut data: u64) -> u32 {
    let mut w = Writer { n: 0 };
    let mut phase = 0;
    while phase < 2 {
        w.push(MIDEA_HDR_MARK);
        w.push(MIDEA_HDR_SPACE);
        // Most significant byte first.
        let mut shift = 40i32;
        while shift >= 0 {
            let segment = ((data >> shift) & 0xFF) as u8;
            w.bits_msb(segment, MIDEA_BIT_MARK, MIDEA_ONE_SPACE, MIDEA_ZERO_SPACE);
            shift -= 8;
        }
        w.push(MIDEA_BIT_MARK);
        w.push(MIDEA_GAP);
        data ^= (1u64 << 48) - 1;
        phase += 1;
    }
    w.n as u32
}

fn write_coolix(data: u32) -> u32 {
    let mut w = Writer { n: 0 };
    // Library default is a single repeat, so the frame goes out twice.
    let mut round = 0;
    while round < 2 {
        w.push(COOLIX_HDR_MARK);
        w.push(COOLIX_HDR_SPACE);
        let mut shift = 16i32;
        while shift >= 0 {
            let segment = ((data >> shift) & 0xFF) as u8;
            w.bits_msb(
                segment,
                COOLIX_BIT_MARK,
                COOLIX_ONE_SPACE,
                COOLIX_ZERO_SPACE,
            );
            w.bits_msb(
                !segment,
                COOLIX_BIT_MARK,
                COOLIX_ONE_SPACE,
                COOLIX_ZERO_SPACE,
            );
            shift -= 8;
        }
        w.push(COOLIX_BIT_MARK);
        w.push(COOLIX_GAP);
        round += 1;
    }
    w.n as u32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn midea_golden_25c_auto_on() {
        // Celsius, power on, auto, fan auto, 25°C. Checksum from the same
        // algorithm IRremoteESP8266 uses; the library's own reset word is the
        // Fahrenheit twin (77°F) of this state.
        let word = midea_word(true, 2, 25, 0, false, 0);
        assert_eq!(word, 0xA18208FFFF34);
        assert_eq!(midea_checksum(0xA1826FFFFF62), 0x62);
    }

    #[test]
    fn midea_power_bit_and_sleep() {
        let on = midea_word(true, 0, 23, 3, false, 0);
        let off = midea_word(false, 0, 23, 3, true, 0);
        assert_eq!((on >> 32) & 0x80, 0x80);
        assert_eq!((off >> 32) & 0x80, 0);
        assert_eq!((off >> 32) & 0x40, 0x40);
        assert_eq!(off & 0xFF, midea_checksum(off) as u64);
    }

    #[test]
    fn midea_pattern_header_and_first_byte() {
        let n = write_midea(0xA18208FFFF34);
        assert_eq!(n, 200);
        let s = slot();
        assert_eq!(s.pattern[0], 4480);
        assert_eq!(s.pattern[1], 4480);
        // 0xA1 = 0b10100001, MSB first.
        let expect = [1, 0, 1, 0, 0, 0, 0, 1];
        for (i, bit) in expect.iter().enumerate() {
            assert_eq!(s.pattern[2 + i * 2], 560);
            let space = if *bit == 1 { 1680 } else { 560 };
            assert_eq!(s.pattern[3 + i * 2], space);
        }
        // Second phase begins after 100 timings.
        assert_eq!(s.pattern[100], 4480);
    }

    #[test]
    fn coolix_golden_states() {
        assert_eq!(coolix_word(true, 2, 25, 0, 0), 0xB21FC8);
        assert_eq!(coolix_word(false, 2, 25, 0, 0), COOLIX_OFF);
        // Cool, 25°C, fan auto → 0b101 in the fan field.
        assert_eq!(coolix_word(true, 0, 25, 0, 0), 0xB2BFC0);
        assert_eq!(coolix_word(true, 0, 25, 0, 1), COOLIX_SWING);
    }

    #[test]
    fn coolix_pattern_shape() {
        let n = write_coolix(0xB21FC8);
        assert_eq!(n, 200);
        let s = slot();
        assert_eq!(s.pattern[0], 4692);
        assert_eq!(s.pattern[1], 4416);
        assert_eq!(s.pattern[100], 4692);
    }

    #[test]
    fn patterns_fit_in_an_android_ir_burst() {
        let cases = [
            write_midea(0xA18208FFFF34),
            write_coolix(0xB21FC8),
            write_coolix(COOLIX_OFF),
        ];
        for n in cases {
            let mut sum = 0i32;
            let s = slot();
            for i in 0..(n as usize) {
                assert!(s.pattern[i] > 0);
                sum += s.pattern[i];
            }
            assert!(sum < 2_000_000, "burst {sum}us exceeds ConsumerIrManager");
            assert_eq!(n % 2, 0);
        }
    }
}
