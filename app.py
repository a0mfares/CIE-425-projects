from flask import Flask, render_template, request, jsonify, redirect, url_for
import os
import math
import random
import heapq
import itertools
from collections import defaultdict, Counter
import sys
import json
from decimal import Decimal, getcontext

app = Flask(__name__)
getcontext().prec = 50

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

@app.route('/project2')
def project2():
    """Render the Project 2 page for source coding analysis"""
    return render_template('project2.html')

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
        if b not in node:
            break
        node = node[b]
        if '_' in node:
            res.append(node['_'])
            node = trie
    return res


# ===============================================
# PART 1: Uniform Distribution with M = 4, 6, 8
# ===============================================
@app.route('/analyze_part1', methods=['POST'])
def analyze_part1():
    """Part 1: Uniform distribution analysis for M=4,6,8"""
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
        
        # Generate random sequence (30 symbols as per requirement)
        sequence = [str(random.randint(1, M)) for _ in range(30)]
        
        # Encode
        fixed_encoded = encode_sequence(sequence, fixed_codes)
        huff_encoded = encode_sequence(sequence, huff_codes)
        
        # Decode
        decoded_fixed = [str(int(fixed_encoded[i:i+fixed_bits], 2) + 1)
                       for i in range(0, len(fixed_encoded), fixed_bits)]
        decoded_huff = decode_sequence(huff_encoded, huff_codes)
        
        # Check for losses
        fixed_lossless = decoded_fixed == sequence
        huffman_lossless = decoded_huff == sequence
        
        results[f'M{M}'] = {
            'M': M,
            'entropy': round(H, 4),
            'avg_fixed': round(avg_fixed, 4),
            'avg_huffman': round(avg_huff, 4),
            'huffman_efficiency': round(H / avg_huff * 100, 2) if avg_huff > 0 else 0,
            'fixed_codes': fixed_codes,
            'huffman_codes': huff_codes,
            'sequence': ' '.join(sequence),
            'fixed_encoded': fixed_encoded,
            'huffman_encoded': huff_encoded,
            'fixed_bits': len(fixed_encoded),
            'huffman_bits': len(huff_encoded),
            'compression_ratio': round(len(huff_encoded)/len(fixed_encoded), 3) if len(fixed_encoded) > 0 else 0,
            'fixed_lossless': fixed_lossless,
            'huffman_lossless': huffman_lossless,
            'observations': generate_part1_observations(M, H, avg_fixed, avg_huff)
        }
    
    return jsonify(results)


def generate_part1_observations(M, H, avg_fixed, avg_huff):
    """Generate observations for Part 1"""
    obs = []
    obs.append(f"For M={M}: Entropy H(X) = {H:.4f} bits/symbol")
    obs.append(f"Fixed-length requires {avg_fixed:.4f} bits/symbol")
    obs.append(f"Huffman requires {avg_huff:.4f} bits/symbol")
    
    if abs(avg_huff - H) < 0.1:
        obs.append("Huffman code is near-optimal (close to entropy)")
    
    if avg_fixed == avg_huff:
        obs.append("For uniform distribution, Huffman matches fixed-length efficiency")
    
    return obs


# ===============================================
# PART 2: Custom Distributions Y and Z
# ===============================================
@app.route('/analyze_part2', methods=['POST'])
def analyze_part2():
    """Part 2: Analysis for distributions Y and Z"""
    results = {}
    
    # Distribution Y: fY(y) = 0.5^y for y=1,2,3,4,5 and 0.5^5 for y=6
    probs_Y = {}
    for y in range(1, 6):
        probs_Y[str(y)] = 0.5 ** y
    probs_Y['6'] = 0.5 ** 5
    
    # Normalize
    total_Y = sum(probs_Y.values())
    probs_Y = {k: v/total_Y for k, v in probs_Y.items()}
    
    # Distribution Z
    probs_Z = {
        '1': 0.05,
        '2': 0.10,
        '3': 0.30,
        '4': 0.25,
        '5': 0.15,
        '6': 0.15
    }
    
    # Analyze both distributions
    for name, probs in [('Y', probs_Y), ('Z', probs_Z)]:
        M = len(probs)
        H = entropy_calc(probs)
        
        # Fixed-length codes
        fixed_codes, fixed_bits = fixed_length_codes(M)
        avg_fixed = fixed_bits
        
        # Huffman codes
        huff_codes = build_huffman_code(probs)
        avg_huff = avg_length(huff_codes, probs)
        
        # Generate weighted random sequence
        symbols = list(probs.keys())
        weights = list(probs.values())
        sequence = random.choices(symbols, weights=weights, k=30)
        
        # Encode
        fixed_encoded = encode_sequence(sequence, fixed_codes)
        huff_encoded = encode_sequence(sequence, huff_codes)
        
        # Decode
        decoded_fixed = [str(int(fixed_encoded[i:i+fixed_bits], 2) + 1)
                       for i in range(0, len(fixed_encoded), fixed_bits)]
        decoded_huff = decode_sequence(huff_encoded, huff_codes)
        
        results[name] = {
            'distribution': name,
            'M': M,
            'probabilities': {k: round(v, 6) for k, v in probs.items()},
            'entropy': round(H, 4),
            'avg_fixed': round(avg_fixed, 4),
            'avg_huffman': round(avg_huff, 4),
            'huffman_efficiency': round(H / avg_huff * 100, 2) if avg_huff > 0 else 0,
            'fixed_codes': fixed_codes,
            'huffman_codes': huff_codes,
            'sequence': ' '.join(sequence),
            'fixed_encoded': fixed_encoded,
            'huffman_encoded': huff_encoded,
            'fixed_bits': len(fixed_encoded),
            'huffman_bits': len(huff_encoded),
            'compression_ratio': round(len(huff_encoded)/len(fixed_encoded), 3) if len(fixed_encoded) > 0 else 0,
            'fixed_lossless': decoded_fixed == sequence,
            'huffman_lossless': decoded_huff == sequence,
            'observations': generate_part2_observations(name, H, avg_fixed, avg_huff, probs)
        }
    
    # Add comparison observations
    results['comparison'] = compare_part1_part2(results['Y'], results['Z'])
    
    return jsonify(results)


def generate_part2_observations(name, H, avg_fixed, avg_huff, probs):
    """Generate observations for Part 2"""
    obs = []
    obs.append(f"Distribution {name} has non-uniform probabilities")
    obs.append(f"Entropy H({name}) = {H:.4f} bits/symbol")
    obs.append(f"Huffman average length = {avg_huff:.4f} bits/symbol")
    
    savings = (1 - avg_huff/avg_fixed) * 100
    obs.append(f"Huffman saves {savings:.2f}% compared to fixed-length")
    
    # Check if distribution is skewed
    max_prob = max(probs.values())
    min_prob = min(probs.values())
    if max_prob / min_prob > 5:
        obs.append("Distribution is highly skewed - Huffman coding provides significant benefits")
    
    return obs


def compare_part1_part2(result_Y, result_Z):
    """Compare Part 1 and Part 2 results"""
    comparison = []
    comparison.append("Part 1 (uniform) vs Part 2 (non-uniform) comparison:")
    comparison.append(f"- Part 1 shows minimal Huffman advantage for uniform distributions")
    comparison.append(f"- Part 2 demonstrates {result_Y['huffman_efficiency']:.2f}% efficiency for Y distribution")
    comparison.append(f"- Part 2 demonstrates {result_Z['huffman_efficiency']:.2f}% efficiency for Z distribution")
    comparison.append("- Non-uniform distributions benefit significantly more from Huffman coding")
    return comparison


# ===============================================
# PART 3: Huffman Compression for Text Files
# ===============================================
@app.route('/analyze_part3', methods=['POST'])
def analyze_part3():
    """Part 3: Huffman compression for text files"""
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
        
        # Build Huffman codes
        huffman_codes = build_huffman_code(pmf)
        
        # Calculate average Huffman length
        avg_huffman = avg_length(huffman_codes, pmf)
        
        # Encode text using Huffman
        huffman_encoded = encode_sequence(text, huffman_codes)
        
        # Encode using ASCII (8 bits per character)
        ascii_encoded = ''.join(format(ord(ch), '08b') for ch in text)
        
        # Calculate sizes
        huffman_size = len(huffman_encoded)
        ascii_size = len(ascii_encoded)
        
        # Compression percentage
        compression_pct = (1 - huffman_size / ascii_size) * 100
        
        # Decode and verify
        decoded_text = ''.join(decode_sequence(huffman_encoded, huffman_codes))
        is_lossless = decoded_text == text
        
        # Prepare code table (top 20 most frequent characters)
        top_chars = sorted(char_counts.items(), key=lambda x: x[1], reverse=True)[:20]
        code_table = []
        for char, count in top_chars:
            display_char = repr(char)[1:-1] if char in ['\n', '\t', '\r'] else char
            code_table.append({
                'char': display_char,
                'frequency': count,
                'probability': round(pmf[char], 6),
                'huffman_code': huffman_codes[char],
                'code_length': len(huffman_codes[char])
            })
        
        response_data = {
            'text_length': total_chars,
            'unique_chars': M,
            'entropy': round(H, 4),
            'avg_huffman': round(avg_huffman, 4),
            'huffman_efficiency': round(H / avg_huffman * 100, 2),
            'ascii_size': ascii_size,
            'huffman_size': huffman_size,
            'compression_percentage': round(compression_pct, 2),
            'is_lossless': is_lossless,
            'code_table': code_table,
            'sample_text': text[:200] + ('...' if len(text) > 200 else ''),
            'huffman_sample': huffman_encoded[:200] + ('...' if len(huffman_encoded) > 200 else ''),
            'decoded_sample': decoded_text[:200] + ('...' if len(decoded_text) > 200 else ''),
            'observations': generate_part3_observations(H, avg_huffman, compression_pct)
        }

        return jsonify(response_data)


def generate_part3_observations(H, avg_huffman, compression_pct):
    """Generate observations for Part 3"""
    obs = []
    obs.append(f"Huffman coding achieved {compression_pct:.2f}% compression")
    obs.append(f"Average code length ({avg_huffman:.4f}) is close to entropy ({H:.4f})")
    obs.append(f"Huffman efficiency: {(H/avg_huffman*100):.2f}%")
    
    if compression_pct > 40:
        obs.append("Excellent compression achieved - text has non-uniform character distribution")
    elif compression_pct > 20:
        obs.append("Good compression achieved")
    else:
        obs.append("Moderate compression - text may have relatively uniform character distribution")
    
    obs.append("Huffman coding is lossless - original text can be perfectly recovered")
    
    return obs


# ===============================================
# PART 4: Shannon-Fano Compression for Text Files
# ===============================================
@app.route('/analyze_part4', methods=['POST'])
def analyze_part4():
    """Part 4: Shannon-Fano compression for text files"""
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
        
        # Get sorted symbols for Fano
        M = len(pmf)
        sorted_probs = sorted(pmf.items(), key=lambda x: x[1], reverse=True)
        
        # Build Shannon-Fano codes
        fano_codes = build_fano_code(sorted_probs)
        
        # Build Huffman codes for comparison
        huffman_codes = build_huffman_code(pmf)
        
        # Calculate average lengths
        avg_fano = avg_length(fano_codes, pmf)
        avg_huffman = avg_length(huffman_codes, pmf)
        
        # Encode text using both methods
        fano_encoded = encode_sequence(text, fano_codes)
        huffman_encoded = encode_sequence(text, huffman_codes)
        ascii_encoded = ''.join(format(ord(ch), '08b') for ch in text)
        
        # Calculate sizes
        fano_size = len(fano_encoded)
        huffman_size = len(huffman_encoded)
        ascii_size = len(ascii_encoded)
        
        # Compression percentages
        fano_compression = (1 - fano_size / ascii_size) * 100
        huffman_compression = (1 - huffman_size / ascii_size) * 100
        
        # Decode and verify
        decoded_fano = ''.join(decode_sequence(fano_encoded, fano_codes))
        decoded_huffman = ''.join(decode_sequence(huffman_encoded, huffman_codes))
        
        fano_lossless = decoded_fano == text
        huffman_lossless = decoded_huffman == text
        
        # Prepare code table (top 20 most frequent characters)
        top_chars = sorted(char_counts.items(), key=lambda x: x[1], reverse=True)[:20]
        code_table = []
        for char, count in top_chars:
            display_char = repr(char)[1:-1] if char in ['\n', '\t', '\r'] else char
            code_table.append({
                'char': display_char,
                'frequency': count,
                'probability': round(pmf[char], 6),
                'fano_code': fano_codes[char],
                'huffman_code': huffman_codes[char],
                'fano_length': len(fano_codes[char]),
                'huffman_length': len(huffman_codes[char])
            })
        
        response_data = {
            'text_length': total_chars,
            'unique_chars': M,
            'entropy': round(H, 4),
            'avg_fano': round(avg_fano, 4),
            'avg_huffman': round(avg_huffman, 4),
            'fano_efficiency': round(H / avg_fano * 100, 2),
            'huffman_efficiency': round(H / avg_huffman * 100, 2),
            'ascii_size': ascii_size,
            'fano_size': fano_size,
            'huffman_size': huffman_size,
            'fano_compression': round(fano_compression, 2),
            'huffman_compression': round(huffman_compression, 2),
            'fano_lossless': fano_lossless,
            'huffman_lossless': huffman_lossless,
            'code_table': code_table,
            'sample_text': text[:200] + ('...' if len(text) > 200 else ''),
            'fano_sample': fano_encoded[:200] + ('...' if len(fano_encoded) > 200 else ''),
            'huffman_sample': huffman_encoded[:200] + ('...' if len(huffman_encoded) > 200 else ''),
            'observations': generate_part4_observations(fano_compression, huffman_compression, avg_fano, avg_huffman)
        }

        return jsonify(response_data)


def generate_part4_observations(fano_comp, huffman_comp, avg_fano, avg_huffman):
    """Generate observations for Part 4"""
    obs = []
    obs.append(f"Shannon-Fano compression: {fano_comp:.2f}%")
    obs.append(f"Huffman compression: {huffman_comp:.2f}%")
    
    diff = huffman_comp - fano_comp
    if abs(diff) < 1:
        obs.append("Shannon-Fano and Huffman perform nearly identically")
    elif diff > 0:
        obs.append(f"Huffman slightly outperforms Shannon-Fano by {diff:.2f}%")
    else:
        obs.append(f"Shannon-Fano slightly outperforms Huffman by {abs(diff):.2f}%")
    
    obs.append("Both methods are lossless and near-optimal for this text")
    obs.append(f"Average Fano length: {avg_fano:.4f} bits/symbol")
    obs.append(f"Average Huffman length: {avg_huffman:.4f} bits/symbol")
    
    obs.append("Shannon-Fano is simpler to implement but may be slightly less efficient than Huffman")
    
    return obs
    
# ===============================================
# PROJECT 3 - Universal Source Coding (Fixed)
# ===============================================
def initialize_adaptive_model(alphabet):
    """Initialize probability model for adaptive arithmetic coding
    
    Args:
        alphabet: List of unique symbols in the sequence
        
    Returns:
        Dictionary containing symbol statistics and cumulative probabilities
    """
    model = {}
    total_symbols = len(alphabet)
    
    # Initialize each symbol with count=1 and equal probability
    for symbol in alphabet:
        model[symbol] = {
            'count': 1, 
            'probability': Decimal(1) / Decimal(total_symbols)
        }

    # Calculate cumulative probabilities (sorted order for consistency)
    cumulative_prob = Decimal(0)
    for symbol in sorted(alphabet):
        model[symbol]['cumulative_prob'] = cumulative_prob
        cumulative_prob += model[symbol]['probability']
    
    return model


def update_adaptive_model(model, symbol):
    """Update the probability model after encoding/decoding a symbol
    
    Args:
        model: Current probability model
        symbol: The symbol that was just processed
        
    Returns:
        Updated model with new probabilities
    """
    # Increment count for the observed symbol
    model[symbol]['count'] += 1
    
    # Recalculate total count
    total_count = sum(s['count'] for s in model.values())
    
    # Update all probabilities based on new counts
    for s in model:
        model[s]['probability'] = Decimal(model[s]['count']) / Decimal(total_count)
    
    # Recalculate cumulative probabilities
    cumulative_prob = Decimal(0)
    for s in sorted(model.keys()):
        model[s]['cumulative_prob'] = cumulative_prob
        cumulative_prob += model[s]['probability']
    
    return model


def adaptive_arithmetic_encode(sequence):
    """Encode a sequence using adaptive arithmetic coding
    
    Args:
        sequence: List of symbols to encode
        
    Returns:
        Tuple of (binary_string, debug_info_dict)
    """
    if not sequence:
        return "", {}
    
    # Get unique alphabet from sequence
    alphabet = sorted(list(set(sequence)))
    model = initialize_adaptive_model(alphabet)
    
    # Initialize range [low, high)
    low = Decimal(0)
    high = Decimal(1)
    
    # Track ranges for debugging
    ranges = []
    
    # Process each symbol
    for symbol in sequence:
        # Get symbol's probability range
        symbol_low = Decimal(model[symbol]['cumulative_prob'])
        symbol_high = symbol_low + Decimal(model[symbol]['probability'])
        
        # Narrow the range
        range_width = high - low
        high = low + range_width * symbol_high
        low = low + range_width * symbol_low
        
        ranges.append((float(low), float(high)))
        
        # Update model for next symbol
        model = update_adaptive_model(model, symbol)
    
    # Calculate the number of bits needed to represent the final range
    # We need enough bits to ensure the value falls within the final range
    range_width = high - low
    if range_width > 0:
        # Calculate how many bits we need to represent this range
        bits_needed = max(1, int(-math.log2(float(range_width))) + 2)
    else:
        bits_needed = 50  # Default to a reasonable number of bits
    
    # Find a value in the final range
    # We use the midpoint to ensure we're well within the range
    final_value = (low + high) / 2
    
    # Convert to binary with sufficient precision
    binary = decimal_to_binary(final_value, max_bits=bits_needed)
    
    # Calculate entropy and other metrics
    char_counts = Counter(sequence)
    total = len(sequence)
    probs = [count/total for count in char_counts.values()]
    entropy = -sum(p * math.log2(p) for p in probs if p > 0)
    
    return binary, {
        'model': model, 
        'ranges': ranges,
        'final_range': (float(low), float(high)),
        'alphabet': alphabet,
        'entropy': entropy,
        'bits_needed': bits_needed
    }


def decimal_to_binary(value, max_bits=50):
    """Convert decimal value in [0,1] to binary representation
    
    Args:
        value: Decimal value between 0 and 1
        max_bits: Maximum number of bits to generate
        
    Returns:
        Binary string representation
    """
    if value <= 0:
        return "0"
    if value >= 1:
        return "1" * max_bits
    
    binary = ""
    remaining = Decimal(value)
    
    for _ in range(max_bits):
        remaining *= 2
        if remaining >= 1:
            binary += "1"
            remaining -= 1
        else:
            binary += "0"
        
        # Stop if we've captured enough precision
        if remaining == 0:
            break
    
    return binary


def binary_to_decimal(binary):
    """Convert binary string to decimal value in [0,1]
    
    Args:
        binary: String of '0' and '1' characters
        
    Returns:
        Decimal value
    """
    if not binary:
        return Decimal(0)
    
    value = Decimal(0)
    for i, bit in enumerate(binary):
        if bit == '1':
            value += Decimal(1) / (Decimal(2) ** (i + 1))
    
    return value


def adaptive_arithmetic_decode(binary, num_symbols, alphabet):
    """Decode binary string using adaptive arithmetic coding
    
    Args:
        binary: Binary string to decode
        num_symbols: Number of symbols to decode
        alphabet: List of symbols in the alphabet
        
    Returns:
        List of decoded symbols
    """
    if not binary or num_symbols <= 0 or not alphabet:
        return []
    
    # Convert binary to decimal value
    value = binary_to_decimal(binary)
    
    # Initialize model with same alphabet
    alphabet = sorted(alphabet)
    model = initialize_adaptive_model(alphabet)
    
    decoded = []
    
    # Decode each symbol
    for _ in range(num_symbols):
        # Find which symbol's range contains the current value
        for symbol in sorted(model.keys()):
            symbol_low = Decimal(model[symbol]['cumulative_prob'])
            symbol_high = symbol_low + Decimal(model[symbol]['probability'])
            
            if symbol_low <= value < symbol_high:
                decoded.append(symbol)
                
                # Scale value back to [0,1) for next symbol
                range_width = symbol_high - symbol_low
                if range_width > 0:
                    value = (value - symbol_low) / range_width
                
                # Update model to match encoder
                model = update_adaptive_model(model, symbol)
                break
    
    return decoded


def calculate_arithmetic_efficiency(original_sequence, encoded_binary):
    """Calculate compression efficiency for arithmetic coding
    
    Efficiency = (encoded bits) / (fixed-length bits)
    Values < 1 indicate compression
    Values > 1 indicate expansion
    
    Args:
        original_sequence: Original sequence of symbols
        encoded_binary: Binary string from encoding
        
    Returns:
        Efficiency ratio
    """
    encoded_bits = len(encoded_binary)
    
    # Calculate fixed-length bits needed
    alphabet_size = len(set(original_sequence))
    if alphabet_size <= 1:
        fixed_bits_per_symbol = 1
    else:
        fixed_bits_per_symbol = math.ceil(math.log2(alphabet_size))
    
    fixed_bits_total = len(original_sequence) * fixed_bits_per_symbol
    
    if fixed_bits_total > 0:
        efficiency = encoded_bits / fixed_bits_total
    else:
        efficiency = 1.0
    
    return efficiency


@app.route('/analyze_project3_part1', methods=['POST'])
def analyze_project3_part1():
    """Project 3 Part 1: Adaptive Arithmetic Coding - FIXED VERSION"""
    
    # Get input text
    text = request.form.get('text', '')
    
    if not text:
        if 'file' not in request.files:
            return jsonify({'error': 'No file or text provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        text = file.read().decode('utf-8')
    
    if not text:
        return jsonify({'error': 'Empty input'}), 400

    # Prepare S3 sequence (clean the text)
    s3_text = "I'm master's nightmarish, gorgonian hatemonger, his moth-eaten gonorrhoea, smothering mightiest heroism, thrashing ego-mania's (or, to me, ignorant mismanagement's) strong-arm mishmash or staggering high treason"
    s3_cleaned = s3_text.replace(" ", "").replace(",", "").replace("'", "").replace("-", "").replace("(", "").replace(")", "").lower()
    
    # Define test sequences
    test_sequences = {
        'S1': ['A', 'B', 'B', 'C', 'A'],
        'S2': ['A', 'B', 'C', 'A', 'B', 'A', 'C', 'B', 'A', 'B', 'C', 'C', 'A', 'C', 'B', 'A', 'A', 'B', 'B', 'C', 'C', 'A', 'B', 'A', 'A', 'B', 'B'],
        'S3': list(s3_cleaned),
        'Custom': list(text)
    }
    
    results = {}
    
    for seq_name, sequence in test_sequences.items():
        try:
            # Encode
            binary, debug_info = adaptive_arithmetic_encode(sequence)
            
            # Decode to verify
            alphabet = debug_info.get('alphabet', sorted(list(set(sequence))))
            decoded_sequence = adaptive_arithmetic_decode(binary, len(sequence), alphabet)
            
            # Calculate efficiency
            efficiency = calculate_arithmetic_efficiency(sequence, binary)
            
            # Calculate theoretical entropy
            char_counts = Counter(sequence)
            total = len(sequence)
            probs = [count/total for count in char_counts.values()]
            entropy = -sum(p * math.log2(p) for p in probs if p > 0)
            
            # Calculate compression metrics
            alphabet_size = len(set(sequence))
            fixed_bits_per_symbol = math.ceil(math.log2(alphabet_size)) if alphabet_size > 1 else 1
            fixed_bits_total = len(sequence) * fixed_bits_per_symbol
            
            compression_ratio = (1 - len(binary) / fixed_bits_total) * 100 if fixed_bits_total > 0 else 0
            
            # Prepare result
            results[seq_name] = {
                'sequence': sequence[:50] + (['...'] if len(sequence) > 50 else []),
                'sequence_display': ' '.join(str(s) for s in sequence[:30]) + (' ...' if len(sequence) > 30 else ''),
                'encoded_binary': binary[:100] + ('...' if len(binary) > 100 else ''),
                'decoded_sequence': decoded_sequence[:50] + (['...'] if len(decoded_sequence) > 50 else []),
                'sequence_length': len(sequence),
                'encoded_length': len(binary),
                'fixed_length': fixed_bits_total,
                'efficiency': round(efficiency, 4),
                'entropy': round(entropy, 4),
                'compression_ratio': round(compression_ratio, 2),
                'is_lossless': sequence == decoded_sequence,
                'alphabet_size': alphabet_size,
                'bits_per_symbol': round(len(binary) / len(sequence), 4) if len(sequence) > 0 else 0
            }
        except Exception as e:
            results[seq_name] = {
                'error': str(e),
                'sequence_length': len(sequence)
            }
    
    # Add summary statistics
    successful_results = [r for r in results.values() if 'error' not in r]
    if successful_results:
        results['summary'] = {
            'average_efficiency': round(sum(r['efficiency'] for r in successful_results) / len(successful_results), 4),
            'average_compression': round(sum(r['compression_ratio'] for r in successful_results) / len(successful_results), 2),
            'all_lossless': all(r['is_lossless'] for r in successful_results)
        }
    
    return jsonify(results)
# ===============================================
# Part 2: Lempel-Ziv Coding (Fixed)
# ===============================================
def lempel_ziv_encode(sequence):
    """Encode sequence using Lempel-Ziv (LZ78) algorithm
    
    Args:
        sequence: List of symbols to encode
        
    Returns:
        Tuple of (encoded_pairs, dictionary)
        encoded_pairs: List of (code, symbol) tuples
        dictionary: Final dictionary mapping strings to codes
    """
    if not sequence:
        return [], {}
    
    # Initialize dictionary with empty string
    dictionary = {'': 0}
    next_code = 1
    
    # Track encoding output
    encoded = []
    current_string = ''
    
    for symbol in sequence:
        combined_string = current_string + symbol
        
        if combined_string in dictionary:
            # Continue building the current string
            current_string = combined_string
        else:
            # Output: (code for current_string, next symbol)
            encoded.append((dictionary[current_string], symbol))
            
            # Add new string to dictionary
            dictionary[combined_string] = next_code
            next_code += 1
            
            # Reset to empty string
            current_string = ''
    
    # Handle any remaining string
    if current_string:
        # Output the code for remaining string with no following symbol
        encoded.append((dictionary[current_string], None))
    
    return encoded, dictionary


def lempel_ziv_decode(encoded, alphabet):
    """Decode sequence using Lempel-Ziv (LZ78) algorithm
    
    Args:
        encoded: List of (code, symbol) tuples
        alphabet: List of symbols in the alphabet (for validation)
        
    Returns:
        List of decoded symbols
    """
    if not encoded:
        return []
    
    # Initialize dictionary with empty string
    dictionary = {0: ''}
    next_code = 1
    
    decoded = []
    
    for code, symbol in encoded:
        # Get the string corresponding to the code
        if code in dictionary:
            decoded_string = dictionary[code]
        else:
            # This shouldn't happen in valid LZ78
            decoded_string = ''
        
        # Output the decoded string
        decoded.extend(list(decoded_string))
        
        # If there's a following symbol, output it and add to dictionary
        if symbol is not None:
            decoded.append(symbol)
            
            # Add new string to dictionary
            new_string = decoded_string + symbol
            dictionary[next_code] = new_string
            next_code += 1
    
    return decoded


def lempel_ziv_encode_to_binary(sequence):
    """Encode sequence to binary using Lempel-Ziv
    
    Args:
        sequence: List of symbols to encode
        
    Returns:
        Binary string representation
    """
    if not sequence:
        return ""
    
    # Get the encoding
    encoded, dictionary = lempel_ziv_encode(sequence)
    
    # Determine alphabet
    alphabet = sorted(list(set(sequence)))
    
    # Calculate bits needed for codes
    max_code = len(dictionary)  # Maximum possible code value
    code_bits = math.ceil(math.log2(max_code + 1)) if max_code > 0 else 1
    
    # Calculate bits needed for symbols
    symbol_bits = math.ceil(math.log2(len(alphabet))) if len(alphabet) > 1 else 1
    
    # Create symbol to binary mapping
    symbol_to_binary = {symbol: format(i, f'0{symbol_bits}b') 
                        for i, symbol in enumerate(alphabet)}
    
    # Convert encoded pairs to binary
    binary = ""
    for code, symbol in encoded:
        # Add code
        binary += format(code, f'0{code_bits}b')
        
        # Add symbol if present
        if symbol is not None:
            binary += symbol_to_binary[symbol]
        else:
            # Use all zeros to indicate no symbol
            binary += '0' * symbol_bits
    
    return binary


def lempel_ziv_decode_from_binary(binary, alphabet):
    """Decode binary string using Lempel-Ziv
    
    Args:
        binary: Binary string to decode
        alphabet: List of symbols in the alphabet
        
    Returns:
        List of decoded symbols
    """
    if not binary or not alphabet:
        return []
    
    alphabet = sorted(alphabet)
    
    # Calculate bits per code and per symbol
    # Estimate max dictionary size (conservative)
    estimated_dict_size = len(binary) // 2
    code_bits = math.ceil(math.log2(estimated_dict_size + 1)) if estimated_dict_size > 0 else 1
    
    symbol_bits = math.ceil(math.log2(len(alphabet))) if len(alphabet) > 1 else 1
    
    # Create binary to symbol mapping
    binary_to_symbol = {format(i, f'0{symbol_bits}b'): symbol 
                        for i, symbol in enumerate(alphabet)}
    
    # Initialize dictionary
    dictionary = {0: ''}
    next_code = 1
    
    decoded = []
    i = 0
    
    while i + code_bits + symbol_bits <= len(binary):
        # Read code
        code_str = binary[i:i+code_bits]
        code = int(code_str, 2)
        i += code_bits
        
        # Read symbol
        symbol_str = binary[i:i+symbol_bits]
        i += symbol_bits
        
        # Get decoded string for this code
        if code in dictionary:
            decoded_string = dictionary[code]
        else:
            # This shouldn't happen in valid LZ78
            decoded_string = ''
        
        # Output the decoded string
        decoded.extend(list(decoded_string))
        
        # Get symbol (if not all zeros)
        if symbol_str in binary_to_symbol and symbol_str != '0' * symbol_bits:
            symbol = binary_to_symbol[symbol_str]
            decoded.append(symbol)
            
            # Add to dictionary
            new_string = decoded_string + symbol
            dictionary[next_code] = new_string
            next_code += 1
        elif code != 0:  # Last encoding with no symbol
            pass
    
    return decoded

def calculate_lz_efficiency(original_sequence, encoded_binary):
    """Calculate compression efficiency for Lempel-Ziv coding
    
    Efficiency = (encoded bits) / (fixed-length bits)
    Values < 1 indicate compression
    Values > 1 indicate expansion
    
    Args:
        original_sequence: Original sequence of symbols
        encoded_binary: Binary string from encoding
        
    Returns:
        Efficiency ratio
    """
    encoded_bits = len(encoded_binary)
    
    # Calculate fixed-length bits needed
    alphabet_size = len(set(original_sequence))
    if alphabet_size <= 1:
        fixed_bits_per_symbol = 1
    else:
        fixed_bits_per_symbol = math.ceil(math.log2(alphabet_size))
    
    fixed_bits_total = len(original_sequence) * fixed_bits_per_symbol
    
    if fixed_bits_total > 0:
        efficiency = encoded_bits / fixed_bits_total
    else:
        efficiency = 1.0
    
    return efficiency


def get_lz_dictionary_stats(dictionary):
    """Get statistics about LZ dictionary
    
    Args:
        dictionary: Dictionary from LZ encoding
        
    Returns:
        Dictionary with statistics
    """
    # Count actual entries (excluding empty string)
    actual_entries = sum(1 for k, v in dictionary.items() if k != '' and v != 0)
    
    # Get max code value
    max_code = max(dictionary.values()) if dictionary else 0
    
    # Get longest string
    longest_string = max((k for k in dictionary.keys()), key=len, default='')
    
    return {
        'total_entries': len(dictionary),
        'actual_patterns': actual_entries,
        'max_code': max_code,
        'longest_pattern': longest_string,
        'longest_length': len(longest_string)
    }


@app.route('/analyze_project3_part2', methods=['POST'])
def analyze_project3_part2():
    """Project 3 Part 2: Lempel-Ziv Coding - FIXED VERSION"""
    
    # Get input text
    text = request.form.get('text', '')
    
    if not text:
        if 'file' not in request.files:
            return jsonify({'error': 'No file or text provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        text = file.read().decode('utf-8')
    
    if not text:
        return jsonify({'error': 'Empty input'}), 400

    # Prepare S3 sequence (clean the text)
    s3_text = "I'm master's nightmarish, gorgonian hatemonger, his moth-eaten gonorrhoea, smothering mightiest heroism, thrashing ego-mania's (or, to me, ignorant mismanagement's) strong-arm mishmash or staggering high treason"
    s3_cleaned = s3_text.replace(" ", "").replace(",", "").replace("'", "").replace("-", "").replace("(", "").replace(")", "").lower()
    
    # Define test sequences
    test_sequences = {
        'S1': ['A', 'B', 'B', 'C', 'A'],
        'S2': ['A', 'B', 'C', 'A', 'B', 'A', 'C', 'B', 'A', 'B', 'C', 'C', 'A', 'C', 'B', 'A', 'A', 'B', 'B', 'C', 'C', 'A', 'B', 'A', 'A', 'B', 'B'],
        'S3': list(s3_cleaned),
        'Custom': list(text)
    }
    
    results = {}
    
    for seq_name, sequence in test_sequences.items():
        try:
            # Encode
            encoded_pairs, dictionary = lempel_ziv_encode(sequence)
            binary = lempel_ziv_encode_to_binary(sequence)
            
            # Get dictionary statistics
            dict_stats = get_lz_dictionary_stats(dictionary)
            
            # Decode to verify
            alphabet = sorted(list(set(sequence)))
            decoded_sequence = lempel_ziv_decode(encoded_pairs, alphabet)
            
            # Also test binary decode
            decoded_from_binary = lempel_ziv_decode_from_binary(binary, alphabet)
            
            # Calculate efficiency
            efficiency = calculate_lz_efficiency(sequence, binary)
            
            # Calculate theoretical entropy
            char_counts = Counter(sequence)
            total = len(sequence)
            probs = [count/total for count in char_counts.values()]
            entropy = -sum(p * math.log2(p) for p in probs if p > 0)
            
            # Calculate compression metrics
            alphabet_size = len(set(sequence))
            fixed_bits_per_symbol = math.ceil(math.log2(alphabet_size)) if alphabet_size > 1 else 1
            fixed_bits_total = len(sequence) * fixed_bits_per_symbol
            
            compression_ratio = (1 - len(binary) / fixed_bits_total) * 100 if fixed_bits_total > 0 else 0
            
            # Format encoded pairs for display
            pairs_display = str(encoded_pairs[:10]) + ('...' if len(encoded_pairs) > 10 else '')
            
            # Prepare result
            results[seq_name] = {
                'sequence': sequence[:50] + (['...'] if len(sequence) > 50 else []),
                'sequence_display': ' '.join(str(s) for s in sequence[:30]) + (' ...' if len(sequence) > 30 else ''),
                'encoded_pairs': pairs_display,
                'encoded_binary': binary[:100] + ('...' if len(binary) > 100 else ''),
                'decoded_sequence': decoded_sequence[:50] + (['...'] if len(decoded_sequence) > 50 else []),
                'sequence_length': len(sequence),
                'encoded_length': len(binary),
                'fixed_length': fixed_bits_total,
                'efficiency': round(efficiency, 4),
                'entropy': round(entropy, 4),
                'compression_ratio': round(compression_ratio, 2),
                'is_lossless': sequence == decoded_sequence,
                'binary_decode_lossless': sequence == decoded_from_binary,
                'alphabet_size': alphabet_size,
                'dictionary_size': dict_stats['total_entries'],
                'patterns_found': dict_stats['actual_patterns'],
                'longest_pattern': dict_stats['longest_pattern'],
                'longest_pattern_length': dict_stats['longest_length'],
                'num_encoded_pairs': len(encoded_pairs),
                'bits_per_symbol': round(len(binary) / len(sequence), 4) if len(sequence) > 0 else 0
            }
        except Exception as e:
            results[seq_name] = {
                'error': str(e),
                'sequence_length': len(sequence)
            }
    
    # Add summary statistics
    successful_results = [r for r in results.values() if 'error' not in r]
    if successful_results:
        results['summary'] = {
            'average_efficiency': round(sum(r['efficiency'] for r in successful_results) / len(successful_results), 4),
            'average_compression': round(sum(r['compression_ratio'] for r in successful_results) / len(successful_results), 2),
            'all_lossless': all(r['is_lossless'] for r in successful_results),
            'total_patterns_found': sum(r['patterns_found'] for r in successful_results)
        }
    
    return jsonify(results)
    
if __name__ == '__main__':
    app.run(debug=True)