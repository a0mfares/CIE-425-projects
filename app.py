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
        valid_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ,.0123456789')
        characters = [char for char in text if char in valid_chars]
        
        if not characters:
            return jsonify({'error': 'No valid characters found in the file'}), 400
        
        # Count character frequencies
        char_counts = defaultdict(int)
        for char in characters:
            char_counts[char] += 1
        
        # Calculate PMF
        total_chars = len(characters)
        pmf = {char: count/total_chars for char, count in char_counts.items()}
        
        # Calculate entropy
        entropy = 0
        for char, prob in pmf.items():
            if prob > 0:
                entropy -= prob * math.log2(prob)
        
        # Calculate relative entropy (KL divergence from uniform distribution)
        uniform_prob = 1 / len(pmf)
        relative_entropy = 0
        for char, prob in pmf.items():
            if prob > 0:
                relative_entropy += prob * math.log2(prob / uniform_prob)
        
        # Simulate binary symmetric channel
        channel_error_probability = 0.05
        bits_per_char = 6
        
        # Create a mapping of characters to 6-bit codes
        valid_chars_list = sorted(valid_chars)
        char_to_bits = {char: format(i, '06b') for i, char in enumerate(valid_chars_list)}
        bits_to_char = {bits: char for char, bits in char_to_bits.items()}
        
        # Convert text to bits
        bit_sequence = ''.join([char_to_bits[char] for char in characters if char in char_to_bits])
        
        # Simulate channel errors
        received_bit_sequence = ''.join([
            '1' if bit == '0' and random.random() < channel_error_probability else
            '0' if bit == '1' and random.random() < channel_error_probability else
            bit
            for bit in bit_sequence
        ])
        
        # Decode bits back to characters
        decoded_text = ''.join([
            bits_to_char[received_bit_sequence[i:i+bits_per_char]]
            for i in range(0, len(received_bit_sequence), bits_per_char)
            if i+bits_per_char <= len(received_bit_sequence) and 
               received_bit_sequence[i:i+bits_per_char] in bits_to_char
        ])
        
        # Calculate conditional entropy H(Y|X) for binary symmetric channel
        conditional_entropy = -channel_error_probability * math.log2(channel_error_probability) - \
                            (1 - channel_error_probability) * math.log2(1 - channel_error_probability)
        
        # Calculate joint entropy H(X,Y) = H(X) + H(Y|X)
        joint_entropy = entropy + conditional_entropy
        
        # Prepare response data
        response_data = {
            'pmf': pmf,
            'entropy': entropy,
            'relative_entropy': relative_entropy,
            'joint_entropy': joint_entropy,
            'conditional_entropy': conditional_entropy,
            'original_length': len(characters),
            'decoded_length': len(decoded_text),
            'decoded_text': decoded_text[:100] + ('...' if len(decoded_text) > 100 else ''),
            'verification': abs(joint_entropy - (entropy + conditional_entropy)) < 0.0001
        }
        
        return jsonify(response_data)

if __name__ == '__main__':
    app.run(debug=True)