from flask import Flask, render_template, request, jsonify, redirect, url_for
import os
import math
import random
import heapq
import itertools
from collections import defaultdict, Counter

app = Flask(__name__)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/')
def loading():
    """Render the loading page first"""
    return render_template('loading.html')

@app.route('/index')
def index():
    """Render the main index page with the 3D carousel"""
    return render_template('index.html')

@app.route('/project1')
def project1():
    """Render the Project 1 page for information theory analysis"""
    return render_template('project1.html')

# ===============================================
# PROJECT 1 - Information Theory Analysis
# ===============================================
@app.route('/analyze', methods=['POST'])
def analyze_text():
    """Analyze text file and return entropy calculations"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        # Read the file content
        text = file.read().decode('utf-8')

        # Extract valid characters
        valid_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ,.123456789')
        characters = [char for char in text if char in valid_chars]

        if not characters:
            return jsonify({'error': 'No valid characters found in the file'}), 400

        # Store original text
        original_text = ''.join(characters)

        # Count character frequencies
        char_counts = defaultdict(int)
        for char in characters:
            char_counts[char] += 1

        # Calculate PMF
        total_chars = len(characters)
        pmf = {char: count/total_chars for char, count in char_counts.items()}

        # Calculate entropy H(X)
        entropy = 0
        for char, prob in pmf.items():
            if prob > 0:
                entropy -= prob * math.log2(prob)

        # Calculate relative entropy
        uniform_prob = 1 / len(pmf)
        relative_entropy = 0
        for char, prob in pmf.items():
            if prob > 0:
                relative_entropy += prob * math.log2(prob / uniform_prob)

        channel_error_probability = 0.05  # p = 5%
        bits_per_char = 6

        # Create a mapping of characters to 6-bit codes
        valid_chars_list = sorted(valid_chars)
        char_to_bits = {char: format(i, '06b') for i, char in enumerate(valid_chars_list)}
        bits_to_char = {bits: char for char, bits in char_to_bits.items()}

        # Converting text to bits (X -> X_coded)
        bit_sequence = ''.join([char_to_bits[char] for char in characters if char in char_to_bits])
        total_bits = len(bit_sequence)

        received_bits = []
        error_positions = []
        
        for i, bit in enumerate(bit_sequence):
            # For each bit, flip it with probability p
            if random.random() < channel_error_probability:
                flipped_bit = '0' if bit == '1' else '1'
                received_bits.append(flipped_bit)
                error_positions.append(i)
            else:
                received_bits.append(bit)
        
        received_bit_sequence = ''.join(received_bits)
        num_errors = len(error_positions)

        # Decoding bits back to characters (Y_received -> Y)
        decoded_chars = []
        for i in range(0, len(received_bit_sequence), bits_per_char):
            if i + bits_per_char <= len(received_bit_sequence):
                bits_chunk = received_bit_sequence[i:i+bits_per_char]
                if bits_chunk in bits_to_char:
                    decoded_chars.append(bits_to_char[bits_chunk])
                else:
                    decoded_chars.append('?')

        decoded_text = ''.join(decoded_chars)

        
        # Calculate conditional entropy H(Y|X) for binary symmetric channel
        # H(Y|X) = -p*log2(p) - (1-p)*log2(1-p) per bit
        if 0 < channel_error_probability < 1:
            h_p = (-channel_error_probability * math.log2(channel_error_probability) -
                   (1 - channel_error_probability) * math.log2(1 - channel_error_probability))
            conditional_entropy = bits_per_char * h_p
        else:
            conditional_entropy = 0

        # Calculate joint entropy H(X,Y) = H(X) + H(Y|X)
        joint_entropy = entropy + conditional_entropy
        
        total_characters = len(characters)
        correctly_decoded = sum(1 for i in range(min(len(original_text), len(decoded_text)))
                               if original_text[i] == decoded_text[i])
        
        # Bit-level error rate
        bit_error_rate = (num_errors / total_bits) * 100 if total_bits > 0 else 0
        
        # Character-level error rate
        character_error_rate = ((total_characters - correctly_decoded) / total_characters * 100 
                               if total_characters > 0 else 0)

        # Verify chain rule: H(X,Y) = H(X) + H(Y|X)
        chain_rule_verified = abs(joint_entropy - (entropy + conditional_entropy)) < 0.0001

        # Prepare response data
        response_data = {
            'pmf': pmf,
            'entropy': entropy,
            'relative_entropy': relative_entropy,
            'joint_entropy': joint_entropy,
            'conditional_entropy': conditional_entropy,
            'original_text': original_text[:200] + ('...' if len(original_text) > 200 else ''),
            'original_length': len(original_text),
            'encoded_bits': bit_sequence[:500] + ('...' if len(bit_sequence) > 500 else ''),
            'encoded_length': len(bit_sequence),
            'received_bits': received_bit_sequence[:500] + ('...' if len(received_bit_sequence) > 500 else ''),
            'decoded_text': decoded_text[:200] + ('...' if len(decoded_text) > 200 else ''),
            'decoded_length': len(decoded_text),
            'num_errors': num_errors,
            'error_positions_count': len(error_positions),
            'correctly_decoded': correctly_decoded,
            'bit_error_rate': round(bit_error_rate, 2),
            'character_error_rate': round(character_error_rate, 2),
            'expected_bit_error_rate': channel_error_probability * 100,
            'verification': chain_rule_verified,
            'chain_rule_lhs': round(joint_entropy, 4),
            'chain_rule_rhs': round(entropy + conditional_entropy, 4),
            'channel_error_probability': channel_error_probability
        }

        return jsonify(response_data)


# ===============================================
# PROJECT 2 - Source Coding Analysis
# ===============================================

# Huffman Code Implementation
def build_huffman_code(freqs):
    """Build a binary Huffman codebook from symbol frequencies."""
    counter = itertools.count()
    heap = [(w, next(counter), [[sym, ""]]) for sym, w in freqs.items()]
    heapq.heapify(heap)

    if len(heap) == 1:
        sym = heap[0][2][0][0]
        return {sym: "0"}

    while len(heap) > 1:
        w1, _, symcodes1 = heapq.heappop(heap)
        w2, _, symcodes2 = heapq.heappop(heap)

        for pair in symcodes1:
            pair[1] = '0' + pair[1]
        for pair in symcodes2:
            pair[1] = '1' + pair[1]

        merged_weight = w1 + w2
        merged_symbols = symcodes1 + symcodes2
        heapq.heappush(heap, (merged_weight, next(counter), merged_symbols))

    _, _, code_pairs = heap[0]
    return {sym: code for sym, code in code_pairs}


# Shannon-Fano Code Implementation
def build_fano_code(symbols_probs, prefix="", codebook=None):
    """Recursive Shannon-Fano code assignment."""
    if codebook is None:
        codebook = {}

    n = len(symbols_probs)
    if n == 1:
        sym, _ = symbols_probs[0]
        codebook[sym] = prefix or "0"
        return codebook

    total = sum(p for _, p in symbols_probs)
    cumulative = 0
    split = 0
    for i, (_, p) in enumerate(symbols_probs):
        cumulative += p
        if cumulative >= total / 2:
            split = i + 1
            break

    left = symbols_probs[:split]
    right = symbols_probs[split:]

    build_fano_code(left, prefix + "0", codebook)
    build_fano_code(right, prefix + "1", codebook)

    return codebook


# Fixed-length codes
def fixed_length_codes(M):
    """Generate fixed-length codes."""
    bits = math.ceil(math.log2(M)) if M > 1 else 1
    return {str(i+1): format(i, f'0{bits}b') for i in range(M)}, bits


def entropy_calc(probs):
    """Calculate entropy."""
    return -sum(p * math.log2(p) for p in probs.values() if p > 0)


def avg_length(codebook, probs):
    """Calculate average code length."""
    return sum(len(codebook[s]) * probs[s] for s in probs)


def encode_sequence(sequence, codebook):
    """Encode sequence using codebook."""
    return ''.join(codebook[s] for s in sequence)


def decode_sequence(bitstring, codebook):
    """Decode bitstring using codebook."""
    # Build decoding trie
    trie = {}
    for sym, code in codebook.items():
        node = trie
        for b in code:
            node = node.setdefault(b, {})
        node['_'] = sym
    
    # Decode
    res, node = [], trie
    for b in bitstring:
        node = node[b]
        if '_' in node:
            res.append(node['_'])
            node = trie
    return res


@app.route('/analyze_project2', methods=['POST'])
def analyze_project2():
    """Analyze text file for source coding (Part 1: Fixed M values)"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        text = file.read().decode('utf-8')
        
        if not text:
            return jsonify({'error': 'Empty file'}), 400

        # For Part 1, we'll analyze with M=4, 6, 8
        results = {}
        
        for M in [4, 6, 8]:
            # Define uniform probabilities
            probs = {str(i+1): 1/M for i in range(M)}
            H = entropy_calc(probs)
            
            # Fixed-length codes
            fixed_codes, fixed_bits = fixed_length_codes(M)
            avg_fixed = fixed_bits
            
            # Huffman codes
            huff_codes = build_huffman_code(probs)
            avg_huff = avg_length(huff_codes, probs)
            
            # Generate random sequence
            sequence = [str(random.randint(1, M)) for _ in range(30)]
            
            # Encode
            fixed_encoded = encode_sequence(sequence, fixed_codes)
            huff_encoded = encode_sequence(sequence, huff_codes)
            
            # Decode
            decoded_fixed = [str(int(fixed_encoded[i:i+fixed_bits], 2) + 1)
                           for i in range(0, len(fixed_encoded), fixed_bits)]
            decoded_huff = decode_sequence(huff_encoded, huff_codes)
            
            results[f'M{M}'] = {
                'M': M,
                'entropy': round(H, 4),
                'avg_fixed': round(avg_fixed, 4),
                'avg_huffman': round(avg_huff, 4),
                'huffman_efficiency': round(H / avg_huff, 4),
                'fixed_codes': fixed_codes,
                'huffman_codes': huff_codes,
                'sequence': ' '.join(sequence),
                'fixed_encoded': fixed_encoded,
                'huffman_encoded': huff_encoded,
                'fixed_bits': len(fixed_encoded),
                'huffman_bits': len(huff_encoded),
                'compression_ratio': round(len(huff_encoded)/len(fixed_encoded), 3),
                'fixed_lossless': decoded_fixed == sequence,
                'huffman_lossless': decoded_huff == sequence
            }
        
        return jsonify(results)


@app.route('/analyze_project2_custom', methods=['POST'])
def analyze_project2_custom():
    """Analyze text file for source coding (Part 2 & 4: Custom distributions and real text)"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        text = file.read().decode('utf-8')
        
        if not text:
            return jsonify({'error': 'Empty file'}), 400

        # Count character frequencies
        char_counts = Counter(text)
        total_chars = len(text)
        
        # Calculate PMF
        pmf = {char: count/total_chars for char, count in char_counts.items()}
        
        # Calculate entropy
        H = entropy_calc(pmf)
        
        # Get sorted symbols
        symbols = sorted(pmf.keys())
        M = len(symbols)
        
        # Build codes
        fixed_codes, fixed_bits = fixed_length_codes(M)
        fixed_codes_mapped = {symbols[i]: fixed_codes[str(i+1)] for i in range(M)}
        
        huffman_codes = build_huffman_code(pmf)
        
        # Sort by probability for Fano
        sorted_probs = sorted(pmf.items(), key=lambda x: x[1], reverse=True)
        fano_codes = build_fano_code(sorted_probs)
        
        # Calculate average lengths
        avg_fixed = fixed_bits
        avg_huffman = avg_length(huffman_codes, pmf)
        avg_fano = avg_length(fano_codes, pmf)
        
        # Encode text
        fixed_encoded = encode_sequence(text, fixed_codes_mapped)
        huffman_encoded = encode_sequence(text, huffman_codes)
        fano_encoded = encode_sequence(text, fano_codes)
        ascii_encoded = ''.join(format(ord(ch), '08b') for ch in text)
        
        # Calculate sizes and compression
        fixed_size = len(fixed_encoded)
        huffman_size = len(huffman_encoded)
        fano_size = len(fano_encoded)
        ascii_size = len(ascii_encoded)
        
        huffman_compression = (1 - huffman_size / ascii_size) * 100
        fano_compression = (1 - fano_size / ascii_size) * 100
        fixed_compression = (1 - fixed_size / ascii_size) * 100
        
        # Prepare code table (top 20 most frequent)
        top_chars = sorted(char_counts.items(), key=lambda x: x[1], reverse=True)[:20]
        code_table = []
        for char, count in top_chars:
            display_char = repr(char)[1:-1] if char in ['\n', '\t', '\r'] else char
            code_table.append({
                'char': display_char,
                'frequency': count,
                'probability': round(pmf[char], 6),
                'fixed': fixed_codes_mapped[char],
                'huffman': huffman_codes[char],
                'fano': fano_codes[char]
            })
        
        response_data = {
            'text_length': total_chars,
            'unique_chars': M,
            'entropy': round(H, 4),
            'avg_fixed': round(avg_fixed, 4),
            'avg_huffman': round(avg_huffman, 4),
            'avg_fano': round(avg_fano, 4),
            'fixed_size': fixed_size,
            'huffman_size': huffman_size,
            'fano_size': fano_size,
            'ascii_size': ascii_size,
            'huffman_compression': round(huffman_compression, 2),
            'fano_compression': round(fano_compression, 2),
            'fixed_compression': round(fixed_compression, 2),
            'huffman_efficiency': round(H / avg_huffman * 100, 2),
            'fano_efficiency': round(H / avg_fano * 100, 2),
            'code_table': code_table,
            'sample_text': text[:200] + ('...' if len(text) > 200 else ''),
            'huffman_sample': huffman_encoded[:200] + ('...' if len(huffman_encoded) > 200 else ''),
            'fano_sample': fano_encoded[:200] + ('...' if len(fano_encoded) > 200 else '')
        }

        return jsonify(response_data)


if __name__ == '__main__':
    app.run(debug=True)
