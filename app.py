from flask import Flask, render_template, request, jsonify, redirect, url_for
import os
import math
import random
from collections import defaultdict

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
if __name__ == '__main__':
    app.run(debug=True)
