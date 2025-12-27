import numpy as np
import matplotlib.pyplot as plt


# ==================== 1) Encoding functions====================

def repetition_encode_1_3(bits):

    bits = np.asarray(bits) & 1
    return np.repeat(bits, 3)

def repetition_encode_1_5(bits):

    bits = np.asarray(bits) & 1
    return np.repeat(bits, 5)


G_7_4 = np.array([[1, 0, 0, 0, 1, 1, 0],
                  [0, 1, 0, 0, 1, 0, 1],
                  [0, 0, 1, 0, 0, 1, 1],
                  [0, 0, 0, 1, 1, 1, 1]],
                  dtype=int)

def hamming_7_4_encode(bits):

    bits = np.asarray(bits) & 1
    if len(bits) % 4 != 0:
        raise ValueError("Input length must be a multiple of 4")

    bits = bits.reshape((-1, 4))
    coded = (bits @ G_7_4) % 2
    return coded.reshape(-1)

G_15_11 = np.array([
    [1,0,0,0,0,0,0,0,0,0,0,1,1,0,1],
    [0,1,0,0,0,0,0,0,0,0,0,1,1,1,1],
    [0,0,1,0,0,0,0,0,0,0,0,1,0,1,1],
    [0,0,0,1,0,0,0,0,0,0,0,1,0,0,1],
    [0,0,0,0,1,0,0,0,0,0,0,1,1,1,0],
    [0,0,0,0,0,1,0,0,0,0,0,1,1,0,0],
    [0,0,0,0,0,0,1,0,0,0,0,0,1,1,1],
    [0,0,0,0,0,0,0,1,0,0,0,0,1,1,0],
    [0,0,0,0,0,0,0,0,1,0,0,0,1,0,1],
    [0,0,0,0,0,0,0,0,0,1,0,0,0,1,1],
    [0,0,0,0,0,0,0,0,0,0,1,0,1,1,1],]
    , dtype=int)

def hamming_15_11_encode(bits):
    bits = np.asarray(bits) & 1
    if len(bits) % 11 != 0:
        raise ValueError("Input length must be a multiple of 11")

    bits = bits.reshape((-1, 11))
    coded = (bits @ G_15_11) % 2
    return coded.reshape(-1)

# ==================== 2) Decoding functions====================

def majority_vote(block):
    return 1 if np.sum(block) >= (len(block)/2) else 0

def repetition_decode_1_3(received):

    r = np.asarray(received) & 1
    if len(r) % 3 != 0:
        raise ValueError("Length must be multiple of 3")

    blocks = r.reshape(-1, 3)
    decoded = np.array([majority_vote(b) for b in blocks])
    return decoded

def repetition_decode_1_5(received):

    r = np.asarray(received) & 1
    if len(r) % 5 != 0:
        raise ValueError("Length must be multiple of 5")

    blocks = r.reshape(-1, 5)
    decoded = np.array([majority_vote(b) for b in blocks])
    return decoded

H_7_4 = np.array([[1, 1, 0, 1, 1, 0, 0],
                  [1, 0, 1, 1, 0, 1, 0],
                  [0, 1, 1, 1, 0, 0, 1]],
                  dtype=int)

def hamming_7_4_decode(received):

    r = np.asarray(received) & 1
    if len(r) % 7 != 0:
        raise ValueError("Length must be multiple of 7")

    blocks = r.reshape(-1, 7)
    decoded_words = []

    for block in blocks:
        # syndrome = H * r^T (mod 2)
        s = (H_7_4 @ block) % 2
        syndrome = s[0]*4 + s[1]*2 + s[2]*1  # binary → index

        corrected = block.copy()

        if syndrome != 0:
            error_index = syndrome - 1
            corrected[error_index] ^= 1   # flip bit

        # extract systematic info bits (first 4)
        decoded_words.append(corrected[:4])

    return np.concatenate(decoded_words)

H_15_11 = np.array([
    [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],
    [0,1,1,0,0,1,1,0,0,1,1,0,0,1,1],
    [0,0,0,1,1,1,1,0,0,0,0,1,1,1,1],
    [0,0,0,0,0,0,0,1,1,1,1,1,1,1,1]
], dtype=int)

def hamming_15_11_decode(received):

    r = np.asarray(received) & 1
    if len(r) % 15 != 0:
        raise ValueError("Length must be multiple of 15")

    blocks = r.reshape(-1, 15)
    decoded_words = []

    for block in blocks:
        s = (H_15_11 @ block) % 2
        # Convert 4-bit syndrome to integer
        syndrome = s[0]*8 + s[1]*4 + s[2]*2 + s[3]*1

        corrected = block.copy()

        if syndrome != 0:
            error_index = syndrome - 1
            corrected[error_index] ^= 1

        # info bits = first 11 (systematic code)
        decoded_words.append(corrected[:11])

    return np.concatenate(decoded_words)

# ==================== 3) BER over AWGN ====================

def bpsk_modulate(bits, Es=1.0):
    bits = np.asarray(bits) & 1
    return np.sqrt(Es) * (2*bits - 1)

def add_awgn(signal, EbN0_dB, Eb=1.0):
    EbN0_linear = 10**(EbN0_dB/10)
    N0 = Eb / EbN0_linear
    noise_var = N0 / 2
    noise = np.sqrt(noise_var) * np.random.randn(len(signal))
    return signal + noise

def bpsk_demodulate(received):
    return (received > 0).astype(int)

def compute_ber(bits_tx, bits_rx):
    bits_tx = np.asarray(bits_tx) & 1
    bits_rx = np.asarray(bits_rx) & 1
    return np.mean(bits_tx != bits_rx)

def simulate_awgn_ber(EbN0_dB_list, 
                      num_bits=100000, 
                      encoder=None, 
                      decoder=None,
                      rate_k=1,
                      rate_n=1):

    bers = []
    Es = Es_from_rate(rate_k, rate_n)

    # --- Make num_bits compatible with k ---
    if num_bits % rate_k != 0:
        num_bits = (num_bits // rate_k + 1) * rate_k

    for EbN0 in EbN0_dB_list:

        bits = np.random.randint(0, 2, num_bits)

        if encoder is not None:
            coded_bits = encoder(bits)
        else:
            coded_bits = bits

        tx = bpsk_modulate(coded_bits, Es)

        rx = add_awgn(tx, EbN0)

        detected = bpsk_demodulate(rx)

        if decoder is not None:
            decoded_bits = decoder(detected)
        else:
            decoded_bits = detected

        ber = compute_ber(bits, decoded_bits)
        bers.append(ber)

    return np.array(bers)

# ==================== 4) BER over Rayleigh fading channel ====================

def awgn_noise(signal_len, EbN0_dB, Eb=1.0):
    EbN0_linear = 10**(EbN0_dB/10)
    N0 = Eb / EbN0_linear
    noise_var = N0 / 2
    return np.sqrt(noise_var) * np.random.randn(signal_len)

# this function work with channel fading with coding and without coding
def simulate_rayleigh_ber(EbN0_dB_list,
                          num_bits=100000,
                          encoder=None,
                          decoder=None,
                          rate_k=1,
                          rate_n=1):

    bers = []
    Es = Es_from_rate(rate_k, rate_n)

    # --- Make num_bits compatible with k ---
    if num_bits % rate_k != 0:
        num_bits = (num_bits // rate_k + 1) * rate_k

    for EbN0 in EbN0_dB_list:

        bits = np.random.randint(0, 2, num_bits)

        if encoder is not None:
            coded_bits = encoder(bits)
        else:
            coded_bits = bits

        tx = bpsk_modulate(coded_bits, Es)

        h = (np.random.randn(len(tx)) + 1j*np.random.randn(len(tx))) / np.sqrt(2)

        noise = awgn_noise(len(tx), EbN0)

        rx = np.real(h)*tx + noise

        rx_eq = rx / np.real(h)

        detected = bpsk_demodulate(rx_eq)

        if decoder is not None:
            decoded_bits = decoder(detected)
        else:
            decoded_bits = detected

        ber = compute_ber(bits, decoded_bits)
        bers.append(ber)

    return np.array(bers)

def Es_from_rate(k, n):
    return k / n   # ensures Eb = 1 per information bit

# ==================== 5) Test Program ====================

def choose_channel():
    print("\nSelect channel:")
    print("1) AWGN")
    print("2) Rayleigh")
    ch = int(input("Enter choice: "))
    return ch

def choose_coding():
    print("\nChannel coding?")
    print("1) None")
    print("2) Repetition")
    print("3) Hamming")
    c = int(input("Enter choice: "))
    return c

def choose_repetition():
    print("\nRepetition code:")
    print("1) Rate 1/3")
    print("2) Rate 1/5")
    c = int(input("Enter choice: "))
    return c

def choose_hamming():
    print("\nHamming code:")
    print("1) (7,4)")
    print("2) (15,11)")
    c = int(input("Enter choice: "))
    return c

def run_simulation():
    print("\n=== BPSK BER SIMULATOR ===")

    # --- SNR range ---
    start = float(input("\nEnter SNR start (dB): "))
    end = float(input("Enter SNR end (dB): "))
    step = float(input("Enter SNR step (dB): "))

    EbN0 = np.arange(start, end+step, step)

    channel = choose_channel()
    coding = choose_coding()

    encoder = None
    decoder = None
    rate_k = 1
    rate_n = 1

    if coding == 2:  # repetition
        r = choose_repetition()
        if r == 1:
            encoder = repetition_encode_1_3
            decoder = repetition_decode_1_3
            rate_k, rate_n = 1, 3
        else:
            encoder = repetition_encode_1_5
            decoder = repetition_decode_1_5
            rate_k, rate_n = 1, 5

    elif coding == 3:  # hamming
        r = choose_hamming()
        if r == 1:
            encoder = hamming_7_4_encode
            decoder = hamming_7_4_decode
            rate_k, rate_n = 4, 7
        else:
            encoder = hamming_15_11_encode
            decoder = hamming_15_11_decode
            rate_k, rate_n = 11, 15

    if channel == 1:
        ber = simulate_awgn_ber(EbN0, encoder=encoder, decoder=decoder,
                                rate_k=rate_k, rate_n=rate_n)
    else:
        ber = simulate_rayleigh_ber(EbN0, encoder=encoder, decoder=decoder,
                                    rate_k=rate_k, rate_n=rate_n)

    plt.semilogy(EbN0, ber, marker='o')
    plt.grid(True, which='both')
    plt.xlabel("Eb/N0 (dB)")
    plt.ylabel("BER")
    plt.title("BER Performance")
    plt.show()


def test_all_cases():

    EbN0 = np.arange(0, 22, 2)

    print("Running simulations over AWGN and Rayleigh...")

    # --- Uncoded ---
    ber_awgn = simulate_awgn_ber(EbN0)
    ber_ray  = simulate_rayleigh_ber(EbN0)

    # --- Repetition ---
    ber_rep13_awgn = simulate_awgn_ber(
                    EbN0,
                    encoder=repetition_encode_1_3,
                    decoder=repetition_decode_1_3,
                    rate_k=1, rate_n=3)


    ber_rep13_ray = simulate_rayleigh_ber(
                    EbN0,
                    encoder=repetition_encode_1_3,
                    decoder=repetition_decode_1_3,
                    rate_k=1, rate_n=3)


    ber_rep15_awgn = simulate_awgn_ber(
                    EbN0,
                    encoder=repetition_encode_1_5,
                    decoder=repetition_decode_1_5,
                    rate_k=1, rate_n=5)

    ber_rep15_ray = simulate_rayleigh_ber(
                    EbN0,
                    encoder=repetition_encode_1_5,
                    decoder=repetition_decode_1_5,
                    rate_k=1, rate_n=5)


    # --- Hamming ---
    ber_h74_awgn = simulate_awgn_ber(
                    EbN0,
                    encoder=hamming_7_4_encode,
                    decoder=hamming_7_4_decode,
                    rate_k=4, rate_n=7)

    ber_h74_ray = simulate_rayleigh_ber(
                    EbN0,
                    encoder=hamming_7_4_encode,
                    decoder=hamming_7_4_decode,
                    rate_k=4, rate_n=7)

    ber_h1511_awgn = simulate_awgn_ber(
                    EbN0,
                    encoder=hamming_15_11_encode,
                    decoder=hamming_15_11_decode,
                    rate_k=11, rate_n=15)

    ber_h1511_ray = simulate_rayleigh_ber(
                    EbN0,
                    encoder=hamming_15_11_encode,
                    decoder=hamming_15_11_decode,
                    rate_k=11, rate_n=15)


    # ===== Plot =====
    plt.figure(figsize=(10,6))

    # Uncoded
    plt.semilogy(EbN0, ber_awgn, 'b-o', label="Uncoded AWGN")
    plt.semilogy(EbN0, ber_ray, 'r-s', label="Uncoded Rayleigh")

    # Repetition
    plt.semilogy(EbN0, ber_rep13_awgn, 'g--', label="Rep 1/3 (AWGN)")
    plt.semilogy(EbN0, ber_rep13_ray, 'g:', label="Rep 1/3 (Rayleigh)")

    plt.semilogy(EbN0, ber_rep15_awgn, 'm--', label="Rep 1/5 (AWGN)")
    plt.semilogy(EbN0, ber_rep15_ray, 'm:', label="Rep 1/5 (Rayleigh)")

    # Hamming
    plt.semilogy(EbN0, ber_h74_awgn, 'c-.', label="Ham (7,4) (AWGN)")
    plt.semilogy(EbN0, ber_h74_ray, 'c-', label="Ham (7,4) (Rayleigh)")

    plt.semilogy(EbN0, ber_h1511_awgn, 'y-.', label="Ham (15,11) (AWGN)")
    plt.semilogy(EbN0, ber_h1511_ray, 'y-', label="Ham (15,11) (Rayleigh)")

    plt.grid(True, which='both')
    plt.xlabel("Eb/N0 (dB)")
    plt.ylabel("Bit Error Rate (BER)")
    plt.title("BER Performance of BPSK (AWGN vs Rayleigh, coded & uncoded)")
    plt.legend()
    plt.ylim([1e-6, 1])

    plt.show()

    print("Done.")


#if __name__ == "__main__":
    #test_all_cases()
    #run_simulation()
